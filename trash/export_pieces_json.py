import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "inventory" / "inventory.db"
OUTPUT_PATH = BASE_DIR / "public" / "data" / "pieces.json"

QUERY = """
SELECT
    id,
    title,
    category,
    clay,
    finish,
    dimensions,
    status,
    description,
    has_bottom_image,
    is_published
FROM pieces
WHERE is_published = 1
ORDER BY id;
"""

def row_to_piece(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "category": row["category"],
        "clay": row["clay"],
        "finish": row["finish"],
        "dimensions": row["dimensions"],
        "price": row["status"],
        "description": row["description"],
        "has_bottom_image": bool(row["has_bottom_image"]),
        "is_published": bool(row["is_published"]),
    }

def main() -> None:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(QUERY).fetchall()
        pieces = [row_to_piece(row) for row in rows]

        with OUTPUT_PATH.open("w", encoding="utf-8") as f:
            json.dump(pieces, f, indent=2, ensure_ascii=False)

        print(f"Exported {len(pieces)} pieces to {OUTPUT_PATH}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()