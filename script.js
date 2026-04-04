const API_BASE = "http://localhost:8000/api";
const BASE_BUDGET = 10000;
let currentDiet = localStorage.getItem('rasora_diet') || 'veg';
let currentBudget = Number(localStorage.getItem('rasora_budget') || BASE_BUDGET);
let currentCommunityId = null;
let allCommunities = [];

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('rasora_user') || '{}');
    } catch (_e) {
        return {};
    }
}
function getCurrentUserId() {
    const user = getCurrentUser();
    return user && user.id ? user.id : 1;
}

function formatMoney(amount) {
    return `₹${amount.toLocaleString('en-IN')}`;
}

function updateBudget() {
    const value = Number(document.getElementById('expBudgetInput').value);
    if (isNaN(value) || value < 0) {
        alert('Please enter a valid budget amount');
        return;
    }
    currentBudget = value;
    localStorage.setItem('rasora_budget', String(currentBudget));
    loadDashboard();
    alert('Budget updated to ' + formatMoney(currentBudget));
}

// Check login
if (!localStorage.getItem('rasora_logged_in')) {
    window.location.href = 'signup.html';
}

function logout() {
    localStorage.removeItem('rasora_logged_in');
    localStorage.removeItem('rasora_user');
    window.location.href = 'signup.html';
}

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

// Dashboard
async function loadDashboard() {
    try {
        const userId = getCurrentUserId();
        const expData = await fetchAPI(`/expenses?user_id=${userId}`);
        if (expData && expData.expenses) {
            const totalSpent = expData.expenses.reduce((s,e)=>s+e.amount,0);
            const remaining = Math.max(currentBudget - totalSpent, 0);
            document.getElementById('dashBalance').innerHTML = formatMoney(remaining);
            document.getElementById('expTotalExpense').innerText = totalSpent;
            document.getElementById('expTotalBudget').innerText = currentBudget;
            document.getElementById('expRemaining').innerText = remaining;
            document.getElementById('expBudgetInput').value = currentBudget;

            const recent = expData.expenses.slice(0,3);
            document.getElementById('recentExpensesList').innerHTML = recent.map(e=>`<div class="activity-item"><span>${e.item}</span><span>₹${e.amount}</span><span>${e.date}</span></div>`).join('')||'<p>No expenses</p>';
            const historyHtml = expData.expenses.map(e=>`<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;"><span>${e.item}</span><span>₹${e.amount}</span><span>${e.date}</span><button onclick="deleteExpense(${e.id})" style="background:#dc2626; border:none; padding:4px 12px; border-radius:16px; color:white;">Delete</button></div>`).join('');
            document.getElementById('expenseHistory').innerHTML = historyHtml || '<p>No expenses</p>';
        } else {
            document.getElementById('dashBalance').innerHTML = formatMoney(currentBudget);
            document.getElementById('expTotalExpense').innerText = 0;
            document.getElementById('expTotalBudget').innerText = currentBudget;
            document.getElementById('expRemaining').innerText = currentBudget;
            document.getElementById('expBudgetInput').value = currentBudget;
            document.getElementById('recentExpensesList').innerHTML = '<p>No expenses</p>';
            document.getElementById('expenseHistory').innerHTML = '<p>No expenses</p>';
        }
        const ordersData = await fetchAPI(`/orders?user_id=${userId}`);
        if(ordersData && ordersData.orders) document.getElementById('dashOrders').innerText = ordersData.orders.length;
        const postsData = await fetchAPI("/posts");
        if(postsData && postsData.posts){
            document.getElementById('dashPosts').innerText = postsData.posts.length;
            document.getElementById('communityHighlights').innerHTML = postsData.posts.slice(0,2).map(p=>`<div><strong>${p.recipe_name}</strong><p>${p.description}</p><span>❤️ ${p.likes}</span></div>`).join('')||'<p>No posts</p>';
        }
        const recipesData = await fetchAPI("/recipes");
        if(recipesData && recipesData.recipes){
            document.getElementById('dashRecipes').innerText = recipesData.recipes.length;
            document.getElementById('trendingRecipes').innerHTML = recipesData.recipes.slice(0,5).map(r=>`<span class="recipe-tag" onclick="searchRecipe('${r.name}')">${r.name}</span>`).join('');
            const datalist = document.getElementById('recipeList');
            if(datalist) datalist.innerHTML = recipesData.recipes.map(r=>`<option value="${r.name}">`).join('');
        }
        const suggestionsData = await fetchAPI(`/suggestions?user_id=${userId}`);
        if(suggestionsData && suggestionsData.suggestions){
            const listHtml = suggestionsData.suggestions.map(s=>`<div class="activity-item"><span>${s.name}</span><span>Ordered ${s.order_count} times</span><button onclick="alert('✅ ${s.name} added to cart!')">Reorder</button></div>`).join('');
            document.getElementById('smartReorderList').innerHTML = listHtml||'<p>No suggestions</p>';
            document.getElementById('reorderSuggestions').innerHTML = listHtml||'<p>No suggestions</p>';
        }
    } catch(e){ console.error(e); }
}

// Expenses
async function deleteExpense(id){
    if(confirm("Delete expense?")){
        const userId = getCurrentUserId();
        await fetchAPI(`/expenses/${id}?user_id=${userId}`,{method:"DELETE"});
        loadDashboard(); goToSection('expense');
    }
}
async function addExpense(){
    const item = document.getElementById('expenseItem').value;
    const amount = parseInt(document.getElementById('expenseAmount').value);
    if(!item || !amount){ alert("Enter item and amount"); return; }
    const today = new Date().toISOString().slice(0,10);
    const userId = getCurrentUserId();
    await fetchAPI(`/expenses?user_id=${userId}`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({item,amount,date:today})});
    alert("Expense added!"); loadDashboard(); goToSection('home');
}

// Manual Shopping
async function showAllProducts(){
    const data = await fetchAPI(`/products`);
    if(data && data.products) displayProducts(data.products);
    else document.getElementById('productResults').innerHTML = '<p>No products</p>';
}
function displayProducts(products){
    const html = `<div style="display:flex; flex-direction:column; gap:0.8rem;">${products.map(p=>`
        <div class="product-card">
            <div class="product-info" style="display:flex; align-items:center; gap:12px;">
                <div class="product-emoji">${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:50px; height:50px; object-fit:cover; border-radius:12px;">` : '🛒'}</div>
                <div><div class="product-name">${p.name}</div><div class="product-details">₹${p.price} / ${p.unit} | ${p.store}</div></div>
            </div>
            <button class="cart-btn" onclick="addToOrder(${p.id},'${p.name}',${p.price})">🛒 Add to Cart</button>
        </div>
    `).join('')}</div>`;
    document.getElementById('productResults').innerHTML = html;
}
async function filterProductsByCategory(cat){
    const data = await fetchAPI(`/products?category=${encodeURIComponent(cat)}`);
    if(data && data.products) displayProducts(data.products);
    else document.getElementById('productResults').innerHTML = '<p>No products</p>';
}

// Cart
async function addToOrder(id,name,price){
    const userId = getCurrentUserId();
    const res = await fetchAPI(`/orders?user_id=${userId}`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:id,quantity:1})});
    if(res && res.message){ alert(`✅ ${name} added to cart!`); loadDashboard(); loadCart(); }
    else alert("Error");
}
async function removeFromOrder(orderId){
    if(confirm("Remove item?")){
        const userId = getCurrentUserId();
        await fetchAPI(`/orders/${orderId}?user_id=${userId}`,{method:"DELETE"});
        alert("Removed!"); loadDashboard(); loadCart();
    }
}
async function loadCart(){
    const container = document.getElementById('cartItemsContainer');
    if(!container) return;
    const userId = getCurrentUserId();
    const data = await fetchAPI(`/orders?user_id=${userId}`);
    if(data && data.orders && data.orders.length){
        let total=0;
        const html = data.orders.map(o=>{
            total += o.price * o.quantity;
            const imageHtml = o.product_image ? `<img src="${o.product_image}" alt="${o.product_name}" style="width:50px; height:50px; object-fit:cover; border-radius:12px;">` : '🛒';
            return `<div class="cart-item-card">
                        <div class="cart-item-emoji">${imageHtml}</div>
                        <div class="cart-item-details">
                            <div class="cart-item-name">${o.product_name}</div>
                            <div>Qty: ${o.quantity} | ₹${o.price}</div>
                            <div>Ordered: ${o.order_date}</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="cart-item-price">₹${o.price*o.quantity}</div>
                            <button class="remove-btn" onclick="removeFromOrder(${o.id})">Remove</button>
                        </div>
                    </div>`;
        }).join('');
        container.innerHTML = `${html}<div style="text-align:right; margin-top:1rem;"><strong>Total: ₹${total}</strong></div>`;
    } else container.innerHTML = '<div class="empty-cart">Cart empty</div>';
}

// AI Smart Shop
async function processSmartList(){
    const list = document.getElementById('groceryList').value;
    if(!list){ alert("Enter grocery list"); return; }
    const items = list.split(',').map(i=>i.trim().toLowerCase());
    let added=[], notFound=[];
    const productsData = await fetchAPI("/products");
    if(!productsData || !productsData.products){ alert("Error fetching products"); return; }
    const products = productsData.products;
    for(const item of items){
        const match = products.find(p=>p.name.toLowerCase().includes(item));
        if(match){ await addToOrder(match.id,match.name,match.price); added.push(match.name); }
        else notFound.push(item);
    }
    const summaryText = `✅ Added: ${added.join(', ') || 'None'} | ❌ Not found: ${notFound.join(', ') || 'None'}`;
    alert(summaryText);
    document.getElementById('smartResult').innerHTML = `<div style="background:#E8F5E9; padding:1rem;">${summaryText}</div>`;
    document.getElementById('smartSummary').innerHTML = `Processed ${items.length} items for best matches. Added ${added.length} + ${notFound.length} missing.`;
}
function uploadImageList(){
    const file = document.getElementById('imageUpload').files[0];
    if(!file){ alert("Select image"); return; }
    const resultDiv = document.getElementById('imageResult');
    resultDiv.innerHTML = '<div style="background:#E8F5E9; padding:1rem;">📷 Scanning image...</div>';
    Tesseract.recognize(file, 'eng', { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
            const words = text.toLowerCase().split(/\s+|\n|,/).filter(w => w.length > 2);
            resultDiv.innerHTML = `<div style="background:#E8F5E9; padding:1rem;">✅ Recognized: ${words.slice(0,5).join(', ')}<br>Now use Manual Shopping to add items.</div>`;
        })
        .catch(err => {
            resultDiv.innerHTML = '<div style="background:#FEE2E2; padding:1rem;">❌ OCR failed. Try clearer image.</div>';
        });
}

// Gemini AI Chat
async function askGemini(){
    const q = document.getElementById('geminiQuestion').value;
    if(!q.trim()){ alert("Ask a question"); return; }
    const btn = document.getElementById('askGeminiBtn');
    const orig = btn.innerText;
    btn.innerText = "Thinking..."; btn.disabled=true;
    try{
        const res = await fetch("/api/chat",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});
        const data = await res.json();
        const reply = data.reply || "No response";
        document.getElementById('geminiResult').innerHTML = `<div style="background:#E8F5E9; padding:1rem; border-radius:10px;"><strong>🤖 RASORA AI:</strong><br>${reply.replace(/\n/g,'<br>')}</div>`;
        document.getElementById('geminiQuestion').value = '';
    } catch(err){
        document.getElementById('geminiResult').innerHTML = `<div style="background:#FEE2E2; padding:1rem;">❌ Error connecting to AI</div>`;
    } finally { btn.innerText=orig; btn.disabled=false; }
}

// Recipe DB
async function getRecipeByDish(){
    const dish = document.getElementById('dishName').value;
    if(!dish){ alert("Enter dish name"); return; }
    const data = await fetchAPI("/recipes");
    if(data && data.recipes){
        const recipe = data.recipes.find(r=>r.name.toLowerCase()===dish.toLowerCase());
        if(recipe){
            const videoLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name)}`;
            document.getElementById('dishRecipeResult').innerHTML = `<div style="background:#F0FDF4; padding:1rem;"><strong>🍽️ ${recipe.name}</strong><br>${recipe.instructions}<br>⏱️ ${recipe.prep_time}<br><a href="${videoLink}" target="_blank">▶️ Watch on YouTube</a><br><button onclick="alert('Missing ingredients added!')">➕ Add Missing to Cart</button></div>`;
        } else document.getElementById('dishRecipeResult').innerHTML = `<div style="background:#FEE2E2; padding:1rem;">Recipe not found</div>`;
    }
}
async function getRecipeByIngredients(){
    const ing = document.getElementById('ingredientsInput').value;
    if(!ing){ alert("Enter ingredients"); return; }
    const data = await fetchAPI(`/recipes/search?ingredients=${encodeURIComponent(ing)}`);
    if(data && data.recipes && data.recipes.length){
        let html = `<div style="background:#F0FDF4; padding:1rem;"><strong>✨ You can make:</strong><ul>`;
        data.recipes.forEach(r=>html+=`<li>${r.name}</li>`);
        html+=`</ul><button onclick="alert('Missing spices added!')">➕ Add Missing Items</button></div>`;
        document.getElementById('ingredientsRecipeResult').innerHTML = html;
    } else document.getElementById('ingredientsRecipeResult').innerHTML = `<div style="background:#FEE2E2; padding:1rem;">No recipes found</div>`;
}
function searchRecipe(name){
    document.getElementById('dishName').value = name;
    goToSection('recipe');
    getRecipeByDish();
}

// ============ COMMUNITY FUNCTIONS ============
async function loadCommunities() {
    const data = await fetchAPI("/communities");
    if (data && data.communities) {
        allCommunities = data.communities;
        const container = document.getElementById('communitiesList');
        if (container) {
            container.innerHTML = allCommunities.map(comm => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee;">
                    <span style="cursor: pointer; font-weight: bold;" onclick="selectCommunity(${comm.id}, '${comm.name}')">📁 ${comm.name}</span>
                    <button class="remove-btn" onclick="deleteCommunity(${comm.id})">Delete</button>
                </div>
            `).join('');
            if (allCommunities.length === 0) {
                container.innerHTML = '<p>No communities yet. Create one!</p>';
            }
        }
    }
}

async function createCommunity(name) {
    const res = await fetchAPI(`/communities?name=${encodeURIComponent(name)}&user_id=${getCurrentUserId()}`, { method: "POST" });
    if (res && res.message) {
        alert("Community created!");
        loadCommunities();
    } else {
        alert("Error creating community");
    }
}

async function deleteCommunity(communityId) {
    if (confirm("Delete this community and all its posts?")) {
        const res = await fetchAPI(`/communities/${communityId}?user_id=${getCurrentUserId()}`, { method: "DELETE" });
        if (res && res.message) {
            alert("Community deleted");
            if (currentCommunityId === communityId) {
                showCommunitiesList();
            }
            loadCommunities();
        } else {
            alert("Error deleting community");
        }
    }
}

function showCreateCommunityForm() {
    const name = prompt("Enter new community name:");
    if (name && name.trim()) {
        createCommunity(name.trim());
    }
}

function selectCommunity(id, name) {
    currentCommunityId = id;
    document.getElementById('selectedCommunityName').innerText = `📁 ${name} Community`;
    document.getElementById('communitiesList').style.display = 'none';
    document.getElementById('communityPostsContainer').style.display = 'block';
    document.getElementById('backToCommunitiesBtn').style.display = 'inline-block';
    loadCommunityPosts(id);
}

function showCommunitiesList() {
    currentCommunityId = null;
    document.getElementById('communitiesList').style.display = 'block';
    document.getElementById('communityPostsContainer').style.display = 'none';
    document.getElementById('backToCommunitiesBtn').style.display = 'none';
    loadCommunities();
}

async function loadCommunityPosts(communityId) {
    const data = await fetchAPI(`/posts?community_id=${communityId}`);
    if (data && data.posts) {
        displayCommunityPosts(data.posts);
    } else {
        document.getElementById('communityPosts').innerHTML = '<p>No posts in this community.</p>';
    }
}

async function shareRecipeInCurrentCommunity() {
    if (!currentCommunityId) {
        alert("Select a community first");
        return;
    }
    const recipe = prompt("What recipe would you like to share?");
    if (recipe) {
        const desc = prompt("Share a short description:");
        const res = await fetchAPI("/posts", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                recipe_name: recipe, 
                description: desc || "Delicious!", 
                community_id: currentCommunityId 
            })
        });
        if (res && res.message) {
            alert("🎉 Recipe shared!");
            loadCommunityPosts(currentCommunityId);
        } else {
            alert("Error sharing recipe");
        }
    }
}

function displayCommunityPosts(posts) {
    const container = document.getElementById('communityPosts');
    if (!container) return;
    container.innerHTML = posts.map(p => `
        <div style="background:white; border-radius:15px; padding:1rem; margin-bottom:1rem;">
            <div><strong>User ${p.user_id}</strong> shared <strong>${p.recipe_name}</strong></div>
            <p>${p.description}</p>
            <span onclick="likePost(${p.id})">❤️ ${p.likes}</span> <span>💬 ${p.comments}</span>
        </div>
    `).join('');
}

async function likePost(id) {
    const res = await fetchAPI(`/posts/${id}/like`, { method: "PUT" });
    if (res) {
        if (currentCommunityId) loadCommunityPosts(currentCommunityId);
        else loadDashboard();
    }
}

// Navigation
function goToSection(sectionId){
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active-section'));
    document.getElementById(sectionId).classList.add('active-section');
    document.querySelectorAll('.nav-item').forEach(item=>{
        item.classList.remove('active');
        if(item.getAttribute('data-section')===sectionId) item.classList.add('active');
    });
    if(sectionId==='shopping') showAllProducts();
    if(sectionId==='cart') loadCart();
    if(sectionId==='community') {
        loadCommunities();
        showCommunitiesList();
    }
}

// Init
document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.nav-item').forEach(item=>{
        item.addEventListener('click',()=>goToSection(item.getAttribute('data-section')));
    });
    document.querySelectorAll('.category-item').forEach(cat=>{
        cat.addEventListener('click',()=>filterProductsByCategory(cat.getAttribute('data-cat')));
    });
    const askBtn = document.querySelector('#recipe .btn-primary');
    if(askBtn) askBtn.id = 'askGeminiBtn';
    loadDashboard().then(()=>goToSection('home'));
});

// ============ AI DIET PLANNER FUNCTIONS ============
let currentDietType = 'vegetarian';
let currentGoal = 'lose weight';

// Ensure the button calls this function with event
window.generateDietPlan = async function(event) {
    const dietType = currentDietType;
    const goal = currentGoal;
    const weeklyBudget = parseInt(document.getElementById('weeklyBudget').value);
    const durationDays = parseInt(document.getElementById('durationDays').value);
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Generating...";
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/diet/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                diet_type: dietType,
                goal: goal,
                weekly_budget: weeklyBudget,
                duration_days: durationDays
            })
        });
        const data = await response.json();
        
        if (data.success) {
            displayDietPlan(data.plan);
        } else {
            // If backend fails, show mock plan for demo
            console.warn("Backend error, showing mock plan");
            showMockDietPlan(dietType, goal, weeklyBudget, durationDays);
        }
    } catch (error) {
        console.error("Diet plan error:", error);
        // Show mock plan as fallback
        showMockDietPlan(dietType, goal, weeklyBudget, durationDays);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

function showMockDietPlan(dietType, goal, budget, days) {
    const isVeg = dietType === 'vegetarian';
    const isLose = goal === 'lose weight';
    const breakfast = isVeg ? (isLose ? "Oats Upma" : "Protein Smoothie") : (isLose ? "Egg White Omelette" : "Chicken Omelette");
    const lunch = isVeg ? (isLose ? "Quinoa Salad" : "Chole + Rice") : (isLose ? "Grilled Chicken Salad" : "Egg Curry + Rice");
    const dinner = isVeg ? (isLose ? "Soup & Brown Rice" : "Mushroom Curry") : (isLose ? "Fish Stew" : "Chicken Breast + Veggies");
    
    const plan = {
        daily_meals: Array(Math.min(days, 7)).fill().map((_, i) => ({
            day: i+1,
            date: new Date(Date.now() + i*86400000).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' }),
            breakfast: { name: breakfast, cost: isVeg ? (isLose?30:80) : (isLose?40:80), calories: isVeg ? (isLose?250:400) : (isLose?200:500) },
            lunch: { name: lunch, cost: isVeg ? (isLose?50:70) : (isLose?90:70), calories: isVeg ? (isLose?350:550) : (isLose?350:550) },
            dinner: { name: dinner, cost: isVeg ? (isLose?40:80) : (isLose?110:120), calories: isVeg ? (isLose?300:500) : (isLose?300:600) }
        })),
        summary: {
            daily_cost: isVeg ? (isLose?120:230) : (isLose?240:270),
            total_cost: (isVeg ? (isLose?120:230) : (isLose?240:270)) * days,
            weekly_budget_needed: (isVeg ? (isLose?120:230) : (isLose?240:270)) * 7,
            within_budget: ((isVeg ? (isLose?120:230) : (isLose?240:270)) * 7) <= budget,
            average_daily_calories: isVeg ? (isLose?300:483) : (isLose?283:550)
        },
        shopping_list: ["oats", "vegetables", "spices", "quinoa", "brown rice", "chickpeas", "mushroom", "eggs", "chicken breast", "fish fillet"],
        tips: [
            "🥗 Eat protein-rich breakfast to avoid cravings",
            "💧 Drink 2-3 liters of water daily",
            (goal === "lose weight" ? "🚶 Walk 10,000 steps daily" : "💪 Eat within 1 hour after workout")
        ]
    };
    displayDietPlan(plan);
}

function displayDietPlan(plan) {
    if (!plan || !plan.daily_meals) {
        document.getElementById('dietPlanResult').style.display = 'none';
        alert("Invalid plan data");
        return;
    }
    document.getElementById('dietPlanResult').style.display = 'block';
    
    const summary = plan.summary;
    const withinBudgetClass = summary.within_budget ? '✅' : '⚠️';
    document.getElementById('planSummaryCard').innerHTML = `
        <h3> Plan Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div><strong>Daily Cost:</strong> ₹${summary.daily_cost}</div>
            <div><strong>Total Cost:</strong> ₹${summary.total_cost}</div>
            <div><strong>Weekly Budget Needed:</strong> ₹${summary.weekly_budget_needed}</div>
            <div><strong>${withinBudgetClass} Within Budget:</strong> ${summary.within_budget ? 'Yes' : 'No'}</div>
            <div><strong>Avg Daily Calories:</strong> ${summary.average_daily_calories} kcal</div>
        </div>
    `;
    
    const mealsHtml = plan.daily_meals.slice(0, 5).map(day => `
        <div class="meal-plan-day">
            <h4>Day ${day.day} - ${day.date}</h4>
            <div class="meal-item">
                <div><span class="meal-name"> Breakfast:</span> ${day.breakfast.name}</div>
                <div class="meal-details">₹${day.breakfast.cost} | ${day.breakfast.calories} cal</div>
            </div>
            <div class="meal-item">
                <div><span class="meal-name"> Lunch:</span> ${day.lunch.name}</div>
                <div class="meal-details">₹${day.lunch.cost} | ${day.lunch.calories} cal</div>
            </div>
            <div class="meal-item">
                <div><span class="meal-name"> Dinner:</span> ${day.dinner.name}</div>
                <div class="meal-details">₹${day.dinner.cost} | ${day.dinner.calories} cal</div>
            </div>
        </div>
    `).join('');
    document.getElementById('dailyMealsCard').innerHTML = `<h3> Sample Meal Plan (First 5 Days)</h3>${mealsHtml}`;
    
    const shoppingHtml = plan.shopping_list.map(item => `<span class="shopping-item">${item}</span>`).join('');
    document.getElementById('shoppingListCard').innerHTML = `<h3> Shopping List</h3><div style="margin-top:0.5rem;">${shoppingHtml}</div>`;
    
    const tipsHtml = plan.tips.map(tip => `<li>${tip}</li>`).join('');
    document.getElementById('tipsCard').innerHTML = `<h3> Expert Tips</h3><ul style="margin-left:1.5rem;">${tipsHtml}</ul>`;
}

// Update goal buttons
document.getElementById('goalLoseBtn')?.addEventListener('click', () => {
    currentGoal = 'lose weight';
    document.querySelectorAll('.goal-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('goalLoseBtn').classList.add('active');
});
document.getElementById('goalGainBtn')?.addEventListener('click', () => {
    currentGoal = 'gain muscle';
    document.querySelectorAll('.goal-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('goalGainBtn').classList.add('active');
});

// Update diet buttons
const vegBtn = document.getElementById('dietVegBtn');
const nonVegBtn = document.getElementById('dietNonVegBtn');
if (vegBtn) {
    vegBtn.addEventListener('click', () => {
        currentDietType = 'vegetarian';
        vegBtn.classList.add('active');
        nonVegBtn.classList.remove('active');
    });
}
if (nonVegBtn) {
    nonVegBtn.addEventListener('click', () => {
        currentDietType = 'non-vegetarian';
        nonVegBtn.classList.add('active');
        vegBtn.classList.remove('active');
    });
}
