import hashlib
import os
import re
import secrets

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

import bcrypt
import pymysql

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from portal_routes import create_portal_router


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")

if len(SECRET_KEY) < 32:
    raise RuntimeError(
        "SECRET_KEY must contain at least 32 characters"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer(auto_error=False)

app = FastAPI(title="Local Tourism API")

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"

(UPLOAD_DIR / "attractions").mkdir(
    parents=True,
    exist_ok=True,
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# DATABASE

def get_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "local_tourism_db"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


@contextmanager
def database():
    conn = get_db()

    try:
        yield conn
        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


# REQUEST MODELS

class ReviewCreate(BaseModel):
    attraction_id: int = Field(..., ge=1)
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=1, max_length=2000)


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=72)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1)


class ItineraryAttractionItem(BaseModel):
    attraction_id: int = Field(..., ge=1)
    day_index: int = Field(..., ge=1)
    order_index: int = Field(..., ge=1)
    notes: Optional[str] = Field(default=None, max_length=2000)


class ItineraryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    days: int = Field(..., ge=1, le=30)
    summary: str = Field(..., min_length=1, max_length=2000)
    region_scope: str = Field(..., min_length=1, max_length=100)

    estimated_cost: float = Field(
        ...,
        ge=0,
        le=99999999.99,
        allow_inf_nan=False,
    )

    attractions: List[ItineraryAttractionItem] = Field(
        ...,
        min_length=1,
        max_length=300,
    )


class BusinessClaimCreate(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=2000)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(
        ...,
        min_length=1,
        max_length=512,
    )


class UserStatusUpdate(BaseModel):
    status: Literal["verified", "pending", "disabled"]


class ReviewModeration(BaseModel):
    status: Literal["approved", "rejected", "pending"]


# AUTHENTICATION HELPERS

def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def password_bytes(password):
    encoded = password.encode("utf-8")

    if len(encoded) > 72:
        raise HTTPException(
            status_code=422,
            detail="Password must not exceed 72 UTF-8 bytes",
        )

    return encoded


def issue_tokens(cursor, user):
    access_payload = {
        "sub": str(user["id"]),
        "role": user["role"],
        "type": "access",
        "exp": (
            datetime.now(timezone.utc)
            + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        ),
    }

    access_token = jwt.encode(
        access_payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    refresh_token = secrets.token_urlsafe(32)

    refresh_expires_at = (
        datetime.now(timezone.utc)
        + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ).replace(tzinfo=None)

    cursor.execute("""
        INSERT INTO refresh_tokens (
            user_id, token_hash, expires_at, created_at
        )
        VALUES (%s, %s, %s, NOW())
    """, (
        user["id"],
        hash_token(refresh_token),
        refresh_expires_at,
    ))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": user["id"],
        "name": user["name"],
        "role": user["role"],
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    unauthorized = HTTPException(
        status_code=401,
        detail="Invalid or expired login",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "access":
            raise unauthorized

        user_id = int(payload["sub"])

    except (JWTError, ValueError, TypeError, KeyError):
        raise unauthorized

    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, role, status
                FROM users
                WHERE id = %s AND deleted_at IS NULL
            """, (user_id,))

            user = cursor.fetchone()

    if not user:
        raise unauthorized

    if user["status"] != "verified":
        raise HTTPException(
            status_code=403,
            detail="Account is pending or disabled",
        )

    return user


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return user


# AUTHENTICATION ENDPOINTS

@app.post("/register", status_code=201)
def create_user(register: UserCreate):
    name = register.name.strip()
    email = register.email.strip().lower()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Name is required",
        )

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(
            status_code=422,
            detail="Enter a valid email",
        )

    password_hash = bcrypt.hashpw(
        password_bytes(register.password),
        bcrypt.gensalt(),
    ).decode()

    try:
        with database() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO users (
                        name, email, password_hash,
                        role, status, created_at
                    )
                    VALUES (%s, %s, %s, 'user', 'pending', NOW())
                """, (name, email, password_hash))

                user_id = cursor.lastrowid

    except pymysql.err.IntegrityError as error:
        if error.args[0] == 1062:
            raise HTTPException(
                status_code=409,
                detail="Email already registered",
            ) from error

        raise

    return {
        "message": "Registration successful. Wait for admin activation.",
        "user_id": user_id,
    }


@app.post("/login")
def user_login(login: UserLogin):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, password_hash, role, status
                FROM users
                WHERE email = %s AND deleted_at IS NULL
            """, (login.email.strip().lower(),))

            user = cursor.fetchone()
            valid_password = False

            if user:
                try:
                    valid_password = bcrypt.checkpw(
                        password_bytes(login.password),
                        user["password_hash"].encode(),
                    )

                except (ValueError, TypeError):
                    valid_password = False

            if not valid_password:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password",
                )

            if user["status"] != "verified":
                raise HTTPException(
                    status_code=403,
                    detail="Account is pending or disabled",
                )

            return issue_tokens(cursor, user)


@app.post("/refresh")
def refresh_login(body: RefreshRequest):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, user_id
                FROM refresh_tokens
                WHERE token_hash = %s
                  AND revoked = 0
                  AND expires_at > UTC_TIMESTAMP()
                FOR UPDATE
            """, (hash_token(body.refresh_token),))

            token = cursor.fetchone()

            if not token:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or expired refresh token",
                )

            cursor.execute("""
                SELECT id, name, role, status
                FROM users
                WHERE id = %s AND deleted_at IS NULL
                FOR UPDATE
            """, (token["user_id"],))

            user = cursor.fetchone()

            if not user or user["status"] != "verified":
                raise HTTPException(
                    status_code=403,
                    detail="Account unavailable",
                )

            cursor.execute("""
                UPDATE refresh_tokens
                SET revoked = 1
                WHERE id = %s
            """, (token["id"],))

            return issue_tokens(cursor, user)


@app.post("/logout")
def logout(body: RefreshRequest):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE refresh_tokens
                SET revoked = 1
                WHERE token_hash = %s
            """, (hash_token(body.refresh_token),))

    return {
        "message": "Logged out. Remove both tokens from the client."
    }


@app.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user


# USERS

@app.get("/users")
def list_users(admin: dict = Depends(require_admin)):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, role, status,
                       phone, address, preferred_language, bio
                FROM users
                WHERE deleted_at IS NULL
            """)

            return cursor.fetchall()


@app.patch("/admin/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: UserStatusUpdate,
    admin: dict = Depends(require_admin),
):
    if user_id == admin["id"] and body.status != "verified":
        raise HTTPException(
            status_code=409,
            detail="Cannot disable your own account",
        )

    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id
                FROM users
                WHERE id = %s AND deleted_at IS NULL
                FOR UPDATE
            """, (user_id,))

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="User not found",
                )

            cursor.execute("""
                UPDATE users
                SET status = %s, updated_at = NOW()
                WHERE id = %s
            """, (body.status, user_id))

            cursor.execute("""
                UPDATE refresh_tokens
                SET revoked = 1
                WHERE user_id = %s
            """, (user_id,))

    return {
        "message": "Account status updated",
        "status": body.status,
    }


# ATTRACTIONS

@app.get("/attractions")
def list_attractions(
    q: str = "",
    region: str = "",
    category_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 12,
):
    q = q.strip()
    region = region.strip()

    if page < 1 or not 1 <= page_size <= 24:
        raise HTTPException(
            status_code=422,
            detail="Invalid page or page size",
        )

    if len(q) > 200:
        raise HTTPException(
            status_code=422,
            detail="Search must not exceed 200 characters",
        )

    if category_id is not None and category_id < 1:
        raise HTTPException(
            status_code=422,
            detail="Invalid category",
        )

    conditions = [
        "a.deleted_at IS NULL",
        "a.status IN ('published', 'featured')",
    ]

    params = []

    if q:
        conditions.append("""
            (
                a.name LIKE %s
                OR a.province LIKE %s
                OR a.city_municipality LIKE %s
            )
        """)

        keyword = f"%{q}%"
        params.extend([keyword, keyword, keyword])

    if region:
        conditions.append("a.region_code = %s")
        params.append(region)

    if category_id is not None:
        conditions.append("a.category_id = %s")
        params.append(category_id)

    where_clause = " AND ".join(conditions)
    offset = (page - 1) * page_size

    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*) AS total
                FROM attractions a
                WHERE {where_clause}
            """, tuple(params))

            total = cursor.fetchone()["total"]

            cursor.execute(f"""
                SELECT
                    a.id,
                    a.name,
                    a.description,
                    a.province,
                    a.city_municipality,
                    a.region_code,
                    a.avg_rating,
                    a.price_range,
                    c.name AS category,
                    (
                        SELECT m.url
                        FROM attraction_media m
                        WHERE m.attraction_id = a.id
                            AND m.deleted_at IS NULL
                            AND m.type = 'image'
                        ORDER BY m.is_primary DESC, m.id ASC
                        LIMIT 1
                    ) AS primary_image
                FROM attractions a
                LEFT JOIN categories c ON c.id = a.category_id
                WHERE {where_clause}
                ORDER BY a.avg_rating DESC, a.id ASC
                LIMIT %s OFFSET %s
            """, tuple(params + [page_size, offset]))

            items = cursor.fetchall()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@app.get("/attractions/{attraction_id}")
def get_attraction(attraction_id: int):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.*, c.name AS category_name
                FROM attractions a
                LEFT JOIN categories c ON c.id = a.category_id
                WHERE a.id = %s
                    AND a.deleted_at IS NULL
                    AND a.status IN ('published', 'featured')
            """, (attraction_id,))

            attraction = cursor.fetchone()

            if not attraction:
                raise HTTPException(
                    status_code=404,
                    detail="Attraction not found",
                )

            cursor.execute("""
                SELECT id, url, caption, is_primary
                FROM attraction_media
                WHERE attraction_id = %s
                  AND deleted_at IS NULL
                  AND type = 'image'
                ORDER BY is_primary DESC, id ASC
            """, (attraction_id,))

            attraction["images"] = cursor.fetchall()

    return attraction


# CATEGORIES AND REGIONS

@app.get("/categories")
def get_categories():
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, parent_id, name, description
                FROM categories
                WHERE deleted_at IS NULL
            """)

            return cursor.fetchall()


@app.get("/regions")
def list_regions():
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT region_code AS code
                FROM attractions
                WHERE deleted_at IS NULL
                  AND status IN ('published', 'featured')
                  AND region_code IS NOT NULL
                  AND TRIM(region_code) <> ''
                ORDER BY region_code
            """)

            return cursor.fetchall()


# REVIEWS

@app.get("/attractions/{attraction_id}/reviews")
def get_attractions_reviews(attraction_id: int):
    get_attraction(attraction_id)

    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, rating, text
                FROM reviews
                WHERE attraction_id = %s
                  AND status = 'approved'
                  AND deleted_at IS NULL
                ORDER BY created_at DESC
            """, (attraction_id,))

            return cursor.fetchall()


@app.post("/reviews", status_code=201)
def create_review(
    review: ReviewCreate,
    user: dict = Depends(get_current_user),
):
    if not review.text.strip():
        raise HTTPException(
            status_code=422,
            detail="Review cannot be blank",
        )

    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id
                FROM attractions
                WHERE id = %s
                  AND deleted_at IS NULL
                  AND status IN ('published', 'featured')
                FOR UPDATE
            """, (review.attraction_id,))

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Attraction not found",
                )

            cursor.execute("""
                SELECT id
                FROM reviews
                WHERE user_id = %s AND attraction_id = %s
            """, (user["id"], review.attraction_id))

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="You already reviewed this attraction",
                )

            cursor.execute("""
                INSERT INTO reviews (
                    user_id, attraction_id, rating,
                    text, status, created_at
                )
                VALUES (%s, %s, %s, %s, 'pending', NOW())
            """, (
                user["id"],
                review.attraction_id,
                review.rating,
                review.text.strip(),
            ))

            review_id = cursor.lastrowid

    return {
        "message": "Review submitted for approval",
        "review_id": review_id,
    }


@app.patch("/admin/reviews/{review_id}/status")
def moderate_review(
    review_id: int,
    body: ReviewModeration,
    admin: dict = Depends(require_admin),
):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT attraction_id
                FROM reviews
                WHERE id = %s AND deleted_at IS NULL
            """, (review_id,))

            review = cursor.fetchone()

            if not review:
                raise HTTPException(
                    status_code=404,
                    detail="Review not found",
                )

            attraction_id = review["attraction_id"]

            cursor.execute("""
                SELECT id
                FROM attractions
                WHERE id = %s
                FOR UPDATE
            """, (attraction_id,))

            cursor.execute("""
                UPDATE reviews
                SET status = %s, updated_at = NOW()
                WHERE id = %s
            """, (body.status, review_id))

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

    return {
        "message": "Review status and rating updated",
        "status": body.status,
    }


# ITINERARIES

@app.get("/itineraries")
def get_itineraries(user: dict = Depends(get_current_user)):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, user_id, title, days,
                       summary, region_scope, estimated_cost
                FROM itineraries
                WHERE user_id = %s AND deleted_at IS NULL
                ORDER BY id DESC
            """, (user["id"],))

            return cursor.fetchall()


@app.get("/itineraries/{itinerary_id}")
def get_itinerary(
    itinerary_id: int,
    user: dict = Depends(get_current_user),
):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, title, days, summary,
                       region_scope, estimated_cost
                FROM itineraries
                WHERE id = %s
                  AND user_id = %s
                  AND deleted_at IS NULL
            """, (itinerary_id, user["id"]))

            itinerary = cursor.fetchone()

            if not itinerary:
                raise HTTPException(
                    status_code=404,
                    detail="Itinerary not found",
                )

            cursor.execute("""
                SELECT
                    ia.id,
                    ia.attraction_id,
                    ia.day_index,
                    ia.order_index,
                    ia.notes,
                    a.name
                FROM itinerary_attractions ia
                JOIN attractions a ON a.id = ia.attraction_id
                WHERE ia.itinerary_id = %s
                ORDER BY ia.day_index, ia.order_index, ia.id
            """, (itinerary_id,))

            itinerary["attractions"] = cursor.fetchall()

    return itinerary


@app.post("/itineraries", status_code=201)
def create_itinerary(
    itinerary: ItineraryCreate,
    user: dict = Depends(get_current_user),
):
    if (
        not itinerary.title.strip()
        or not itinerary.summary.strip()
        or not itinerary.region_scope.strip()
    ):
        raise HTTPException(
            status_code=422,
            detail="Itinerary fields cannot be blank",
        )

    with database() as conn:
        with conn.cursor() as cursor:
            positions = set()

            for item in itinerary.attractions:
                if item.day_index > itinerary.days:
                    raise HTTPException(
                        status_code=422,
                        detail="Day index exceeds itinerary days",
                    )

                position = (item.day_index, item.order_index)

                if position in positions:
                    raise HTTPException(
                        status_code=422,
                        detail="Duplicate stop position",
                    )

                positions.add(position)

                cursor.execute("""
                    SELECT id
                    FROM attractions
                    WHERE id = %s
                      AND deleted_at IS NULL
                      AND status IN ('published', 'featured')
                """, (item.attraction_id,))

                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=404,
                        detail="Attraction not found",
                    )

            cursor.execute("""
                INSERT INTO itineraries (
                    user_id, title, days, summary,
                    region_scope, estimated_cost, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (
                user["id"],
                itinerary.title.strip(),
                itinerary.days,
                itinerary.summary.strip(),
                itinerary.region_scope.strip(),
                itinerary.estimated_cost,
            ))

            itinerary_id = cursor.lastrowid

            for item in itinerary.attractions:
                cursor.execute("""
                    INSERT INTO itinerary_attractions (
                        itinerary_id, attraction_id,
                        day_index, order_index, notes, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """, (
                    itinerary_id,
                    item.attraction_id,
                    item.day_index,
                    item.order_index,
                    item.notes,
                ))

    return {
        "message": "Itinerary created",
        "itinerary_id": itinerary_id,
        "attractions_count": len(itinerary.attractions),
    }


# BUSINESS CLAIMS

@app.post("/attractions/{attraction_id}/claim", status_code=201)
def claim_attraction(
    attraction_id: int,
    claim: BusinessClaimCreate,
    user: dict = Depends(get_current_user),
):
    with database() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id
                FROM attractions
                WHERE id = %s
                  AND deleted_at IS NULL
                  AND status IN ('published', 'featured')
                FOR UPDATE
            """, (attraction_id,))

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Attraction not found",
                )

            cursor.execute("""
                SELECT id
                FROM business_claims
                WHERE attraction_id = %s AND status = 'pending'
            """, (attraction_id,))

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="Attraction already has a pending claim",
                )

            cursor.execute("""
                INSERT INTO business_claims (
                    user_id, attraction_id, status,
                    submitted_at, notes
                )
                VALUES (%s, %s, 'pending', NOW(), %s)
            """, (
                user["id"],
                attraction_id,
                claim.notes,
            ))

    return {
        "message": "Claim submitted",
        "attraction_id": attraction_id,
        "status": "pending",
    }

app.include_router(
    create_portal_router(
        database,
        get_current_user,
        require_admin,
    )
)