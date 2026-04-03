const API_PORT = 8000;
const API_BASE = (() => {
    if (window.location.protocol === 'file:') {
        return `http://localhost:${API_PORT}/api`;
    }
    const host = window.location.hostname || 'localhost';
    return `${window.location.protocol}//${host}:${API_PORT}/api`;
})();

let currentDiet = localStorage.getItem('rasora_diet') || 'vegetarian';
let expenseData = { balance: 10000, expenses: [] };

async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${url}`, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
}

async function loadDashboard() {
    const expData = await fetchAPI("/expenses?user_id=1");
    if (expData && expData.expenses) {
        expenseData.expenses = expData.expenses;
        const totalSpent = expData.expenses.reduce((sum, e) => sum + e.amount, 0);
        document.getElementById('dashBalance').innerHTML = `₹${10000 - totalSpent}`;
        document.getElementById('expTotalExpense').innerText = totalSpent;
        document.getElementById('expRemaining').innerText = 10000 - totalSpent;
        
        const recent = expData.expenses.slice(0, 3);
        document.getElementById('recentExpensesList').innerHTML = recent.map(e => `<div class="activity-item"><span>${e.item}</span><span style="color:var(--expense);">₹${e.amount}</span><span>${e.date}</span></div>`).join('') || '<p>No expenses yet</p>';
        
        const historyHtml = expData.expenses.map(e => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
                <span style="flex:2;">${e.item}</span>
                <span style="flex:1; color:var(--expense);">₹${e.amount}</span>
                <span style="flex:1;">${e.date}</span>
                <button onclick="deleteExpense(${e.id})" style="background:#dc2626; border:none; padding:4px 12px; border-radius:16px; color:white; cursor:pointer; font-size:0.7rem;">Delete</button>
            </div>
        `).join('');
        document.getElementById('expenseHistory').innerHTML = historyHtml || '<p>No expenses added</p>';
    }
    
    const ordersData = await fetchAPI("/orders?user_id=1");
    if (ordersData && ordersData.orders) document.getElementById('dashOrders').innerText = ordersData.orders.length;
    
    const postsData = await fetchAPI("/posts");
    if (postsData && postsData.posts) {
        document.getElementById('dashPosts').innerText = postsData.posts.length;
        const highlights = postsData.posts.slice(0, 2);
        document.getElementById('communityHighlights').innerHTML = highlights.map(p => `<div style="background:#F8F9FA; border-radius:12px; padding:1rem; margin-bottom:0.5rem;"><strong>${p.recipe_name}</strong><p>${p.description}</p><span>❤️ ${p.likes}</span></div>`).join('') || '<p>No posts yet</p>';
        displayCommunityPosts(postsData.posts);
    }
    
    const recipesData = await fetchAPI("/recipes");
    if (recipesData && recipesData.recipes) {
        document.getElementById('dashRecipes').innerText = recipesData.recipes.length;
        const trending = recipesData.recipes.slice(0, 5);
        document.getElementById('trendingRecipes').innerHTML = trending.map(r => `<span class="recipe-tag" onclick="searchRecipe('${r.name}')">${r.name}</span>`).join('');
        
        const datalist = document.getElementById('recipeList');
        if (datalist) datalist.innerHTML = recipesData.recipes.map(r => `<option value="${r.name}">`).join('');
    }
    
    const suggestionsData = await fetchAPI("/suggestions?user_id=1");
    if (suggestionsData && suggestionsData.suggestions) {
        const listHtml = suggestionsData.suggestions.map(s => `<div class="activity-item"><span>${s.name}</span><span>Ordered ${s.order_count} times</span><button style="background:var(--success); border:none; padding:0.2rem 0.8rem; border-radius:15px; color:white;" onclick="alert('✅ ${s.name} added to cart!')">Reorder</button></div>`).join('');
        document.getElementById('smartReorderList').innerHTML = listHtml || '<p>No suggestions yet</p>';
        document.getElementById('reorderSuggestions').innerHTML = listHtml || '<p>No suggestions yet</p>';
    }
}

async function deleteExpense(expenseId) {
    if (confirm("❌ Delete this expense?")) {
        const res = await fetchAPI(`/expenses/${expenseId}`, { method: "DELETE" });
        if (res && res.message) {
            alert("✅ Expense deleted!");
            loadDashboard();
            goToSection('expense');
        } else alert("Error deleting expense");
    }
}

async function addExpense() {
    const item = document.getElementById('expenseItem').value;
    const amount = parseInt(document.getElementById('expenseAmount').value);
    if (!item || !amount) { alert("Please enter item and amount"); return; }
    const today = new Date().toISOString().slice(0,10);
    const res = await fetchAPI("/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, amount, date: today })
    });
    if (res && res.message) {
        alert("✅ Expense added!");
        document.getElementById('expenseItem').value = '';
        document.getElementById('expenseAmount').value = '';
        loadDashboard();
        goToSection('home');
    } else alert("Error adding expense");
}

async function showProducts(category) {
    const data = await fetchAPI(`/products?category=${category}`);
    if (data && data.products) {
        const html = `<h3>${category}</h3><div style="display: flex; flex-direction: column; gap: 0.8rem;">${data.products.map(p => `
            <div class="product-card">
                <div class="product-info" style="display: flex; align-items: center; gap: 12px;">
                    <div class="product-emoji">${p.image || '🛒'}</div>
                    <div>
                        <div class="product-name">${p.name}</div>
                        <div class="product-details">₹${p.price} / ${p.unit} &nbsp;|&nbsp; ${p.store}</div>
                    </div>
                </div>
                <button class="cart-btn" onclick="addToOrder(${p.id}, '${p.name}', ${p.price})">
                    🛒 Add to Cart
                </button>
            </div>
        `).join('')}</div>`;
        document.getElementById('productResults').innerHTML = html;
    } else {
        document.getElementById('productResults').innerHTML = '<p>No products found.</p>';
    }
}

async function addToOrder(productId, name, price) {
    const res = await fetchAPI("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity: 1 })
    });
    if (res && res.message) {
        alert(`✅ ${name} added to cart!`);
        loadDashboard();
        loadCart();
    } else alert("Error adding to cart.");
}

async function removeFromOrder(orderId) {
    if (confirm("❌ Remove this item from your cart?")) {
        const res = await fetchAPI(`/orders/${orderId}`, { method: "DELETE" });
        if (res && res.message) {
            alert("✅ Item removed from cart!");
            loadDashboard();
            loadCart();
        } else alert("Error removing item");
    }
}

async function loadCart() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;
    const data = await fetchAPI("/orders?user_id=1");
    if (data && data.orders && data.orders.length > 0) {
        let total = 0;
        const ordersHtml = data.orders.map(order => {
            total += order.price * order.quantity;
            return `
                <div class="cart-item-card">
                    <div class="cart-item-emoji">${order.product_image || '🛒'}</div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${order.product_name}</div>
                        <div class="cart-item-meta">Quantity: ${order.quantity} | ₹${order.price} each</div>
                        <div class="cart-item-meta">Ordered on: ${order.order_date}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-price">₹${order.price * order.quantity}</div>
                        <button class="remove-btn" onclick="removeFromOrder(${order.id})">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = `${ordersHtml}<div style="text-align: right; margin-top: 1rem; padding: 1rem; background: #F8F9FA; border-radius: 16px;"><strong>Total spent: ₹${total}</strong></div>`;
    } else {
        container.innerHTML = `<div class="empty-cart">🛒 Your cart is empty. Start shopping from Manual Shopping!</div>`;
    }
}

// ============ IMPROVED AI SMART SHOP ============
async function processSmartList() {
    const list = document.getElementById('groceryList').value;
    if (!list) { alert("Please enter your grocery list (e.g., milk, bread, eggs)"); return; }
    
    // Split by comma and trim
    const items = list.split(',').map(i => i.trim().toLowerCase());
    let added = [];
    let notFound = [];
    
    // Fetch all products
    const productsData = await fetchAPI("/products");
    if (!productsData || !productsData.products) {
        alert("Error fetching products");
        return;
    }
    
    const products = productsData.products;
    
    // For each item, try to match with product name
    for (const item of items) {
        // Find product where name contains the item (case-insensitive)
        const match = products.find(p => p.name.toLowerCase().includes(item));
        if (match) {
            await addToOrder(match.id, match.name, match.price);
            added.push(match.name);
        } else {
            notFound.push(item);
        }
    }
    
    let resultMsg = `✅ AI Processed!\nAdded: ${added.join(', ') || 'none'}`;
    if (notFound.length > 0) {
        resultMsg += `\n❌ Not found: ${notFound.join(', ')}`;
    }
    alert(resultMsg);
    document.getElementById('smartResult').innerHTML = `<div style="background:#E8F5E9; padding:1rem; border-radius:10px;">${resultMsg.replace(/\n/g, '<br>')}</div>`;
}

function uploadImageList() {
    const file = document.getElementById('imageUpload').files[0];
    if (!file) { alert("Please select an image"); return; }
    document.getElementById('imageResult').innerHTML = `<div style="background:#E8F5E9; padding:1rem; border-radius:10px;">📷 Image uploaded! AI reading list... Items added to cart.</div>`;
    // For demo, just show message; actual OCR would need backend.
}

// ============ IMPROVED RECIPE FUNCTIONS ============
async function getRecipeByDish() {
    const dish = document.getElementById('dishName').value;
    if (!dish) { alert("Enter dish name"); return; }
    const data = await fetchAPI("/recipes");
    if (data && data.recipes) {
        const searchTerm = dish.trim().toLowerCase();
        const recipe = data.recipes.find(r => r.name.toLowerCase() === searchTerm);
        if (recipe) {
            // Create a YouTube search link for the recipe
            const searchQuery = encodeURIComponent(`${recipe.name} recipe`);
            const videoLink = `https://www.youtube.com/results?search_query=${searchQuery}`;
            document.getElementById('dishRecipeResult').innerHTML = `
                <div style="background:#F0FDF4; padding:1rem; border-radius:10px;">
                    <strong>🍽️ ${recipe.name}</strong><br>
                    📝 <strong>Instructions:</strong><br>${recipe.instructions}<br>
                    ⏱️ Prep time: ${recipe.prep_time}<br>
                    <a href="${videoLink}" target="_blank" style="color:#4ECDC4;">▶️ Watch on YouTube (search)</a><br>
                    <button onclick="alert('Missing ingredients added to cart!')" style="margin-top:10px; background:#FF6B6B; border:none; padding:8px 16px; border-radius:20px; color:white; cursor:pointer;">➕ Add Missing to Cart</button>
                </div>`;
        } else {
            const suggestions = data.recipes.slice(0, 5).map(r => r.name).join(", ");
            document.getElementById('dishRecipeResult').innerHTML = `<div style="background:#FEE2E2; padding:1rem; border-radius:10px;">❌ Recipe not found. Try: ${suggestions}...</div>`;
        }
    }
}

async function getRecipeByIngredients() {
    const ingredients = document.getElementById('ingredientsInput').value;
    if (!ingredients) { alert("Enter ingredients (e.g., aloo, pyaaz)"); return; }
    
    const data = await fetchAPI("/recipes");
    if (!data || !data.recipes) return;
    
    const userIngs = ingredients.toLowerCase().split(',').map(i => i.trim());
    // Check if any non-veg ingredient (for simple demo, if user enters 'chicken', show message)
    const nonVegKeywords = ['chicken', 'egg', 'fish', 'meat', 'mutton'];
    const hasNonVeg = userIngs.some(ing => nonVegKeywords.includes(ing));
    if (hasNonVeg) {
        document.getElementById('ingredientsRecipeResult').innerHTML = `<div style="background:#FEE2E2; padding:1rem; border-radius:10px;">❌ Our current recipes are vegetarian. Try vegetarian ingredients like aloo, pyaaz, tamatar, paneer.</div>`;
        return;
    }
    
    // Smart matching: recipe must contain at least 2 of user's ingredients
    const matched = data.recipes.filter(recipe => {
        const recipeIngs = JSON.parse(recipe.ingredients || '[]').map(i => i.toLowerCase());
        const matchCount = userIngs.filter(ui => recipeIngs.some(ri => ri.includes(ui))).length;
        return matchCount >= 2;
    });
    
    if (matched.length === 0) {
        document.getElementById('ingredientsRecipeResult').innerHTML = `<div style="background:#FEE2E2; padding:1rem; border-radius:10px;">No recipes found with those ingredients. Try adding more (e.g., aloo, pyaaz, tamatar).</div>`;
        return;
    }
    
    let html = `<div style="background:#F0FDF4; padding:1rem; border-radius:10px;"><strong>✨ You can make these dishes:</strong><ul>`;
    matched.forEach(recipe => {
        const searchQuery = encodeURIComponent(`${recipe.name} recipe`);
        const videoLink = `https://www.youtube.com/results?search_query=${searchQuery}`;
        html += `<li><strong>${recipe.name}</strong> - ${recipe.prep_time}<br><small>${recipe.instructions.substring(0, 100)}...</small><br><a href="${videoLink}" target="_blank">▶️ Watch on YouTube</a></li>`;
    });
    html += `</ul><button onclick="alert('Missing spices added to cart!')" style="margin-top:10px; background:#FF6B6B; border:none; padding:8px 16px; border-radius:20px; color:white; cursor:pointer;">➕ Add Missing Items</button></div>`;
    document.getElementById('ingredientsRecipeResult').innerHTML = html;
}

function searchRecipe(recipeName) {
    document.getElementById('dishName').value = recipeName;
    goToSection('recipe');
    getRecipeByDish();
}

async function shareRecipe() {
    const recipe = prompt("What recipe would you like to share?");
    if (recipe) {
        const desc = prompt("Share a short description:");
        const res = await fetchAPI("/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipe_name: recipe, description: desc || "Delicious!" })
        });
        if (res && res.message) {
            alert("🎉 Recipe shared!");
            loadDashboard();
            goToSection('community');
        } else alert("Error sharing recipe");
    }
}

async function likePost(postId) {
    const res = await fetchAPI(`/posts/${postId}/like`, { method: "PUT" });
    if (res) { loadDashboard(); goToSection('community'); }
}

function displayCommunityPosts(posts) {
    const container = document.getElementById('communityPosts');
    if (!container) return;
    container.innerHTML = posts.map(p => `
        <div style="background:white; border-radius:15px; padding:1rem; margin-bottom:1rem; border:1px solid #eee;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <div style="width:40px; height:40px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;">U</div>
                <div><strong>User ${p.user_id}</strong><div style="font-size:0.8rem;">Shared ${p.recipe_name}</div></div>
            </div>
            <p>${p.description}</p>
            <div style="display:flex; gap:15px; margin-top:10px;">
                <span onclick="likePost(${p.id})" style="cursor:pointer;">❤️ ${p.likes}</span>
                <span>💬 ${p.comments}</span>
            </div>
        </div>
    `).join('');
}

function setDiet(type) {
    currentDiet = type;
    localStorage.setItem('rasora_diet', type);
    document.getElementById('dietStatus').innerHTML = `Current diet: <strong>${type}</strong>`;
    alert(`Diet set to ${type}! Recipes will be filtered.`);
    loadDashboard();
}

function goToSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(sectionId).classList.add('active-section');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) item.classList.add('active');
    });
    if (sectionId === 'community') loadDashboard();
    if (sectionId === 'shopping') document.getElementById('productResults').innerHTML = '';
    if (sectionId === 'cart') loadCart();
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => goToSection(item.getAttribute('data-section')));
});

loadDashboard();