from getpass import getpass

import bcrypt

from main import database


email = input("Admin email: ").strip().lower()
password = getpass("New password: ")
confirm = getpass("Confirm password: ")

if len(password) < 8:
    raise SystemExit("Password must contain at least 8 characters.")

if password != confirm:
    raise SystemExit("Passwords do not match.")

encoded = password.encode("utf-8")

if len(encoded) > 72:
    raise SystemExit("Password must not exceed 72 UTF-8 bytes.")

password_hash = bcrypt.hashpw(
    encoded,
    bcrypt.gensalt(),
).decode()

with database() as conn:
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT id
            FROM users
            WHERE email = %s
              AND role = 'admin'
              AND deleted_at IS NULL
            FOR UPDATE
        """, (email,))

        admin = cursor.fetchone()

        if not admin:
            raise SystemExit("Admin account not found. Check the email.")

        cursor.execute("""
            UPDATE users
            SET password_hash = %s, updated_at = NOW()
            WHERE id = %s
        """, (password_hash, admin["id"]))

        cursor.execute("""
            UPDATE refresh_tokens
            SET revoked = 1
            WHERE user_id = %s
        """, (admin["id"],))

print("Admin password updated successfully.")