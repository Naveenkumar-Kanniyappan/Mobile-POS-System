/**
 * Store User Logic
 */

const user = db.getCurrentUser();
if (!user || user.role !== 'store_user') {
    window.location.href = 'index.html';
}

document.getElementById('user-name-display').textContent = user.name;
document.getElementById('store-name-label').textContent = user.name; // Usually store name

const STORE_ID = user.storeId;

function initDashboard() {
    // Stats
    const transactions = db.getTransactions(STORE_ID);

    // Today's Sales
    const today = new Date().toISOString().split('T')[0];
    const todaySales = transactions
        .filter(t => t.type === 'SALE' && t.date === today)
        .reduce((sum, t) => sum + (t.price * t.quantity), 0);

    const inventory = db.getInventory(STORE_ID);
    const itemCount = inventory.reduce((sum, i) => sum + i.quantity, 0);

    document.getElementById('dash-sales-today').textContent = '$' + todaySales.toLocaleString();
    document.getElementById('dash-items').textContent = itemCount;

    // Recent Table
    const tbody = document.getElementById('dash-history-table');
    tbody.innerHTML = '';
    transactions.slice(0, 5).forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge ${t.type === 'SALE' ? 'badge-success' : 'badge-warning'}">${t.type}</span></td>
            <td>${t.productName}</td>
            <td>${t.quantity}</td>
            <td>$${(t.price * t.quantity).toLocaleString()}</td>
            <td>${t.date}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPosOptions() {
    const products = db.getProducts(); // Master list
    // Actually, should we only allow selling items in stock?
    // Req says "Product -> Quantity". Usually you pick from valid products.
    // For better UX, let's list all products but show stock in label?
    // Simplified: List all master products.

    const select = document.getElementById('pos-product-select');
    // Save current selection if re-rendering? (Not needed for simple flow)
    select.innerHTML = '<option value="">-- Select Product --</option>';

    const inventory = db.getInventory(STORE_ID);

    products.forEach(p => {
        const stockItem = inventory.find(i => i.productId === p.id);
        const stockQty = stockItem ? stockItem.quantity : 0;

        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.brand} ${p.model} (Stock: ${stockQty})`;
        option.dataset.price = p.salesPrice;
        if (stockQty <= 0) option.disabled = true; // Prevent selling out of stock?
        select.appendChild(option);
    });

    select.onchange = function () {
        if (this.value) {
            const price = this.options[this.selectedIndex].dataset.price;
            document.getElementById('pos-price-input').value = price;
        }
    };
}

function renderPurchaseOptions() {
    const vendors = db.getVendors();
    const vSelect = document.getElementById('purchase-vendor-select');
    vSelect.innerHTML = '';
    vendors.forEach(v => {
        const op = document.createElement('option');
        op.value = v.id;
        op.textContent = v.name;
        vSelect.appendChild(op);
    });

    const products = db.getProducts();
    const pSelect = document.getElementById('purchase-product-select');
    pSelect.innerHTML = '<option value="">-- Select Product --</option>';
    products.forEach(p => {
        const op = document.createElement('option');
        op.value = p.id;
        op.textContent = `${p.brand} ${p.model}`;
        op.dataset.price = p.purchasePrice;
        pSelect.appendChild(op);
    });

    pSelect.onchange = function () {
        if (this.value) {
            const price = this.options[this.selectedIndex].dataset.price;
            document.getElementById('purchase-price-input').value = price;
        }
    };
}

function renderStock() {
    const inventory = db.getInventory(STORE_ID);
    const tbody = document.getElementById('stock-table');
    tbody.innerHTML = '';
    inventory.forEach(i => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i.brand} ${i.model}</td>
            <td class="text-muted">${i.specs}</td>
            <td style="font-size:1.1em; font-weight:bold;">${i.quantity}</td>
            <td>${i.quantity < 5 ? '<span class="badge badge-danger">Low</span>' : '<span class="badge badge-success">Good</span>'}</td>
         `;
        tbody.appendChild(tr);
    });
}

function renderPettyCash() {
    const logs = db.getPettyCash(STORE_ID);
    // Calc Balance
    let balance = 0;
    logs.forEach(l => {
        if (l.type === 'CREDIT') balance += l.amount;
        else balance -= l.amount;
    });

    // Sort oldest first for balance calc? No, simple sum is fine.
    // Display:
    document.getElementById('petty-balance').textContent = '$' + balance;

    const tbody = document.getElementById('petty-table');
    tbody.innerHTML = '';
    logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${l.date}</td>
            <td class="${l.type === 'CREDIT' ? 'text-green' : 'text-red'}">${l.type}</td>
            <td>$${l.amount}</td>
            <td>${l.description}</td>
            <td>${l.by}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Navigation
window.showSection = function (sectionId) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    if (sectionId === 'pos') renderPosOptions();
    if (sectionId === 'purchase') renderPurchaseOptions();
    if (sectionId === 'stock') renderStock();
    if (sectionId === 'pettycash') renderPettyCash();
    if (sectionId === 'dashboard') initDashboard();
};

// Modal
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

// Transaction Handlers
document.getElementById('form-sale').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const tx = {
        type: 'SALE',
        storeId: STORE_ID,
        customerType: fd.get('customerType'),
        productId: fd.get('productId'),
        quantity: Number(fd.get('quantity')),
        price: Number(fd.get('price'))
    };

    // Validate Stock
    const inv = db.getInventory(STORE_ID).find(i => i.productId === tx.productId);
    if (!inv || inv.quantity < tx.quantity) {
        alert("Insufficient Stock!");
        return;
    }

    db.addTransaction(tx);
    alert("Sale Recorded Successfully");
    e.target.reset();
    renderPosOptions(); // Refresh stock in dropdown
});

document.getElementById('form-purchase').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const tx = {
        type: 'PURCHASE',
        storeId: STORE_ID,
        vendorId: fd.get('vendorId'),
        productId: fd.get('productId'),
        quantity: Number(fd.get('quantity')),
        price: Number(fd.get('price')),
        status: 'Approved' // Store users add directly per requirement 3.3 "Stock automatically increases"
    };

    db.addTransaction(tx);
    alert("Purchase Entry Recorded");
    e.target.reset();
});

document.getElementById('form-add-expense').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    db.addPettyCash({
        storeId: STORE_ID,
        type: 'DEBIT',
        amount: Number(fd.get('amount')),
        description: fd.get('description'),
        by: user.username
    });
    closeModal('modal-add-expense');
    renderPettyCash();
    e.target.reset();
});

initDashboard();
