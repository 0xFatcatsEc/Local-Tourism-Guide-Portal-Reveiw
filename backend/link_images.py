from pathlib import Path
from urllib.parse import quote

from main import database


IMAGE_FOLDER = (
    Path(__file__).resolve().parent
    / "uploads"
    / "attractions"
)

# Destination name sa database → keyword sa filename.
DESTINATIONS = {
    "Boracay White Beach": "boracay",
    "Alona Beach": "alona",
    "Nacpan Beach": "nacpan",
    "Saud Beach": "saud",
    "Paliton Beach": "paliton",
    "San Juan Beach": "la union",
    "Mount Pulag": "pulag",
    "Mount Batulao": "batulao",
    "Mount Maculot": "maculot",
    "Mount Arayat": "arayat",
    "Mount Isarog": "isarog",
    "Fort Santiago": "fort santiago",
    "Calle Crisologo": "vigan",
    "Paoay Church": "paoay",
    "Barasoain Church": "barasoain",
}

if not IMAGE_FOLDER.is_dir():
    raise SystemExit(f"Folder not found: {IMAGE_FOLDER}")

files = [
    file
    for file in IMAGE_FOLDER.iterdir()
    if file.is_file()
    and file.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
]

linked = 0

with database() as conn:
    with conn.cursor() as cursor:
        for destination, keyword in DESTINATIONS.items():
            matches = [
                file
                for file in files
                if keyword in file.stem.lower()
            ]

            if len(matches) != 1:
                print(
                    f"SKIPPED: {destination} "
                    f"({len(matches)} matching files)"
                )
                continue

            file = matches[0]

            cursor.execute("""
                SELECT id
                FROM attractions
                WHERE name = %s
                  AND deleted_at IS NULL
            """, (destination,))

            attractions = cursor.fetchall()

            if len(attractions) != 1:
                print(
                    f"SKIPPED: {destination} "
                    "(destination missing or duplicated)"
                )
                continue

            attraction_id = attractions[0]["id"]

            # Handles spaces and special characters in filenames.
            url = (
                "/uploads/attractions/"
                + quote(file.name, safe="")
            )

            cursor.execute("""
                SELECT id
                FROM attraction_media
                WHERE attraction_id = %s
                  AND type = 'image'
                  AND deleted_at IS NULL
                ORDER BY
                    (url = %s) DESC,
                    is_primary DESC,
                    id ASC
                LIMIT 1
                FOR UPDATE
            """, (attraction_id, url))

            existing = cursor.fetchone()

            cursor.execute("""
                UPDATE attraction_media
                SET is_primary = 0
                WHERE attraction_id = %s
                  AND type = 'image'
                  AND deleted_at IS NULL
            """, (attraction_id,))

            if existing:
                cursor.execute("""
                    UPDATE attraction_media
                    SET url = %s,
                        caption = %s,
                        is_primary = 1
                    WHERE id = %s
                """, (url, destination, existing["id"]))

            else:
                cursor.execute("""
                    INSERT INTO attraction_media (
                        attraction_id,
                        url,
                        type,
                        is_primary,
                        caption,
                        created_at
                    )
                    VALUES (%s, %s, 'image', 1, %s, NOW())
                """, (attraction_id, url, destination))

            linked += 1
            print(f"LINKED: {destination} -> {file.name}")

print(f"\nDone! {linked} destination images linked.")