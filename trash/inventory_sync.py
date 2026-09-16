import sqlite3
import json
import os
from datetime import datetime

DB_NAME = "claycraze_inventory.db"
JSON_FILE = "inventory.json"

# ---------------------------
# LOAD JSON (optional use)
# ---------------------------
def load_json():
    if not os.path.exists(JSON_FILE):
        return []
    with open(JSON_FILE, "r") as f:
        return json.load(f)

# ---------------------------
# SAVE JSON
# ---------------------------
def save_json(data):
    with open(JSON_FILE, "w") as f:
        json.dump(data, f, indent=4)

# ---------------------------
# SYNC SQL → JSON (MASTER)
# ---------------------------
def sync_sql_to_json():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Pull inventory
    c.execute("SELECT * FROM inventory")
    inventory_rows = c.fetchall()
    inventory_cols = [desc[0] for desc in c.description]

    # Pull sales
    c.execute("SELECT * FROM sales")
    sales_rows = c.fetchall()
    sales_cols = [desc[0] for desc in c.description]

    conn.close()

    # Convert inventory to dict
    inventory = []
    for row in inventory_rows:
        item = dict(zip(inventory_cols, row))

        # Attach sale if exists
        sale_match = next((s for s in sales_rows if s[1] == item["id"]), None)

        if sale_match:
            sale_dict = dict(zip(sales_cols, sale_match))
            item["sale"] = sale_dict
        else:
            item["sale"] = None

        inventory.append(item)

    save_json(inventory)

    print("✅ SQL → JSON synced")

# ---------------------------
# ADD ITEM (DUAL WRITE)
# ---------------------------
def add_item_dual(item):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    try:
        c.execute('''
            INSERT INTO inventory (
                id, shape, piece_number, date_code,
                description, clay_body, glaze, notes, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            item["id"],
            item["shape"],
            item["piece_number"],
            item["date_code"],
            item.get("description", ""),
            item.get("clay_body", ""),
            item.get("glaze", ""),
            item.get("notes", ""),
            item.get("status", "available")
        ))

        conn.commit()
        print(f"✅ Added to SQL: {item['id']}")

    except sqlite3.IntegrityError:
        print("⚠️ Item already exists in SQL")

    conn.close()

    # Always refresh JSON from SQL
    sync_sql_to_json()

# ---------------------------
# RECORD SALE (DUAL WRITE)
# ---------------------------
def record_sale_dual(sale):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Insert sale
    c.execute('''
        INSERT INTO sales (
            item_id, sale_date, price,
            patron_name, patron_city,
            patron_address, patron_phone, context
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        sale["item_id"],
        sale.get("sale_date", datetime.now().strftime("%Y-%m-%d")),
        sale["price"],
        sale.get("patron_name", ""),
        sale.get("patron_city", ""),
        sale.get("patron_address", ""),
        sale.get("patron_phone", ""),
        sale.get("context", "")
    ))

    # Update inventory status
    c.execute("UPDATE inventory SET status='sold' WHERE id=?", (sale["item_id"],))

    conn.commit()
    conn.close()

    print(f"💰 Sale recorded: {sale['item_id']}")

    sync_sql_to_json()

# ---------------------------
# MARK SOLD ONLY
# ---------------------------
def mark_sold(item_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("UPDATE inventory SET status='sold' WHERE id=?", (item_id,))
    conn.commit()
    conn.close()

    print(f"✔ Marked sold: {item_id}")

    sync_sql_to_json()

# ---------------------------
# RESET JSON FROM SQL
# ---------------------------
def rebuild_json():
    print("🔄 Rebuilding JSON from SQL...")
    sync_sql_to_json()

# ---------------------------
# CLI TEST MENU
# ---------------------------
def main():
    while True:
        print("\nInventory Sync Utility")
        print("1. Sync SQL → JSON")
        print("2. Rebuild JSON")
        print("3. Exit")

        choice = input("Select option: ")

        if choice == "1":
            sync_sql_to_json()
        elif choice == "2":
            rebuild_json()
        elif choice == "3":
            break
        else:
            print("Invalid choice.")

# ---------------------------
# ENTRY POINT
# ---------------------------
if __name__ == "__main__":
    main()