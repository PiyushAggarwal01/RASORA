from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, httpx, json

DB_NAME = "rasora.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[""], allow_methods=[""], allow_headers=["*"])

# Database setup
def create_tables():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        diet_pref TEXT DEFAULT 'vegetarian',
        created_at DATE DEFAULT CURRENT_DATE
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        unit TEXT NOT NULL,
        store TEXT NOT NULL,
        image TEXT,
        diet_type TEXT DEFAULT 'vegetarian'
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        quantity INTEGER DEFAULT 1,
        price INTEGER,
        order_date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'pending'
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        item TEXT NOT NULL,
        amount INTEGER NOT NULL,
        date DATE DEFAULT CURRENT_DATE
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ingredients TEXT,
        instructions TEXT,
        video_url TEXT,
        prep_time TEXT,
        diet_type TEXT DEFAULT 'vegetarian'
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recipe_name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        created_at DATE DEFAULT CURRENT_DATE
    )''')
    conn.commit()
    conn.close()

# Add diet_type column if not exists
conn = get_db()
c = conn.cursor()
try:
    c.execute("ALTER TABLE products ADD COLUMN diet_type TEXT DEFAULT 'vegetarian'")
except sqlite3.OperationalError:
    pass  # column already exists
conn.commit()
conn.close()

def insert_sample_products():
    conn = get_db()
    c = conn.cursor()
    products = [
        ("Fresh Milk 1L", "Dairy", 55, "1L", "Zepto", "https://placehold.co/50x50?text=🥛", "vegetarian"),
        ("Amul Milk 1L", "Dairy", 60, "1L", "Blinkit", "https://placehold.co/50x50?text=🥛", "vegetarian"),
        ("Brown Bread", "Bakery", 40, "400g", "Blinkit", "https://placehold.co/50x50?text=🍞", "vegetarian"),
        ("Paneer 200g", "Dairy", 70, "200g", "Local", "https://placehold.co/50x50?text=🧀", "vegetarian"),
        ("Eggs 6pcs", "Dairy", 45, "6pcs", "Instamart", "https://placehold.co/50x50?text=🥚", "vegetarian"),
        ("Tomato 500g", "Vegetables", 30, "500g", "BigBasket", "https://placehold.co/50x50?text=🍅", "vegetarian"),
        ("Onion 500g", "Vegetables", 25, "500g", "Local", "https://placehold.co/50x50?text=🧅", "vegetarian"),
        ("Potato 500g", "Vegetables", 20, "500g", "Zepto", "https://placehold.co/50x50?text=🥔", "vegetarian"),
        ("Apple 1kg", "Fruits", 120, "1kg", "Blinkit", "https://placehold.co/50x50?text=🍎", "vegetarian"),
        ("Banana 6pcs", "Fruits", 40, "6pcs", "Local", "https://placehold.co/50x50?text=🍌", "vegetarian"),
        ("Orange", "Fruits", 80, "1kg", "Instamart", "https://placehold.co/50x50?text=🍊", "vegetarian"),
        ("Capsicum", "Vegetables", 40, "250g", "BigBasket", "https://placehold.co/50x50?text=🫑", "vegetarian"),
        ("Garlic", "Vegetables", 20, "100g", "Local", "https://placehold.co/50x50?text=🧄", "vegetarian"),
        ("Ginger", "Vegetables", 25, "100g", "Zepto", "https://placehold.co/50x50?text=🫚", "vegetarian"),
        ("Basmati Rice 1kg", "Grocery", 120, "1kg", "Blinkit", "https://placehold.co/50x50?text=🍚", "vegetarian"),
        ("Toor Dal 500g", "Grocery", 80, "500g", "Instamart", "https://placehold.co/50x50?text=🫘", "vegetarian"),
        ("Tea 250g", "Beverages", 150, "250g", "Zepto", "https://placehold.co/50x50?text=🍵", "vegetarian"),
        ("Maggi Noodles", "Snacks", 15, "70g", "Local", "https://placehold.co/50x50?text=🍜", "vegetarian"),
        ("Frozen Peas", "Frozen", 40, "500g", "Blinkit", "https://placehold.co/50x50?text=🟢", "vegetarian"),
        ("Gulab Jamun Mix", "Dessert", 50, "200g", "BigBasket", "https://placehold.co/50x50?text=🍡", "vegetarian"),
        ("Farm Fresh Eggs 12pcs", "Eggs", 80, "12pcs", "Local", "https://placehold.co/50x50?text=🥚", "vegetarian"),
        ("Organic Eggs 6pcs", "Eggs", 60, "6pcs", "Zepto", "https://placehold.co/50x50?text=🥚", "vegetarian"),
        ("Country Eggs 6pcs", "Eggs", 50, "6pcs", "Blinkit", "https://placehold.co/50x50?text=🥚", "vegetarian"),
        ("Chicken Breast 500g", "Chicken", 200, "500g", "Local", "https://placehold.co/50x50?text=🍗", "non-vegetarian"),
        ("Chicken Thigh 500g", "Chicken", 180, "500g", "BigBasket", "https://placehold.co/50x50?text=🍗", "non-vegetarian"),
        ("Chicken Drumstick 500g", "Chicken", 220, "500g", "Instamart", "https://placehold.co/50x50?text=🍗", "non-vegetarian"),
    ]
    c.executemany('''INSERT OR IGNORE INTO products (name, category, price, unit, store, image, diet_type) VALUES (?, ?, ?, ?, ?, ?, ?)''', products)
    conn.commit()
    conn.close()

def insert_sample_recipes():
    conn = get_db()
    c = conn.cursor()
    recipes = [
        ("Aloo Paratha", '["aloo", "atta", "pyaaz", "hari mirch", "masale"]', "Mix mashed potatoes with spices, knead dough, stuff and cook on tawa", "https://youtube.com/watch?v=aloo_paratha", "30 mins", "vegetarian"),
        ("Paneer Butter Masala", '["paneer", "tamatar", "pyaaz", "cream", "kaju", "masale"]', "Saute onion tomato, add spices, cook paneer in gravy", "https://youtube.com/watch?v=paneer_masala", "40 mins", "vegetarian"),
        ("Masala Dosa", '["dosa batter", "aloo", "pyaaz", "rai", "curry leaves"]', "Make dosa batter, prepare potato filling, cook on tawa", "https://youtube.com/watch?v=masala_dosa", "25 mins", "vegetarian"),
        ("Dal Makhani", '["urad dal", "rajma", "butter", "cream", "pyaaz", "tamatar"]', "Slow cook dal overnight, add butter and cream, simmer", "https://youtube.com/watch?v=dal_makhani", "60 mins", "vegetarian"),
        ("Vegetable Biryani", '["basmati rice", "mix veg", "pyaaz", "tamatar", "biryani masala"]', "Layer rice and vegetables with masala, dum cook", "https://youtube.com/watch?v=veg_biryani", "45 mins", "vegetarian"),
    ]
    c.executemany('''INSERT OR IGNORE INTO recipes (name, ingredients, instructions, video_url, prep_time, diet_type) VALUES (?, ?, ?, ?, ?, ?)''', recipes)
    conn.commit()
    conn.close()

create_tables()
insert_sample_products()
insert_sample_recipes()

GEMINI_KEY = "AIzaSyB9eq9dgUKQmVN3xHECqZUook8JIPpkbtc"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"

class Expense(BaseModel):
    item: str; amount: int; date: str
class Order(BaseModel):
    product_id: int; quantity: int; user_id: int = 1
class Post(BaseModel):
    recipe_name: str; description: str
class User(BaseModel):
    name: str; email: str; password: str; diet_pref: Optional[str] = "vegetarian"

@app.get("/")
def root(): return {"message": "RASORA API"}

@app.post("/api/signup")
def signup(user: User):
    conn = get_db(); c = conn.cursor()
    try:
        c.execute("INSERT INTO users (name, email, password, diet_pref) VALUES (?, ?, ?, ?)", 
                 (user.name, user.email, user.password, user.diet_pref))
        conn.commit()
        user_id = c.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(400, "Email already exists")
    conn.close()
    return {"message": "User created", "user_id": user_id}

@app.post("/api/login")
def login(email: str, password: str):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT id, name, diet_pref FROM users WHERE email=? AND password=?", (email, password))
    user = c.fetchone()
    conn.close()
    if not user:
        raise HTTPException(401, "Invalid credentials")
    return {"user_id": user[0], "name": user[1], "diet_pref": user[2]}

@app.get("/api/products")
def get_products(category: Optional[str]=None, diet: Optional[str]=None):
    conn = get_db(); c = conn.cursor()
    q = "SELECT * FROM products WHERE 1=1"
    p = []
    if category: q += " AND category = ?"; p.append(category)
    if diet: q += " AND diet_type = ?"; p.append(diet)
    c.execute(q, p)
    products = c.fetchall(); conn.close()
    return {"products": [dict(p) for p in products]}

@app.get("/api/recipes")
def get_recipes():
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM recipes")
    recipes = c.fetchall(); conn.close()
    return {"recipes": [dict(r) for r in recipes]}

@app.get("/api/recipes/search")
def search_recipes(ingredients: str):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM recipes")
    all_rec = c.fetchall(); conn.close()
    ing_list = [i.strip().lower() for i in ingredients.split(",")]
    matched = []
    for r in all_rec:
        rd = dict(r)
        ings = json.loads(rd.get("ingredients","[]"))
        if any(i in ings for i in ing_list):
            matched.append(rd)
    return {"recipes": matched}

@app.get("/api/expenses")
def get_expenses(user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM expenses WHERE user_id=? ORDER BY date DESC", (user_id,))
    ex = c.fetchall(); conn.close()
    return {"expenses": [dict(e) for e in ex]}

@app.post("/api/expenses")
def add_expense(exp: Expense, user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("INSERT INTO expenses (user_id, item, amount, date) VALUES (?,?,?,?)", (user_id, exp.item, exp.amount, exp.date))
    conn.commit(); conn.close()
    return {"message": "Expense added"}

@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM expenses WHERE id=? AND user_id=?", (expense_id, user_id))
    if not c.fetchone(): raise HTTPException(404)
    c.execute("DELETE FROM expenses WHERE id=? AND user_id=?", (expense_id, user_id))
    conn.commit(); conn.close()
    return {"message": "Deleted"}

@app.post("/api/orders")
def add_order(order: Order, user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT price FROM products WHERE id=?", (order.product_id,))
    p = c.fetchone()
    if not p: raise HTTPException(404)
    price = p[0]
    c.execute("INSERT INTO orders (user_id, product_id, quantity, price) VALUES (?,?,?,?)", (user_id, order.product_id, order.quantity, price))
    conn.commit(); conn.close()
    return {"message": "Order placed"}

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: int, user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE id=? AND user_id=?", (order_id, user_id))
    if not c.fetchone(): raise HTTPException(404)
    c.execute("DELETE FROM orders WHERE id=? AND user_id=?", (order_id, user_id))
    conn.commit(); conn.close()
    return {"message": "Order removed"}

@app.get("/api/orders")
def get_orders(user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT o.*, p.name as product_name, p.image as product_image FROM orders o JOIN products p ON o.product_id=p.id WHERE o.user_id=? ORDER BY o.order_date DESC", (user_id,))
    orders = c.fetchall(); conn.close()
    return {"orders": [dict(o) for o in orders]}

@app.get("/api/posts")
def get_posts():
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM community_posts ORDER BY likes DESC")
    posts = c.fetchall(); conn.close()
    return {"posts": [dict(p) for p in posts]}

@app.post("/api/posts")
def add_post(post: Post, user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("INSERT INTO community_posts (user_id, recipe_name, description) VALUES (?,?,?)", (user_id, post.recipe_name, post.description))
    conn.commit(); conn.close()
    return {"message": "Posted"}

@app.put("/api/posts/{post_id}/like")
def like_post(post_id: int):
    conn = get_db(); c = conn.cursor()
    c.execute("UPDATE community_posts SET likes = likes + 1 WHERE id=?", (post_id,))
    conn.commit(); conn.close()
    return {"message": "Liked"}

@app.get("/api/suggestions")
def get_suggestions(user_id: int=1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT p.name, COUNT(*) as order_count FROM orders o JOIN products p ON o.product_id=p.id WHERE o.user_id=? GROUP BY p.id HAVING order_count >= 2", (user_id,))
    sug = c.fetchall(); conn.close()
    return {"suggestions": [dict(s) for s in sug]}

@app.post("/api/chat")
async def chat(request: dict):
    msg = request.get("message", "")
    if not msg: raise HTTPException(400)
    prompt = f"You are RASORA, a helpful kitchen assistant. Answer concisely: {msg}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    async with httpx.AsyncClient() as client:
        resp = await client.post(GEMINI_URL, json=payload)
        if resp.status_code != 200:
            raise HTTPException(500, "Gemini API error")
        data = resp.json()
        try:
            reply = data["candidates"][0]["content"]["parts"][0]["text"]
        except:
            reply = "Sorry, I couldn't generate a response."
        return {"reply": reply}