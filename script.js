const API_BASE = "http://localhost:8000/api";
const BASE_BUDGET = 10000;
let currentDiet = localStorage.getItem('rasora_diet') || 'veg';
let currentBudget = Number(localStorage.getItem('rasora_budget') || BASE_BUDGET);

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

// Logout function
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
            displayCommunityPosts(postsData.posts);
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
                <div class="product-emoji">${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-img"/>` : '🛒'}</div>
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
async function addToOrder(id, name, price) {
    const userId = getCurrentUserId();
    const res = await fetchAPI(`/orders?user_id=${userId}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: id, quantity: 1 })
    });
    if (res && res.message) {
        alert(`✅ ${name} added to cart!`);
        loadDashboard();
        loadCart();
    } else alert("Error");
}           
async function removeFromOrder(orderId){
    if(confirm("Remove item?")){
        const userId = getCurrentUserId();
        await fetchAPI(`/orders/${orderId}?user_id=${userId}`,{method:"DELETE"});
        alert("Removed!"); loadDashboard(); loadCart();
    }
}
async function loadCart() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;
    const userId = getCurrentUserId();
    const data = await fetchAPI(`/orders?user_id=${userId}`);
    if (data && data.orders && data.orders.length) {
        let total = 0;
        const html = data.orders.map(o => {
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
                            <div class="cart-item-price">₹${o.price * o.quantity}</div>
                            <button class="remove-btn" onclick="removeFromOrder(${o.id})">Remove</button>
                        </div>
                    </div>`;
        }).join('');
        container.innerHTML = `${html}<div style="text-align:right; margin-top:1rem;"><strong>Total: ₹${total}</strong></div>`;
    } else {
        container.innerHTML = '<div class="empty-cart">Cart empty</div>';
    }
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
    document.getElementById('imageResult').innerHTML = `<div style="background:#E8F5E9; padding:1rem;">📷 Image uploaded (demo)</div>`;
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

// Community
async function shareRecipe(){
    const recipe = prompt("Recipe name?");
    if(recipe){
        const desc = prompt("Description?");
        await fetchAPI("/posts",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({recipe_name:recipe,description:desc||"Yummy!"})});
        alert("Shared!"); loadDashboard(); goToSection('community');
    }
}
async function likePost(id){
    await fetchAPI(`/posts/${id}/like`,{method:"PUT"});
    loadDashboard(); goToSection('community');
}
function displayCommunityPosts(posts){
    const container = document.getElementById('communityPosts');
    if(!container) return;
    container.innerHTML = posts.map(p=>`<div style="background:white; border-radius:15px; padding:1rem; margin-bottom:1rem;"><div><strong>User ${p.user_id}</strong> shared <strong>${p.recipe_name}</strong></div><p>${p.description}</p><span onclick="likePost(${p.id})">❤️ ${p.likes}</span> <span>💬 ${p.comments}</span></div>`).join('');
}

// Dietary
function setDietPreference(diet){
    currentDiet = diet;
    localStorage.setItem('rasora_diet',diet);
    document.getElementById('dietStatus').innerHTML = `Current diet: <strong>${diet==='veg'?'Veg':'Non-Veg'}</strong>`;
    document.querySelectorAll('.diet-btn').forEach(btn=>btn.classList.remove('active'));
    if(diet==='veg') document.getElementById('dietVegBtn').classList.add('active');
    else document.getElementById('dietNonVegBtn').classList.add('active');
    if(document.getElementById('shopping').classList.contains('active-section')) showAllProducts();
    loadDashboard();
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
    if(sectionId==='community') loadDashboard();
}

// Init
document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.nav-item').forEach(item=>{
        item.addEventListener('click',()=>goToSection(item.getAttribute('data-section')));
    });
    document.querySelectorAll('.category-item').forEach(cat=>{
        cat.addEventListener('click',()=>filterProductsByCategory(cat.getAttribute('data-cat')));
    });
    document.getElementById('dietVegBtn').addEventListener('click',()=>setDietPreference('veg'));
    document.getElementById('dietNonVegBtn').addEventListener('click',()=>setDietPreference('nonveg'));
    // attach Gemini button
    const askBtn = document.querySelector('#recipe .btn-primary');
    if(askBtn) askBtn.id = 'askGeminiBtn';
    loadDashboard().then(()=>goToSection('home'));
});