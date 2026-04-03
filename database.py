import sqlite3
import json

DB_NAME = "rasora.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, email TEXT UNIQUE, password TEXT,
        diet_pref TEXT DEFAULT 'vegetarian',
        created_at DATE DEFAULT CURRENT_DATE
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, category TEXT, price INTEGER,
        unit TEXT, store TEXT, image TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, product_id INTEGER,
        quantity INTEGER DEFAULT 1, price INTEGER,
        order_date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'pending'
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, item TEXT, amount INTEGER,
        date DATE DEFAULT CURRENT_DATE
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ingredients TEXT,
        instructions TEXT,
        video_url TEXT,
        prep_time TEXT,
        diet_type TEXT DEFAULT 'vegetarian'
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, recipe_name TEXT,
        description TEXT, likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        created_at DATE DEFAULT CURRENT_DATE
    )''')
    
    conn.commit()
    conn.close()
    print("✅ Tables created")

def insert_sample_products():
    conn = get_db()
    cursor = conn.cursor()
    products = [
        ("Fresh Milk 1L", "Dairy", 55, "1L", "Zepto", "🥛"),
        ("Amul Milk 1L", "Dairy", 60, "1L", "Blinkit", "🥛"),
        ("Brown Bread", "Bakery", 40, "400g", "Blinkit", "🍞"),
        ("Paneer 200g", "Dairy", 70, "200g", "Local", "🧀"),
        ("Eggs 6pcs", "Dairy", 45, "6pcs", "Instamart", "🥚"),
        ("Tomato 500g", "Vegetables", 30, "500g", "BigBasket", "🍅"),
        ("Onion 500g", "Vegetables", 25, "500g", "Local", "🧅"),
        ("Potato 500g", "Vegetables", 20, "500g", "Zepto", "🥔"),
        ("Apple 1kg", "Fruits", 120, "1kg", "Blinkit", "🍎"),
        ("Banana 6pcs", "Fruits", 40, "6pcs", "Local", "🍌"),
    ]
    cursor.executemany("INSERT OR IGNORE INTO products (name, category, price, unit, store, image) VALUES (?,?,?,?,?,?)", products)
    conn.commit()
    conn.close()
    print("✅ Products inserted")

def insert_sample_recipes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM recipes")
    
    recipes_data = [
        ("Aloo Paratha", json.dumps(["aloo","atta","pyaaz","mirch","masala"]), "Mix mashed potatoes with spices, knead dough, stuff and cook on tawa.", "https://youtu.be/F4I0MWxvQaA", "30 mins", "vegetarian"),
        ("Paneer Butter Masala", json.dumps(["paneer","tamatar","pyaaz","cream","kaju","masala"]), "Saute onion tomato, add spices, cook paneer in gravy.", "https://youtu.be/x1Tg6wYq-Ww", "40 mins", "vegetarian"),
        ("Shahi Paneer", json.dumps(["paneer","tamatar","pyaaz","cream","kaju","masala"]), "Rich creamy gravy with paneer, garnish with nuts.", "https://youtu.be/PjDc4BPozGg", "45 mins", "vegetarian"),
        ("Kadai Paneer", json.dumps(["paneer","capsicum","pyaaz","tamatar","kadai masala"]), "Cook paneer with capsicum and onion in kadai masala.", "https://youtu.be/8JHmbqOvrBQ", "35 mins", "vegetarian"),
        ("Matar Paneer", json.dumps(["paneer","matar","pyaaz","tamatar","masala"]), "Green peas and paneer in tomato onion gravy.", "https://youtu.be/W5LciJs5LVs", "30 mins", "vegetarian"),
        ("Palak Paneer", json.dumps(["paneer","palak","pyaaz","tamatar","garlic","masala"]), "Blanch spinach, puree, cook with spices and paneer.", "https://youtu.be/6cL5aYpBq7Y", "35 mins", "vegetarian"),
        ("Malai Kofta", json.dumps(["aloo","paneer","malai","kaju","tamatar","pyaaz"]), "Make kofta balls, prepare creamy gravy, combine.", "https://youtu.be/PeXk3qx5DY0", "50 mins", "vegetarian"),
        ("Dal Makhani", json.dumps(["urad dal","rajma","butter","cream","pyaaz","tamatar"]), "Slow cook dal overnight, add butter and cream, simmer.", "https://youtu.be/RALdVZRcUwo", "60 mins", "vegetarian"),
        ("Chole Bhature", json.dumps(["chole","atta","pyaaz","tamatar","chole masala"]), "Pressure cook chole, prepare masala, make bhature dough and fry.", "https://youtu.be/FHGhE2bW8HI", "45 mins", "vegetarian"),
        ("Rajma Chawal", json.dumps(["rajma","pyaaz","tamatar","ginger","garlic","rajma masala"]), "Pressure cook rajma, prepare masala, serve with rice.", "https://youtu.be/82z_L2HnqLo", "50 mins", "vegetarian"),
        ("Aloo Gobi", json.dumps(["aloo","gobi","pyaaz","tamatar","haldi","dhaniya","mirch"]), "Stir fry potato and cauliflower with spices.", "https://youtu.be/7wO6zQq0V9U", "30 mins", "vegetarian"),
        ("Bhindi Masala", json.dumps(["bhindi","pyaaz","tamatar","amchur","masala"]), "Stir fry okra with onion and spices.", "https://youtu.be/mIU02jUoWLE", "25 mins", "vegetarian"),
        ("Baingan Bharta", json.dumps(["baingan","pyaaz","tamatar","garlic","hari mirch","dhaniya"]), "Roast eggplant, mash and cook with spices.", "https://youtu.be/nJ0PJf6CviU", "35 mins", "vegetarian"),
        ("Mix Veg Curry", json.dumps(["gobi","aloo","matar","gajar","capsicum","pyaaz","tamatar"]), "Mixed vegetables in onion tomato gravy.", "https://youtu.be/8XGjkI25qLE", "35 mins", "vegetarian"),
        ("Mushroom Masala", json.dumps(["mushroom","pyaaz","tamatar","capsicum","cream","masala"]), "Mushroom cooked in spicy masala gravy.", "https://youtu.be/rRc3ZtxxlYs", "30 mins", "vegetarian"),
        ("Masala Dosa", json.dumps(["dosa batter","aloo","pyaaz","rai","curry leaves"]), "Make dosa batter, prepare potato filling, cook on tawa.", "https://youtu.be/ffClaNl0Z3g", "25 mins", "vegetarian"),
        ("Idli Sambhar", json.dumps(["idli batter","urad dal","sabji","tamatar","sambhar masala"]), "Steamed idli with lentil vegetable stew.", "https://youtu.be/cjIx3gBMS1A", "30 mins", "vegetarian"),
        ("Pav Bhaji", json.dumps(["mix veg","pav","butter","pav bhaji masala","pyaaz"]), "Boil and mash vegetables, cook with masala, serve with butter pav.", "https://youtu.be/4VnOqjQf1EM", "35 mins", "vegetarian"),
        ("Vegetable Biryani", json.dumps(["basmati rice","mix veg","pyaaz","tamatar","biryani masala"]), "Layer rice and vegetables with masala, dum cook.", "https://youtu.be/9nKbDvC0c3k", "45 mins", "vegetarian"),
        ("Gobi Manchurian", json.dumps(["gobi","maida","cornflour","soy sauce","chilli sauce"]), "Cauliflower florets fried and tossed in manchurian sauce.", "https://youtu.be/_c9N0I8qxP8", "30 mins", "vegetarian"),
        ("Veg Hakka Noodles", json.dumps(["noodles","cabbage","carrot","capsicum","spring onion","soy sauce"]), "Stir fry boiled noodles with vegetables and sauces.", "https://youtu.be/hCqtM7OvVmg", "25 mins", "vegetarian"),
        ("Veg Fried Rice", json.dumps(["rice","carrot","beans","capsicum","spring onion","soy sauce"]), "Stir fry rice with vegetables and sauces.", "https://youtu.be/uT_DwK-7y48", "20 mins", "vegetarian"),
        ("Paneer Tikka", json.dumps(["paneer","curd","tikka masala","capsicum","onion"]), "Marinated paneer and veggies grilled.", "https://youtu.be/HPfLPH0n1W4", "35 mins", "vegetarian"),
        ("Tomato Soup", json.dumps(["tamatar","pyaaz","garlic","butter","cream"]), "Blend tomatoes, cook with spices, add cream.", "https://youtu.be/J79Vz6YvdlA", "20 mins", "vegetarian"),
        ("Sweet Corn Soup", json.dumps(["sweet corn","spring onion","cornflour","pepper","soy sauce"]), "Creamy soup with sweet corn and vegetables.", "https://youtu.be/SvJfPMoYj-o", "20 mins", "vegetarian"),
        ("Upma", json.dumps(["rava","onion","vegetables","mustard seeds","curry leaves","peanuts"]), "Savory semolina porridge.", "https://youtu.be/7H1Mp1jqYgc", "20 mins", "vegetarian"),
        ("Poha", json.dumps(["poha","onion","potato","peanuts","mustard seeds","curry leaves","lemon"]), "Flattened rice cooked with spices and veggies.", "https://youtu.be/9rHZJmH6I8M", "20 mins", "vegetarian"),
        ("Dhokla", json.dumps(["besan","curd","fruit salt","mustard seeds","curry leaves","green chilli"]), "Steamed savory chickpea cake.", "https://youtu.be/RdCK5fOv8_Y", "30 mins", "vegetarian"),
        ("Thepla", json.dumps(["whole wheat flour","fenugreek leaves","curd","spices"]), "Soft spiced flatbread perfect for travel.", "https://youtu.be/A5pOQJdIrhw", "30 mins", "vegetarian"),
        ("Undhiyu", json.dumps(["surati papdi","eggplant","potato","raw banana","coconut","spices"]), "Mixed winter vegetable curry, slow cooked.", "https://youtu.be/3jYwE8T2qOU", "60 mins", "vegetarian"),
        ("Dal Baati Churma", json.dumps(["urad dal","chana dal","whole wheat flour","ghee","jaggery"]), "Three part Rajasthani meal: dal, baked dough balls, sweet crumble.", "https://youtu.be/z6JXaNqJq9c", "60 mins", "vegetarian"),
        ("Khichdi", json.dumps(["rice","moong dal","ghee","jeera","haldi","vegetables"]), "Comforting rice and lentil porridge.", "https://youtu.be/8M5qgqCwXTI", "30 mins", "vegetarian"),
        ("Uttapam", json.dumps(["dosa batter","onion","tomato","capsicum","coriander"]), "Thick pancake with vegetable toppings.", "https://youtu.be/rQ9hLdHZJNQ", "25 mins", "vegetarian"),
        ("Medu Vada", json.dumps(["urad dal","rice flour","curry leaves","onion","spices"]), "Deep fried lentil donuts, crispy outside soft inside.", "https://youtu.be/21qntIjJh6g", "30 mins", "vegetarian"),
        ("Rava Dosa", json.dumps(["rava","rice flour","curry leaves","onion","coriander"]), "Crispy semolina crepe, no fermentation needed.", "https://youtu.be/Lv7hxer1n1M", "20 mins", "vegetarian"),
        ("Lemon Rice", json.dumps(["rice","lemon","mustard seeds","peanuts","curry leaves","turmeric"]), "Tangy rice with lemon and tempering.", "https://youtu.be/0R9h-Q5IhUc", "20 mins", "vegetarian"),
        ("Curd Rice", json.dumps(["rice","curd","carrot","cucumber","pomegranate","mustard seeds"]), "Soothing rice with yogurt and veggies.", "https://youtu.be/P4vBfyEkrOQ", "15 mins", "vegetarian"),
        ("Bisibele Bath", json.dumps(["rice","toor dal","mix veg","bisibele bath masala","tamarind"]), "Spicy lentil rice one pot meal.", "https://youtu.be/q7hXaOW0sVI", "45 mins", "vegetarian"),
        ("Pongal", json.dumps(["rice","moong dal","ghee","pepper","cumin","cashew"]), "Comforting rice and lentil porridge.", "https://youtu.be/zsVQc2_sB78", "35 mins", "vegetarian"),
        ("Spring Rolls", json.dumps(["cabbage","carrot","capsicum","noodles","spring roll sheets"]), "Stuffed vegetable rolls, deep fried.", "https://youtu.be/VO-t6a0ZJHU", "30 mins", "vegetarian"),
        ("Hara Bhara Kabab", json.dumps(["spinach","peas","potato","bread crumbs","spices"]), "Green veggie patties shallow fried.", "https://youtu.be/IRk4UklBcPE", "30 mins", "vegetarian"),
        ("Onion Rings", json.dumps(["onion","maida","cornflour","bread crumbs","spices"]), "Onion slices coated and deep fried.", "https://youtu.be/2A1wOaK9qP4", "20 mins", "vegetarian"),
        ("Cheese Balls", json.dumps(["potato","cheese","bread crumbs","cornflour","spices"]), "Potato cheese balls deep fried.", "https://youtu.be/u0L4_t6jEfQ", "20 mins", "vegetarian"),
        ("Masala Papad", json.dumps(["papad","onion","tomato","coriander","chaat masala","lemon"]), "Papad topped with chopped veggies and spices.", "https://youtu.be/Byb1XKmrJmE", "10 mins", "vegetarian"),
        ("Veg Manchow Soup", json.dumps(["cabbage","carrot","beans","mushroom","soy sauce","chilli sauce"]), "Spicy thick soup with crispy noodles.", "https://youtu.be/8QhY4iYkYqE", "25 mins", "vegetarian"),
        ("Sabudana Khichdi", json.dumps(["sabudana","peanut","potato","green chilli","lemon"]), "Tapioca pearls stir fried with peanuts and spices.", "https://youtu.be/0dYjPpXPaZg", "25 mins", "vegetarian"),
        ("Khandvi", json.dumps(["besan","curd","ginger paste","mustard seeds","coconut"]), "Rolled chickpea flour snack with tempering.", "https://youtu.be/QpPGS4hOO0U", "40 mins", "vegetarian"),
        ("Handvo", json.dumps(["rice","chana dal","urad dal","bottle gourd","curd","spices"]), "Savory baked lentil and vegetable cake.", "https://youtu.be/Db3XFLJuIBY", "50 mins", "vegetarian"),
        ("Dal Dhokli", json.dumps(["toor dal","whole wheat flour","spices","jaggery","tamarind"]), "Spicy lentil stew with wheat dumplings.", "https://youtu.be/wQMN5KJdRHA", "45 mins", "vegetarian"),
        ("Gatte ki Sabzi", json.dumps(["besan","curd","spices","coriander"]), "Gram flour dumplings in spicy yogurt gravy.", "https://youtu.be/0VyLbSgAfrY", "40 mins", "vegetarian"),
        ("Butter Chicken (Veg)", json.dumps(["soya chaap","butter","cream","tomato","cashew","spices"]), "Creamy tomato gravy with soya chaap.", "https://youtu.be/UMvXLuKs3R8", "40 mins", "vegetarian"),
    ]
    
    cursor.executemany("INSERT INTO recipes (name, ingredients, instructions, video_url, prep_time, diet_type) VALUES (?,?,?,?,?,?)", recipes_data)
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM recipes")
    count = cursor.fetchone()[0]
    conn.close()
    print(f"✅ {count} recipes inserted")

if __name__ == "__main__":
    create_tables()
    insert_sample_products()
    insert_sample_recipes()
    print("🎉 Setup complete")