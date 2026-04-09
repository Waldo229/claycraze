import json
import sqlite3
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = BASE_DIR / "inventory" / "inventory.db"
JSON_PATH = PUBLIC_DIR / "data" / "pieces.json"


def ensure_database() -> None:
    schema = """
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
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()


def export_pieces_json() -> int:
    query = """
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

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(query).fetchall()
        pieces = [
            {
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
            for row in rows
        ]
    finally:
        conn.close()

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with JSON_PATH.open("w", encoding="utf-8") as f:
        json.dump(pieces, f, indent=2, ensure_ascii=False)

    return len(pieces)


class ClaycrazEHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def end_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/pieces":
            self.end_json(404, {"ok": False, "error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.end_json(400, {"ok": False, "error": "Invalid Content-Length"})
            return

        raw_body = self.rfile.read(length)
        try:
            data = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.end_json(400, {"ok": False, "error": "Invalid JSON"})
            return

        validation_error = validate_piece_payload(data)
        if validation_error:
            self.end_json(400, {"ok": False, "error": validation_error})
            return

        try:
            upsert_piece(data)
            exported_count = export_pieces_json()
        except Exception as exc:
            self.end_json(500, {"ok": False, "error": f"Server error: {exc}"})
            return

        self.end_json(
            200,
            {
                "ok": True,
                "message": "Piece saved successfully.",
                "piece_id": data["id"],
                "exported_count": exported_count,
            },
        )


def validate_piece_payload(data: dict) -> str | None:
    required_text_fields = ["id", "title", "category", "status"]
    for field in required_text_fields:
        value = str(data.get(field, "")).strip()
        if not value:
            return f"Missing required field: {field}"

    piece_id = str(data.get("id", "")).strip()
    if len(piece_id) < 8 or "-" not in piece_id:
        return "Invalid piece ID format."

    return None


def upsert_piece(data: dict) -> None:
    query = """
    INSERT INTO pieces (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        clay = excluded.clay,
        finish = excluded.finish,
        dimensions = excluded.dimensions,
        status = excluded.status,
        description = excluded.description,
        has_bottom_image = excluded.has_bottom_image,
        is_published = excluded.is_published;
    """

    params = (
        str(data.get("id", "")).strip(),
        str(data.get("title", "")).strip(),
        str(data.get("category", "")).strip(),
        str(data.get("clay", "")).strip(),
        str(data.get("finish", "")).strip(),
        str(data.get("dimensions", "")).strip(),
        str(data.get("status", "")).strip(),
        str(data.get("description", "")).strip(),
        1 if data.get("has_bottom_image") else 0,
        1 if data.get("is_published", True) else 0,
    )

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(query, params)
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    ensure_database()
    export_pieces_json()

    server = ThreadingHTTPServer(("127.0.0.1", 8000), ClaycrazEHandler)
    print("ClaycrazE local server running at http://127.0.0.1:8000")
    print("Open http://127.0.0.1:8000/admin.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()