import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
from datetime import datetime

DB_NAME = "claycraze_inventory.db"

SHAPES = ["OV", "REC", "RND", "SQ"]
CONTEXTS = ["Studio Visit", "Online", "Show", "Friend/Referral", "Other"]
CLAY_BODIES = ["White Stoneware", "Brown Stoneware", "Porcelain"]
GLAZES = ["Waxy Matte", "Nuka", "Iron Wash", "Shino", "Other"]

# ---------------------------
# DB INIT
# ---------------------------
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id TEXT PRIMARY KEY,
            shape TEXT,
            piece_number INTEGER,
            date_code TEXT,
            description TEXT,
            clay_body TEXT,
            glaze TEXT,
            notes TEXT,
            status TEXT DEFAULT 'available'
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS sales (
            sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT,
            sale_date TEXT,
            price REAL,
            patron_name TEXT,
            patron_city TEXT,
            patron_address TEXT,
            patron_phone TEXT,
            context TEXT
        )
    ''')

    conn.commit()
    conn.close()

# ---------------------------
# HELPERS
# ---------------------------
def generate_id(shape, number, date):
    return f"{shape}-{int(number):04d}-{date}"

def get_next_piece_number(shape):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("SELECT MAX(piece_number) FROM inventory WHERE shape=?", (shape,))
    result = c.fetchone()[0]

    conn.close()
    return (result or 0) + 1

# ---------------------------
# ADD ITEM
# ---------------------------
def save_item():
    shape = shape_var.get()
    number = piece_entry.get()
    date = date_entry.get()

    if not shape or not date:
        messagebox.showerror("Error", "Shape and Date required")
        return

    if not number:
        number = get_next_piece_number(shape)

    item_id = generate_id(shape, number, date)

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    try:
        c.execute('''
            INSERT INTO inventory (id, shape, piece_number, date_code, description, clay_body, glaze, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            item_id,
            shape,
            int(number),
            date,
            desc_entry.get(),
            clay_var.get(),
            glaze_var.get(),
            notes_entry.get()
        ))

        conn.commit()
        messagebox.showinfo("Saved", f"{item_id} added")

        refresh_inventory()

    except sqlite3.IntegrityError:
        messagebox.showerror("Error", "Item already exists")

    conn.close()

# ---------------------------
# RECORD SALE
# ---------------------------
def save_sale():
    item_id = sale_item_entry.get()

    if not item_id:
        messagebox.showerror("Error", "Item ID required")
        return

    try:
        price = float(price_entry.get())
    except:
        messagebox.showerror("Error", "Invalid price")
        return

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("SELECT status FROM inventory WHERE id=?", (item_id,))
    result = c.fetchone()

    if not result:
        messagebox.showerror("Error", "Item not found")
        return

    if result[0] == "sold":
        messagebox.showwarning("Warning", "Already sold")
        return

    c.execute('''
        INSERT INTO sales (item_id, sale_date, price, patron_name, patron_city, patron_address, patron_phone, context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        item_id,
        datetime.now().strftime("%Y-%m-%d"),
        price,
        patron_name_entry.get(),
        patron_city_entry.get(),
        patron_address_entry.get(),
        patron_phone_entry.get(),
        context_var.get()
    ))

    c.execute("UPDATE inventory SET status='sold' WHERE id=?", (item_id,))

    conn.commit()
    conn.close()

    messagebox.showinfo("Success", f"{item_id} marked sold")
    refresh_inventory()

# ---------------------------
# INVENTORY VIEW
# ---------------------------
def refresh_inventory():
    for row in tree.get_children():
        tree.delete(row)

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("SELECT id, shape, status FROM inventory ORDER BY piece_number DESC")

    for row in c.fetchall():
        tree.insert("", tk.END, values=row)

    conn.close()

# ---------------------------
# UI
# ---------------------------
root = tk.Tk()
root.title("ClaycrazE Inventory V2")
root.geometry("700x500")

init_db()

notebook = ttk.Notebook(root)
notebook.pack(fill="both", expand=True)

# ---------------------------
# TAB 1: ADD ITEM
# ---------------------------
tab1 = ttk.Frame(notebook)
notebook.add(tab1, text="Add Piece")

shape_var = tk.StringVar()
clay_var = tk.StringVar()
glaze_var = tk.StringVar()

ttk.Label(tab1, text="Shape").grid(row=0, column=0)
ttk.Combobox(tab1, textvariable=shape_var, values=SHAPES).grid(row=0, column=1)

ttk.Label(tab1, text="Piece # (auto if blank)").grid(row=1, column=0)
piece_entry = ttk.Entry(tab1)
piece_entry.grid(row=1, column=1)

ttk.Label(tab1, text="Date (YYMM)").grid(row=2, column=0)
date_entry = ttk.Entry(tab1)
date_entry.grid(row=2, column=1)

ttk.Label(tab1, text="Description").grid(row=3, column=0)
desc_entry = ttk.Entry(tab1)
desc_entry.grid(row=3, column=1)

ttk.Label(tab1, text="Clay").grid(row=4, column=0)
ttk.Combobox(tab1, textvariable=clay_var, values=CLAY_BODIES).grid(row=4, column=1)

ttk.Label(tab1, text="Glaze").grid(row=5, column=0)
ttk.Combobox(tab1, textvariable=glaze_var, values=GLAZES).grid(row=5, column=1)

ttk.Label(tab1, text="Notes").grid(row=6, column=0)
notes_entry = ttk.Entry(tab1)
notes_entry.grid(row=6, column=1)

ttk.Button(tab1, text="Save Piece", command=save_item).grid(row=7, column=0, columnspan=2)

# ---------------------------
# TAB 2: RECORD SALE
# ---------------------------
tab2 = ttk.Frame(notebook)
notebook.add(tab2, text="Record Sale")

context_var = tk.StringVar()

ttk.Label(tab2, text="Item ID").grid(row=0, column=0)
sale_item_entry = ttk.Entry(tab2)
sale_item_entry.grid(row=0, column=1)

ttk.Label(tab2, text="Price").grid(row=1, column=0)
price_entry = ttk.Entry(tab2)
price_entry.grid(row=1, column=1)

ttk.Label(tab2, text="Patron Name").grid(row=2, column=0)
patron_name_entry = ttk.Entry(tab2)
patron_name_entry.grid(row=2, column=1)

ttk.Label(tab2, text="City").grid(row=3, column=0)
patron_city_entry = ttk.Entry(tab2)
patron_city_entry.grid(row=3, column=1)

ttk.Label(tab2, text="Address").grid(row=4, column=0)
patron_address_entry = ttk.Entry(tab2)
patron_address_entry.grid(row=4, column=1)

ttk.Label(tab2, text="Phone").grid(row=5, column=0)
patron_phone_entry = ttk.Entry(tab2)
patron_phone_entry.grid(row=5, column=1)

ttk.Label(tab2, text="Context").grid(row=6, column=0)
ttk.Combobox(tab2, textvariable=context_var, values=CONTEXTS).grid(row=6, column=1)

ttk.Button(tab2, text="Record Sale", command=save_sale).grid(row=7, column=0, columnspan=2)

# ---------------------------
# TAB 3: INVENTORY VIEW
# ---------------------------
tab3 = ttk.Frame(notebook)
notebook.add(tab3, text="Inventory")

tree = ttk.Treeview(tab3, columns=("ID", "Shape", "Status"), show="headings")
tree.heading("ID", text="ID")
tree.heading("Shape", text="Shape")
tree.heading("Status", text="Status")

tree.pack(fill="both", expand=True)

refresh_inventory()

root.mainloop()