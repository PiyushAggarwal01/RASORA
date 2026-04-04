from fastapi import FastAPI, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, httpx, json
from datetime import datetime, timedelta

DB_NAME = "rasora.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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
        diet_type TEXT DEFAULT 'veg'
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
    # NEW: communities table
    c.execute('''CREATE TABLE IF NOT EXISTS communities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_by INTEGER,
        created_at DATE DEFAULT CURRENT_DATE
    )''')
    # Add community_id column to community_posts if not exists
    try:
        c.execute("ALTER TABLE community_posts ADD COLUMN community_id INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass
    # Insert default community "General" if not exists
    c.execute("INSERT OR IGNORE INTO communities (id, name, created_by) VALUES (1, 'General', 1)")
    conn.commit()
    conn.close()

def insert_sample_products():
    conn = get_db()
    c = conn.cursor()
    products = [
        # Dairy (veg)
        ("Fresh Milk 1L", "Dairy", 55, "1L", "Zepto", "https://placehold.co/50x50?text=🥛", "veg"),
        ("Amul Milk 1L", "Dairy", 60, "1L", "Blinkit", "https://placehold.co/50x50?text=🥛", "veg"),
        ("Paneer 200g", "Dairy", 70, "200g", "Local", "https://placehold.co/50x50?text=🧀", "veg"),
        ("Curd 500g", "Dairy", 35, "500g", "Zepto", "https://placehold.co/50x50?text=🥄", "veg"),
        ("Butter 100g", "Dairy", 50, "100g", "Blinkit", "https://placehold.co/50x50?text=🧈", "veg"),
        ("Cheese Slice 6pcs", "Dairy", 80, "6pcs", "Instamart", "https://placehold.co/50x50?text=🧀", "veg"),
        
        # Bakery (veg)
        ("Brown Bread", "Bakery", 40, "400g", "Blinkit", "https://placehold.co/50x50?text=🍞", "veg"),
        ("White Bread", "Bakery", 35, "400g", "Zepto", "https://placehold.co/50x50?text=🍞", "veg"),
        ("Pav 6pcs", "Bakery", 25, "6pcs", "Local", "https://placehold.co/50x50?text=🍞", "veg"),
        ("Croissant", "Bakery", 35, "1pc", "Blinkit", "https://placehold.co/50x50?text=🥐", "veg"),
        ("Pizza Base", "Bakery", 45, "1pc", "Local", "https://placehold.co/50x50?text=🍕", "veg"),
        
        # Vegetables (veg)
        ("Tomato 500g", "Vegetables", 30, "500g", "BigBasket", "https://placehold.co/50x50?text=🍅", "veg"),
        ("Onion 500g", "Vegetables", 25, "500g", "Local", "https://placehold.co/50x50?text=🧅", "veg"),
        ("Potato 500g", "Vegetables", 20, "500g", "Zepto", "https://placehold.co/50x50?text=🥔", "veg"),
        ("Capsicum 250g", "Vegetables", 40, "250g", "Blinkit", "https://placehold.co/50x50?text=🫑", "veg"),
        ("Carrot 500g", "Vegetables", 30, "500g", "Instamart", "https://placehold.co/50x50?text=🥕", "veg"),
        ("Cauliflower", "Vegetables", 35, "500g", "BigBasket", "https://placehold.co/50x50?text=🥦", "veg"),
        ("Spinach 250g", "Vegetables", 20, "250g", "Local", "https://placehold.co/50x50?text=🥬", "veg"),
        ("Garlic 100g", "Vegetables", 20, "100g", "Zepto", "https://placehold.co/50x50?text=🧄", "veg"),
        ("Ginger 100g", "Vegetables", 25, "100g", "Blinkit", "https://placehold.co/50x50?text=🫚", "veg"),
        ("Green Chilli 100g", "Vegetables", 15, "100g", "Local", "https://placehold.co/50x50?text=🌶️", "veg"),
        
        # Fruits (veg)
        ("Apple 1kg", "Fruits", 120, "1kg", "Blinkit", "https://placehold.co/50x50?text=🍎", "veg"),
        ("Banana 6pcs", "Fruits", 40, "6pcs", "Local", "https://placehold.co/50x50?text=🍌", "veg"),
        ("Orange 1kg", "Fruits", 80, "1kg", "Instamart", "https://placehold.co/50x50?text=🍊", "veg"),
        ("Grapes 500g", "Fruits", 90, "500g", "Zepto", "https://placehold.co/50x50?text=🍇", "veg"),
        ("Pomegranate", "Fruits", 80, "1pc", "BigBasket", "https://placehold.co/50x50?text=🍎", "veg"),
        
        # Eggs (non-veg)
        ("Eggs 6pcs", "Eggs", 45, "6pcs", "Instamart", "https://placehold.co/50x50?text=🥚", "nonveg"),
        ("Eggs 12pcs", "Eggs", 85, "12pcs", "Zepto", "https://placehold.co/50x50?text=🥚", "nonveg"),
        ("Organic Eggs 6pcs", "Eggs", 65, "6pcs", "Blinkit", "https://placehold.co/50x50?text=🥚", "nonveg"),
        
        # Chicken (non-veg)
        ("Chicken Breast 500g", "Chicken", 180, "500g", "FreshMart", "https://placehold.co/50x50?text=🍗", "nonveg"),
        ("Chicken Thigh 500g", "Chicken", 160, "500g", "MeatShop", "https://placehold.co/50x50?text=🍗", "nonveg"),
        ("Chicken Curry Cut", "Chicken", 150, "500g", "LocalButcher", "https://placehold.co/50x50?text=🍗", "nonveg"),
        
        # Meat (non-veg)
        ("Mutton 500g", "Meat", 350, "500g", "MeatShop", "https://placehold.co/50x50?text=🥩", "nonveg"),
        ("Lamb Chops", "Meat", 400, "500g", "PremiumMeat", "https://placehold.co/50x50?text=🥩", "nonveg"),
        
        # Fish (non-veg)
        ("Rohu Fish 500g", "Fish", 200, "500g", "FishMarket", "https://placehold.co/50x50?text=🐟", "nonveg"),
        ("Prawns 250g", "Fish", 180, "250g", "Seafood", "https://placehold.co/50x50?text=🦐", "nonveg"),
        
        # Snacks (veg/non-veg)
        ("Maggi Noodles", "Snacks", 15, "70g", "Local", "https://placehold.co/50x50?text=🍜", "veg"),
        ("Lays Chips", "Snacks", 20, "50g", "Zepto", "https://placehold.co/50x50?text=🍟", "veg"),
        ("Chicken Nuggets", "Snacks", 120, "200g", "FrozenFood", "https://placehold.co/50x50?text=🍗", "nonveg"),
        
        # Frozen (veg/non-veg)
        ("Frozen Peas", "Frozen", 40, "500g", "Blinkit", "https://placehold.co/50x50?text=🟢", "veg"),
        ("Frozen Chicken Wings", "Frozen", 150, "500g", "FrozenFood", "https://placehold.co/50x50?text=🍗", "nonveg"),
    ]
    c.executemany('''INSERT OR IGNORE INTO products (name, category, price, unit, store, image, diet_type) VALUES (?, ?, ?, ?, ?, ?, ?)''', products)
    conn.commit()
    conn.close()

def insert_sample_recipes():
    conn = get_db()
    c = conn.cursor()
    recipes = [
        ("Aloo Paratha", '["aloo", "atta", "pyaaz", "hari mirch", "masale"]', "Mix mashed potatoes with spices, knead dough, stuff and cook on tawa", "https://youtu.be/F4I0MWxvQaA", "30 mins", "vegetarian"),
        ("Paneer Butter Masala", '["paneer", "tamatar", "pyaaz", "cream", "kaju", "masale"]', "Saute onion tomato, add spices, cook paneer in gravy", "https://youtu.be/x1Tg6wYq-Ww", "40 mins", "vegetarian"),
        ("Masala Dosa", '["dosa batter", "aloo", "pyaaz", "rai", "curry leaves"]', "Make dosa batter, prepare potato filling, cook on tawa", "https://youtu.be/ffClaNl0Z3g", "25 mins", "vegetarian"),
        ("Dal Makhani", '["urad dal", "rajma", "butter", "cream", "pyaaz", "tamatar"]', "Slow cook dal overnight, add butter and cream, simmer", "https://youtu.be/RALdVZRcUwo", "60 mins", "vegetarian"),
        ("Vegetable Biryani", '["basmati rice", "mix veg", "pyaaz", "tamatar", "biryani masala"]', "Layer rice and vegetables with masala, dum cook", "https://youtu.be/9nKbDvC0c3k", "45 mins", "vegetarian"),
        ("Chicken Curry", '["chicken", "pyaaz", "tamatar", "ginger", "garlic", "chicken masala"]', "Cook chicken with onion tomato gravy and spices.", "https://youtu.be/4VnOqjQf1EM", "45 mins", "nonveg"),
        ("Egg Curry", '["egg", "pyaaz", "tamatar", "coconut", "egg masala"]', "Boiled eggs cooked in spicy coconut gravy.", "https://youtu.be/21qntIjJh6g", "35 mins", "nonveg"),
        ("Fish Curry", '["rohu fish", "pyaaz", "tamatar", "coconut", "fish masala"]', "Fish cooked in spicy tamarind coconut gravy.", "https://youtu.be/0R9h-Q5IhUc", "40 mins", "nonveg"),
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
    product_id: int; quantity: int
class Post(BaseModel):
    recipe_name: str
    description: str
    community_id: Optional[int] = 1   # NEW field
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
def login(email: str = Form(...), password: str = Form(...)):
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
def get_recipes(diet: Optional[str] = None):
    conn = get_db(); c = conn.cursor()
    if diet:
        c.execute("SELECT * FROM recipes WHERE diet_type = ?", (diet,))
    else:
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
def add_order(order: Order, user_id: int = 1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT price FROM products WHERE id=?", (order.product_id,))
    p = c.fetchone()
    if not p: raise HTTPException(404)
    price = p[0]
    c.execute("INSERT INTO orders (user_id, product_id, quantity, price) VALUES (?,?,?,?)", 
              (user_id, order.product_id, order.quantity, price))
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

# ============ COMMUNITY APIS ============
@app.get("/api/communities")
def get_communities():
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM communities ORDER BY created_at DESC")
    comms = c.fetchall(); conn.close()
    return {"communities": [dict(c) for c in comms]}

@app.post("/api/communities")
def create_community(name: str, user_id: int = 1):
    if not name.strip():
        raise HTTPException(400, "Community name required")
    conn = get_db(); c = conn.cursor()
    try:
        c.execute("INSERT INTO communities (name, created_by) VALUES (?, ?)", (name.strip(), user_id))
        conn.commit()
        new_id = c.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(400, "Community name already exists")
    conn.close()
    return {"message": "Community created", "id": new_id}

@app.delete("/api/communities/{community_id}")
def delete_community(community_id: int, user_id: int = 1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM communities WHERE id = ?", (community_id,))
    if not c.fetchone():
        conn.close()
        raise HTTPException(404, "Community not found")
    c.execute("DELETE FROM community_posts WHERE community_id = ?", (community_id,))
    c.execute("DELETE FROM communities WHERE id = ?", (community_id,))
    conn.commit(); conn.close()
    return {"message": "Community deleted"}

# Modified posts endpoints to support community_id
@app.get("/api/posts")
def get_posts(community_id: Optional[int] = None):
    conn = get_db(); c = conn.cursor()
    if community_id:
        c.execute("SELECT * FROM community_posts WHERE community_id = ? ORDER BY likes DESC", (community_id,))
    else:
        c.execute("SELECT * FROM community_posts ORDER BY likes DESC")
    posts = c.fetchall(); conn.close()
    return {"posts": [dict(p) for p in posts]}

@app.post("/api/posts")
def add_post(post: Post, user_id: int = 1):
    conn = get_db(); c = conn.cursor()
    c.execute("INSERT INTO community_posts (user_id, recipe_name, description, community_id) VALUES (?,?,?,?)",
              (user_id, post.recipe_name, post.description, post.community_id))
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

# ============ AI DIET PLANNER APIS ============
# Recipe Database for Diet Planner
DIET_RECIPES = {
    "vegetarian": {
        "lose weight": {
            "breakfast": {"name": "Oats Upma", "cost": 30, "time": 15, "calories": 250, "ingredients": ["oats", "vegetables", "spices"]},
            "lunch": {"name": "Quinoa Salad", "cost": 50, "time": 20, "calories": 350, "ingredients": ["quinoa", "cucumber", "tomato", "lemon"]},
            "dinner": {"name": "Soup & Brown Rice", "cost": 40, "time": 25, "calories": 300, "ingredients": ["brown rice", "mixed soup veggies"]}
        },
        "gain muscle": {
            "breakfast": {"name": "Protein Smoothie", "cost": 80, "time": 10, "calories": 400, "ingredients": ["protein powder", "banana", "peanut butter"]},
            "lunch": {"name": "Chole + Rice", "cost": 70, "time": 35, "calories": 550, "ingredients": ["chickpeas", "rice", "onion", "tomato"]},
            "dinner": {"name": "Mushroom Curry", "cost": 80, "time": 30, "calories": 500, "ingredients": ["mushroom", "cream", "spices"]}
        }
    },
    "non-vegetarian": {
        "lose weight": {
            "breakfast": {"name": "Egg White Omelette", "cost": 40, "time": 10, "calories": 200, "ingredients": ["egg whites", "spinach", "salt"]},
            "lunch": {"name": "Grilled Chicken Salad", "cost": 90, "time": 25, "calories": 350, "ingredients": ["chicken breast", "lettuce", "olive oil"]},
            "dinner": {"name": "Fish Stew", "cost": 110, "time": 30, "calories": 300, "ingredients": ["fish fillet", "tomato", "garlic"]}
        },
        "gain muscle": {
            "breakfast": {"name": "Chicken Omelette", "cost": 80, "time": 20, "calories": 500, "ingredients": ["chicken mince", "eggs", "cheese"]},
            "lunch": {"name": "Egg Curry + Rice", "cost": 70, "time": 30, "calories": 550, "ingredients": ["eggs", "rice", "curry leaves"]},
            "dinner": {"name": "Chicken Breast + Veggies", "cost": 120, "time": 25, "calories": 600, "ingredients": ["chicken", "broccoli", "butter"]}
        }
    }
}

@app.post("/api/diet/plan")
async def generate_diet_plan(request: dict):
    diet_type = request.get("diet_type", "vegetarian")
    goal = request.get("goal", "lose weight")
    weekly_budget = request.get("weekly_budget", 1000)
    duration_days = request.get("duration_days", 7)
    calorie_target = request.get("calorie_target", 0)
    
    # Get base meal plan
    if diet_type in DIET_RECIPES and goal in DIET_RECIPES[diet_type]:
        meals = DIET_RECIPES[diet_type][goal]
    else:
        meals = DIET_RECIPES["vegetarian"]["lose weight"]
    
    # Calculate costs
    daily_cost = meals["breakfast"]["cost"] + meals["lunch"]["cost"] + meals["dinner"]["cost"]
    total_cost = daily_cost * duration_days
    weekly_budget_needed = (total_cost / duration_days) * 7
    
    # Generate daily plan (first 7 days only)
    daily_plans = []
    for day in range(min(duration_days, 7)):
        daily_plans.append({
            "day": day + 1,
            "date": (datetime.now() + timedelta(days=day)).strftime("%A, %d %B"),
            "breakfast": meals["breakfast"],
            "lunch": meals["lunch"],
            "dinner": meals["dinner"]
        })
    
    # Shopping list
    all_ingredients = []
    for meal in meals.values():
        all_ingredients.extend(meal["ingredients"])
    shopping_list = sorted(list(set(all_ingredients)))
    
    # Tips
    tips = []
    if goal == "lose weight":
        tips.append("🥗 Eat protein-rich breakfast to avoid cravings")
        tips.append("💧 Drink 2-3 liters of water daily")
        tips.append("🚶 Walk 10,000 steps daily for better results")
    else:
        tips.append("💪 Eat within 1 hour after workout")
        tips.append("🥚 Add 1 extra protein source to each meal")
        tips.append("😴 Sleep 7-8 hours for muscle recovery")
    
    if weekly_budget_needed > weekly_budget:
        tips.append(f"💰 Your plan costs ₹{weekly_budget_needed:.0f}/week. Try buying seasonal vegetables to save 20%")
    else:
        tips.append(f"✅ You're within budget! Save ₹{weekly_budget - weekly_budget_needed:.0f} for healthy snacks")
    
    return {
        "success": True,
        "plan": {
            "daily_meals": daily_plans,
            "summary": {
                "daily_cost": daily_cost,
                "total_cost": total_cost,
                "weekly_budget_needed": round(weekly_budget_needed, 2),
                "within_budget": weekly_budget_needed <= weekly_budget,
                "average_daily_calories": (meals["breakfast"]["calories"] + meals["lunch"]["calories"] + meals["dinner"]["calories"]) // 3
            },
            "shopping_list": shopping_list[:15],
            "tips": tips
        }
    }

@app.get("/api/diet/preferences")
def get_diet_preferences(user_id: int = 1):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT diet_pref FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    conn.close()
    return {"diet_pref": user["diet_pref"] if user else "vegetarian"}

@app.post("/api/diet/preferences")
def save_diet_preferences(pref: dict, user_id: int = 1):
    diet_pref = pref.get("diet_pref", "vegetarian")
    conn = get_db(); c = conn.cursor()
    c.execute("UPDATE users SET diet_pref = ? WHERE id = ?", (diet_pref, user_id))
    conn.commit(); conn.close()
    return {"message": "Preferences saved"}