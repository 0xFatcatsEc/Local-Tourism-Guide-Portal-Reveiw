from contextlib import contextmanager
from typing import Literal
from urllib.parse import urlparse

import pymysql

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ValidationError


class CategoryData(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=2000)


class AttractionData(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=10000)
    category_id: int = Field(ge=1)
    province: str = Field(default="", max_length=100)
    city_municipality: str = Field(default="", max_length=100)
    region_code: str = Field(default="", max_length=10)
    address: str = Field(default="", max_length=512)
    operating_hours: str = Field(default="", max_length=255)
    price_range: str = Field(default="", max_length=50)
    phone: str = Field(default="", max_length=50)
    official_website: str = Field(default="", max_length=512)

    status: Literal[
        "pending", "published", "featured", "rejected"
    ] = "pending"

    image_url: str = Field(default="", max_length=255)


class UserData(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    role: Literal["user", "admin"]

    status: Literal[
        "pending", "unverified", "verified", "disabled"
    ]


class ReviewData(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class ClaimData(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class NewClaim(BaseModel):
    attraction_id: int = Field(ge=1)
    notes: str = Field(min_length=10, max_length=2000)


MODELS = {
    "categories": CategoryData,
    "attractions": AttractionData,
    "users": UserData,
    "reviews": ReviewData,
    "claims": ClaimData,
}

TABLES = {
    "categories": "categories",
    "attractions": "attractions",
    "users": "users",
    "reviews": "reviews",
    "claims": "business_claims",
}

LIST_QUERIES = {
    "categories": """
        SELECT id, name, description
        FROM categories
        WHERE deleted_at IS NULL
        ORDER BY id DESC
    """,

    "attractions": """
        SELECT a.*, c.name AS category,
            (
                SELECT m.url
                FROM attraction_media m
                WHERE m.attraction_id = a.id
                  AND m.deleted_at IS NULL
                  AND m.type = 'image'
                ORDER BY m.is_primary DESC, m.id
                LIMIT 1
            ) AS image_url
        FROM attractions a
        LEFT JOIN categories c ON c.id = a.category_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.id DESC
    """,

    "users": """
        SELECT id, name, email, role, status
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY id DESC
    """,

    "reviews": """
        SELECT
            r.id, r.rating, r.text, r.status,
            u.name AS user_name,
            a.name AS attraction_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN attractions a ON a.id = r.attraction_id
        WHERE r.deleted_at IS NULL
        ORDER BY r.id DESC
    """,

    "claims": """
        SELECT
            b.id, b.status, b.notes, b.submitted_at,
            u.name AS user_name,
            a.name AS attraction_name
        FROM business_claims b
        JOIN users u ON u.id = b.user_id
        JOIN attractions a ON a.id = b.attraction_id
        ORDER BY b.id DESC
    """,

    "logs": """
        SELECT
            l.id, l.action, l.target_type,
            l.target_id, l.details, l.created_at,
            u.name AS user_name
        FROM audit_log l
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.id DESC
        LIMIT 200
    """,
}


def create_portal_router(
    database,
    get_current_user,
    require_admin,
):
    router = APIRouter(
        prefix="/portal",
        tags=["Portal"],
    )

    @contextmanager
    def transaction():
        try:
            with database() as conn:
                yield conn

        except pymysql.err.IntegrityError as exc:
            raise HTTPException(
                409,
                "This change conflicts with existing records",
            ) from exc

    def audit(cursor, actor, action, resource, record_id):
        cursor.execute("""
            INSERT INTO audit_log (
                user_id, action, target_type,
                target_id, details, created_at
            )
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (
            actor["id"],
            action,
            resource,
            record_id,
            f"{action.title()} {resource} #{record_id}",
        ))

    def parse(resource, body):
        if resource not in MODELS:
            raise HTTPException(404, "Resource not found")

        try:
            data = MODELS[resource].model_validate(body).model_dump()

        except ValidationError as exc:
            raise HTTPException(
                422,
                "; ".join(
                    error["msg"] for error in exc.errors()
                ),
            ) from exc

        for key, value in data.items():
            if isinstance(value, str):
                data[key] = value.strip()

        if "name" in data and not data["name"]:
            raise HTTPException(422, "Name cannot be blank")

        if resource == "attractions":
            for field in ("image_url", "official_website"):
                value = data[field]

                if not value:
                    continue

                if (
                    field == "image_url"
                    and value.startswith("/uploads/")
                ):
                    continue

                parsed = urlparse(value)

                if (
                    parsed.scheme not in ("http", "https")
                    or not parsed.netloc
                ):
                    raise HTTPException(
                        422,
                        f"Enter a valid {field.replace('_', ' ')}",
                    )

        return data

    def validate_category(cursor, category_id):
        cursor.execute("""
            SELECT id
            FROM categories
            WHERE id = %s AND deleted_at IS NULL
            FOR UPDATE
        """, (category_id,))

        if not cursor.fetchone():
            raise HTTPException(
                422,
                "Select an existing category",
            )

    def save_photo(cursor, attraction_id, url, actor_id):
        if not url:
            return

        cursor.execute("""
            SELECT id
            FROM attraction_media
            WHERE attraction_id = %s
              AND type = 'image'
              AND deleted_at IS NULL
            ORDER BY is_primary DESC, id
            LIMIT 1
            FOR UPDATE
        """, (attraction_id,))

        image = cursor.fetchone()

        cursor.execute("""
            UPDATE attraction_media
            SET is_primary = 0
            WHERE attraction_id = %s
              AND type = 'image'
              AND deleted_at IS NULL
        """, (attraction_id,))

        if image:
            cursor.execute("""
                UPDATE attraction_media
                SET url = %s, is_primary = 1
                WHERE id = %s
            """, (url, image["id"]))

        else:
            cursor.execute("""
                INSERT INTO attraction_media (
                    attraction_id, url, type,
                    is_primary, uploaded_by, created_at
                )
                VALUES (%s, %s, 'image', 1, %s, NOW())
            """, (attraction_id, url, actor_id))

    def recalculate(cursor, attraction_id):
        cursor.execute("""
            UPDATE attractions
            SET avg_rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM reviews
                WHERE attraction_id = %s
                  AND status = 'approved'
                  AND deleted_at IS NULL
            )
            WHERE id = %s
        """, (attraction_id, attraction_id))

    # PUBLIC CATEGORIES

    @router.get("/categories")
    def categories():
        with database() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        c.id, c.name, c.description,
                        (
                            SELECT COUNT(*)
                            FROM attractions a
                            WHERE a.category_id = c.id
                              AND a.deleted_at IS NULL
                              AND a.status IN (
                                  'published', 'featured'
                              )
                        ) AS total
                    FROM categories c
                    WHERE c.deleted_at IS NULL
                    ORDER BY c.name
                """)

                return cursor.fetchall()

    # PERSONAL DASHBOARD

    @router.get("/dashboard")
    def dashboard(
        user: dict = Depends(get_current_user),
    ):
        with database() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*) AS total
                    FROM itineraries
                    WHERE user_id = %s
                      AND deleted_at IS NULL
                """, (user["id"],))

                trips = cursor.fetchone()["total"]

                cursor.execute("""
                    SELECT
                        r.id, r.rating, r.text, r.status,
                        a.name AS attraction_name
                    FROM reviews r
                    JOIN attractions a
                        ON a.id = r.attraction_id
                    WHERE r.user_id = %s
                      AND r.deleted_at IS NULL
                    ORDER BY r.id DESC
                """, (user["id"],))

                reviews = cursor.fetchall()

                cursor.execute("""
                    SELECT
                        b.id, b.status, b.notes,
                        a.name AS attraction_name
                    FROM business_claims b
                    JOIN attractions a
                        ON a.id = b.attraction_id
                    WHERE b.user_id = %s
                    ORDER BY b.id DESC
                """, (user["id"],))

                return {
                    "trips": trips,
                    "reviews": reviews,
                    "claims": cursor.fetchall(),
                }

    # CLAIM SUBMISSION

    @router.post("/claims", status_code=201)
    def submit_claim(
        body: NewClaim,
        user: dict = Depends(get_current_user),
    ):
        if len(body.notes.strip()) < 10:
            raise HTTPException(
                422,
                "Provide at least 10 characters explaining your claim",
            )

        with transaction() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id
                    FROM attractions
                    WHERE id = %s
                      AND deleted_at IS NULL
                      AND status IN ('published', 'featured')
                    FOR UPDATE
                """, (body.attraction_id,))

                if not cursor.fetchone():
                    raise HTTPException(
                        404,
                        "Attraction not found",
                    )

                cursor.execute("""
                    SELECT id
                    FROM business_claims
                    WHERE attraction_id = %s
                      AND status IN ('pending', 'approved')
                """, (body.attraction_id,))

                if cursor.fetchone():
                    raise HTTPException(
                        409,
                        "This destination already has a pending or approved claim",
                    )

                cursor.execute("""
                    INSERT INTO business_claims (
                        user_id, attraction_id,
                        status, submitted_at, notes
                    )
                    VALUES (%s, %s, 'pending', NOW(), %s)
                """, (
                    user["id"],
                    body.attraction_id,
                    body.notes.strip(),
                ))

                return {
                    "message": "Claim submitted for admin review",
                    "id": cursor.lastrowid,
                }

    # ADMIN OVERVIEW

    @router.get("/admin-overview")
    def overview(
        admin: dict = Depends(require_admin),
    ):
        queries = {
            "attractions": """
                SELECT COUNT(*) AS total
                FROM attractions
                WHERE deleted_at IS NULL
            """,
            "categories": """
                SELECT COUNT(*) AS total
                FROM categories
                WHERE deleted_at IS NULL
            """,
            "users": """
                SELECT COUNT(*) AS total
                FROM users
                WHERE deleted_at IS NULL
            """,
            "pending_reviews": """
                SELECT COUNT(*) AS total
                FROM reviews
                WHERE status = 'pending'
                  AND deleted_at IS NULL
            """,
            "pending_claims": """
                SELECT COUNT(*) AS total
                FROM business_claims
                WHERE status = 'pending'
            """,
        }

        result = {}

        with database() as conn:
            with conn.cursor() as cursor:
                for key, query in queries.items():
                    cursor.execute(query)
                    result[key] = cursor.fetchone()["total"]

        return result

    # ADMIN LISTS

    @router.get("/admin/{resource}")
    def admin_list(
        resource: str,
        admin: dict = Depends(require_admin),
    ):
        if resource not in LIST_QUERIES:
            raise HTTPException(404, "Resource not found")

        with database() as conn:
            with conn.cursor() as cursor:
                cursor.execute(LIST_QUERIES[resource])
                return cursor.fetchall()

    # ADMIN CREATE

    @router.post("/admin/{resource}", status_code=201)
    def admin_create(
        resource: str,
        body: dict,
        admin: dict = Depends(require_admin),
    ):
        if resource not in ("attractions", "categories"):
            raise HTTPException(
                405,
                "Creation is not supported here",
            )

        data = parse(resource, body)
        image = data.pop("image_url", "")

        with transaction() as conn:
            with conn.cursor() as cursor:
                if resource == "attractions":
                    validate_category(
                        cursor,
                        data["category_id"],
                    )
                    data["created_by"] = admin["id"]

                columns = list(data)
                placeholders = ",".join(
                    ["%s"] * len(columns)
                )

                cursor.execute(
                    f"""
                    INSERT INTO {TABLES[resource]} (
                        {','.join(columns)}, created_at
                    )
                    VALUES ({placeholders}, NOW())
                    """,
                    tuple(data.values()),
                )

                record_id = cursor.lastrowid

                if resource == "attractions":
                    save_photo(
                        cursor,
                        record_id,
                        image,
                        admin["id"],
                    )

                audit(
                    cursor,
                    admin,
                    "create",
                    resource,
                    record_id,
                )

        return {
            "message": "Record created",
            "id": record_id,
        }

    # ADMIN UPDATE

    @router.patch("/admin/{resource}/{record_id}")
    def admin_update(
        resource: str,
        record_id: int,
        body: dict,
        admin: dict = Depends(require_admin),
    ):
        data = parse(resource, body)
        table = TABLES[resource]
        image = data.pop("image_url", "")

        with transaction() as conn:
            with conn.cursor() as cursor:
                if resource == "reviews":
                    cursor.execute("""
                        SELECT attraction_id
                        FROM reviews
                        WHERE id = %s
                          AND deleted_at IS NULL
                    """, (record_id,))

                    review = cursor.fetchone()

                    if not review:
                        raise HTTPException(
                            404,
                            "Review not found",
                        )

                    cursor.execute("""
                        SELECT id FROM attractions
                        WHERE id = %s FOR UPDATE
                    """, (review["attraction_id"],))

                if resource == "claims":
                    cursor.execute("""
                        SELECT attraction_id
                        FROM business_claims
                        WHERE id = %s
                    """, (record_id,))

                    claim = cursor.fetchone()

                    if not claim:
                        raise HTTPException(
                            404,
                            "Claim not found",
                        )

                    cursor.execute("""
                        SELECT id FROM attractions
                        WHERE id = %s FOR UPDATE
                    """, (claim["attraction_id"],))

                    if data["status"] == "approved":
                        cursor.execute("""
                            SELECT id
                            FROM business_claims
                            WHERE attraction_id = %s
                              AND status = 'approved'
                              AND id <> %s
                        """, (
                            claim["attraction_id"],
                            record_id,
                        ))

                        if cursor.fetchone():
                            raise HTTPException(
                                409,
                                "Another claim is already approved",
                            )

                condition = (
                    ""
                    if resource == "claims"
                    else " AND deleted_at IS NULL"
                )

                cursor.execute(
                    f"""
                    SELECT id FROM {table}
                    WHERE id = %s{condition}
                    FOR UPDATE
                    """,
                    (record_id,),
                )

                if not cursor.fetchone():
                    raise HTTPException(
                        404,
                        "Record not found",
                    )

                if (
                    resource == "users"
                    and record_id == admin["id"]
                ):
                    if (
                        data["role"] != "admin"
                        or data["status"] != "verified"
                    ):
                        raise HTTPException(
                            409,
                            "Cannot disable or demote your own account",
                        )

                if resource == "attractions":
                    validate_category(
                        cursor,
                        data["category_id"],
                    )

                assignments = ",".join(
                    f"{column}=%s" for column in data
                )

                if resource == "claims":
                    cursor.execute(
                        f"""
                        UPDATE {table}
                        SET {assignments},
                            reviewed_by = %s,
                            reviewed_at = NOW()
                        WHERE id = %s
                        """,
                        (
                            *data.values(),
                            admin["id"],
                            record_id,
                        ),
                    )

                else:
                    cursor.execute(
                        f"""
                        UPDATE {table}
                        SET {assignments},
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (*data.values(), record_id),
                    )

                if resource == "users":
                    cursor.execute("""
                        UPDATE refresh_tokens
                        SET revoked = 1
                        WHERE user_id = %s
                    """, (record_id,))

                if resource == "attractions":
                    save_photo(
                        cursor,
                        record_id,
                        image,
                        admin["id"],
                    )

                if resource == "reviews":
                    recalculate(
                        cursor,
                        review["attraction_id"],
                    )

                audit(
                    cursor,
                    admin,
                    "update",
                    resource,
                    record_id,
                )

        return {"message": "Record updated"}

    # ADMIN SOFT DELETE

    @router.delete("/admin/{resource}/{record_id}")
    def admin_delete(
        resource: str,
        record_id: int,
        admin: dict = Depends(require_admin),
    ):
        if resource not in (
            "attractions", "categories", "users", "reviews"
        ):
            raise HTTPException(
                405,
                "Deletion is not supported here",
            )

        if (
            resource == "users"
            and record_id == admin["id"]
        ):
            raise HTTPException(
                409,
                "Cannot delete your own account",
            )

        table = TABLES[resource]

        with transaction() as conn:
            with conn.cursor() as cursor:
                if resource == "reviews":
                    cursor.execute("""
                        SELECT attraction_id
                        FROM reviews
                        WHERE id = %s
                          AND deleted_at IS NULL
                    """, (record_id,))

                    review = cursor.fetchone()

                    if not review:
                        raise HTTPException(
                            404,
                            "Review not found",
                        )

                    cursor.execute("""
                        SELECT id FROM attractions
                        WHERE id = %s FOR UPDATE
                    """, (review["attraction_id"],))

                cursor.execute(
                    f"""
                    SELECT id FROM {table}
                    WHERE id = %s AND deleted_at IS NULL
                    FOR UPDATE
                    """,
                    (record_id,),
                )

                if not cursor.fetchone():
                    raise HTTPException(
                        404,
                        "Record not found",
                    )

                if resource == "categories":
                    cursor.execute("""
                        SELECT id
                        FROM attractions
                        WHERE category_id = %s
                          AND deleted_at IS NULL
                        LIMIT 1
                    """, (record_id,))

                    if cursor.fetchone():
                        raise HTTPException(
                            409,
                            "Move or remove this category's attractions first",
                        )

                    cursor.execute("""
                        SELECT id
                        FROM categories
                        WHERE parent_id = %s
                          AND deleted_at IS NULL
                        LIMIT 1
                    """, (record_id,))

                    if cursor.fetchone():
                        raise HTTPException(
                            409,
                            "Remove child categories first",
                        )

                cursor.execute(
                    f"""
                    UPDATE {table}
                    SET deleted_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (record_id,),
                )

                if resource == "users":
                    cursor.execute("""
                        UPDATE refresh_tokens
                        SET revoked = 1
                        WHERE user_id = %s
                    """, (record_id,))

                if resource == "reviews":
                    recalculate(
                        cursor,
                        review["attraction_id"],
                    )

                audit(
                    cursor,
                    admin,
                    "delete",
                    resource,
                    record_id,
                )

        return {"message": "Record removed"}

    return router