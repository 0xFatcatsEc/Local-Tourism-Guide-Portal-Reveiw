import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import pymysql
from passlib.hash import bcrypt
import secrets
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import os
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")


security = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


app = FastAPI(title="Local Tourism API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    return pymysql.connect(
        host='localhost',
        user='root',
        password='',
        database='local_tourism_db',
        cursorclass=pymysql.cursors.DictCursor
    )

class ReviewCreate(BaseModel):
    # user_id: int
    attraction_id: int
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
    attraction_id: int
    day_index: int = Field(..., ge=1)
    order_index: int = Field(..., ge=1)
    notes: Optional[str] = None

class ItineraryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    days: int = Field(..., ge=1, le=30)
    summary: str = Field(..., min_length=1, max_length=2000)
    region_scope: str = Field(..., min_length=1, max_length=100)
    estimated_cost: float = Field(..., ge=0)
    attractions: List[ItineraryAttractionItem] = Field(..., min_length=1)

class BusinessClaimCreate(BaseModel):
    notes: Optional[str] = None


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return {"id": int(user_id), "role": payload.get("role")}


@app.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# GET ENDPOINTS

# GET/USERS
@app.get("/users")
async def list_users():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT u.id, u.name, u.status, u.phone, u.address, u.preferred_language, u.bio
                FROM users u
            """)
            return cursor.fetchall()
    finally:
        conn.close()


# GET/ATTRACTION
@app.get("/attractions")
async def list_attractions():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.id, a.name, a.province, a.avg_rating, c.name AS category
                FROM attractions a
                JOIN categories c ON c.id = a.category_id
                ORDER BY a.avg_rating DESC
            """)
            return cursor.fetchall()
    finally:
        conn.close()


@app.get("/attractions/{attraction_id}")
async def get_attraction(attraction_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.*, c.name AS category_name
                FROM attractions a
                LEFT JOIN categories c ON c.id = a.category_id
                WHERE a.id = %s
            """, (attraction_id,))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Attraction not found")

            return result
    finally:
        conn.close()


# GET/attractions/{attraction_id}/reviews
@app.get("/attractions/{attraction_id}/reviews")
async def get_attractions_reviews(attraction_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT r.id, r.rating, r.text
                FROM reviews r
                WHERE r.attraction_id = %s
                ORDER BY r.created_at DESC
            """, (attraction_id,))
            result = cursor.fetchall()

            if not result:
                raise HTTPException(status_code=404, detail="Reviews not found")

            return result
    finally:
        conn.close()


# GET/CATEGORIES
@app.get("/categories")
async def get_categories():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT c.id, c.parent_id, c.name, c.description
                FROM categories c
            """)
        return cursor.fetchall()
    finally:
        conn.close()


# GET/ITINERARIES
@app.get("/itineraries")
async def get_itineraries():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT i.id, i.user_id, i.title, i.days, i.summary, i.region_scope, i.estimated_cost
                FROM itineraries i
            """)
            return cursor.fetchall()
    finally:
        conn.close()


# POST ENDPOINTS

@app.post("/reviews", status_code=201)
async def create_review(review: ReviewCreate, user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM attractions WHERE id = %s", (review.attraction_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Attraction not found")

            cursor.execute(
                "SELECT id FROM reviews WHERE user_id = %s AND attraction_id = %s",
                (user["id"], review.attraction_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=401, detail="You already reviewed this attraction")
            cursor.execute("""
                INSERT INTO reviews (user_id, attraction_id, rating, text, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, (
                    user["id"],
                    review.attraction_id,
                    review.rating,
                    review.text
                ))
            conn.commit()
            return {
                "message": "Review created",
                "review_id": cursor.lastrowid
            }
    finally:
        conn.close()


# POST/REGISTER
@app.post("/register", status_code=201)
async def create_user(register: UserCreate):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE email = %s", (register.email, ))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")

            hashed_password = bcrypt.hash(register.password)
            generated_token = secrets.token_urlsafe(32)

            cursor.execute("""
                INSERT INTO users (name, email, password_hash, role, status, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                    register.name,
                    register.email,
                    hashed_password,
                    'user',
                    'pending'
                ))
            new_user_id = cursor.lastrowid
            cursor.execute("""
                INSERT INTO email_tokens (user_id, token_hash, type, expires_at)
                VALUES (%s, %s, %s, NOW() + INTERVAL 24 HOUR)
            """, (
                    cursor.lastrowid,
                    generated_token,
                    'email_verification'
                ))
            conn.commit()
            return {
                "message": "User created",
                "user_id": new_user_id
            }
    finally:
        conn.close()


# POST/LOGIN
@app.post("/login")
async def user_login(login: UserLogin):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, name, email, password_hash, role, status, failed_attempts FROM users WHERE email = %s",
                (login.email, )
            )
            users = cursor.fetchone()

            if not bcrypt.verify(login.password, users["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password")

            access_payload = {
                "sub": str(users["id"]),
                "role": users["role"],
                "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            }
            access_token = jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM)

            refresh_token = secrets.token_urlsafe(32)

            cursor.execute("""
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
                VALUES (%s, %s, %s, NOW())
            """, (
                    users["id"],
                    refresh_token,
                    datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
                ))
            conn.commit()
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user_id": users["id"],
                "name": users["name"],
                "role": users["role"]
            }
    finally:
        conn.close()


@app.post("/itineraries", status_code=201)
async def create_itinerary(itinerary: ItineraryCreate, user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        with conn.cursor() as cursor:

            # INSERT into itineraries (parent)

            cursor.execute("""
                INSERT INTO itineraries (user_id, title, days, summary, region_scope, estimated_cost, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (
                    user["id"],
                    itinerary.title,
                    itinerary.days,
                    itinerary.summary,
                    itinerary.region_scope,
                    itinerary.estimated_cost
                ))
            new_itinerary_id = cursor.lastrowid

                # LOOP: INSERT each attraction into junction table

            for item in itinerary.attractions:
                cursor.execute("""
                    INSERT INTO itinerary_attractions (itinerary_id, attraction_id, day_index, order_index, notes, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """, (
                        new_itinerary_id,
                        item.attraction_id,
                        item.day_index,
                        item.order_index,
                        item.notes
                    ))

            conn.commit()


            return {
                "message": "Itinerary created",
                "itinerary_id": new_itinerary_id,
                "attractions_count": len(itinerary.attractions)
            }
    finally:
        conn.close()


@app.post("/attractions/{attraction_id}/claim", status_code=201)
async def claim_attraction(attraction_id: int, claim: BusinessClaimCreate, user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            # FK checking if there is attraction
            cursor.execute(
                "SELECT id FROM attractions WHERE id = %s",
                (attraction_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Attraction not found")

            # DUPLICATE CHECKING if there is pending claims

            cursor.execute(
                "SELECT id FROM business_claims WHERE attraction_id = %s AND status = %s",
                (attraction_id, 'pending')
            )
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="Attraction already has pending claim")

            cursor.execute("""
                INSERT INTO business_claims (user_id, attraction_id, status, submitted_at, notes)
                VALUES (%s, %s, %s, NOW(), %s)
            """, (
                    user["id"],
                    attraction_id,
                    'pending',
                    claim.notes
                ))
            conn.commit()
            return {
                "message": "Claim submitted",
                "attraction_id": attraction_id,
                "status": "pending"
            }
    finally:
        conn.close()