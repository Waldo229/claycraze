import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "inventory.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS pieces (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Bonsai',
    clay TEXT DEFAULT '',
    finish TEXT DEFAULT '',
    dimensions TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Available',
    description TEXT DEFAULT '',
    has_bottom_image INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_pieces_updated_at
AFTER UPDATE ON pieces
FOR EACH ROW
BEGIN
    UPDATE pieces
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
END;
"""

def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
        print(f"Database initialized: {DB_PATH}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()