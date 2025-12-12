/**
 * Admin Panel Logic
 */

// Auth Check
const user = db.getCurrentUser();
if (!user || user.role !== 'admin') {
    window.location.href = 'index.html';
}

// Stats & Initialization
function initDashboard() {
    // Top Cards
    const transactions = db.getTransactions();
    const revenue = transactions
        .filter(t => t.type === 'SALE')
        .reduce((sum, t) => sum + (t.price * t.quantity), 0);

    // Inventory Val
    const inventory = db.getAllInventory();
    const stockVal = inventory.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);

    document.getElementById('dash-revenue').textContent = '$' + revenue.toLocaleString();
    document.getElementById('dash-inventory').textContent = inventory.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('dash-stock-value').textContent = '$' + stockVal.toLocaleString();

    // Recent Table
    const tbody = document.getElementById('dash-recent-table');
    tbody.innerHTML = '';
    transactions.slice(0, 5).forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${t.id.slice(-4)}</td>
            <td>
                <span class="badge ${t.type === 'SALE' ? 'badge-success' : 'badge-warning'}">
                    ${t.type}
                </span>
            </td>
            <td>${t.storeName}</td>
            <td>${t.productName}</td>
            <td>${t.quantity}</td>
            <td>$${(t.price * t.quantity).toLocaleString()}</td>
            <td>${t.date}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderProducts() {
    const products = db.getProducts();
    const tbody = document.getElementById('products-table');
    tbody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.brand}</td>
            <td>${p.model}</td>
            <td>${p.specs}</td>
            <td>$${p.purchasePrice}</td>
            <td>$${p.salesPrice}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderVendors() {
    const vendors = db.getVendors();
    const tbody = document.getElementById('vendors-table');
    tbody.innerHTML = '';
    vendors.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 500;">${v.name}</td>
            <td>${v.contact}</td>
            <td>${v.gst}</td>
            <td>${v.address}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderInventory() {
    const inventory = db.getAllInventory();
    const tbody = document.getElementById('inventory-table');
    tbody.innerHTML = '';
    inventory.forEach(i => {
        const status = i.quantity < 5 ?
            '<span class="badge badge-danger">Low Stock</span>' :
            '<span class="badge badge-success">In Stock</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i.storeName}</td>
            <td>
                <div>${i.brand} ${i.model}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${i.specs}</div>
            </td>
            <td style="font-weight: bold;">${i.quantity}</td>
            <td>${status}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPettyCash() {
    const logs = db.getPettyCash();
    const tbody = document.getElementById('pettycash-table');
    tbody.innerHTML = '';
    logs.forEach(l => {
        const color = l.type === 'CREDIT' ? 'text-green' : 'text-red';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${l.date}</td>
            <td>${l.storeName}</td>
            <td class="${color}" style="font-weight: 600;">${l.type}</td>
            <td>$${l.amount}</td>
            <td>${l.description}</td>
             <td>${l.by || 'system'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Navigation
window.showSection = function (sectionId) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');

    // Update Title & Render
    const titles = {
        'dashboard': 'Dashboard',
        'products': 'Product Catalog',
        'vendors': 'Vendor Management',
        'inventory': 'Stock Inventory',
        'pettycash': 'Petty Cash Log',
        'reports': 'Reports'
    };
    document.getElementById('page-title').textContent = titles[sectionId];

    // Update Nav Active State
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    // Simple way to match clicked nav (in real app add ID to nav items)
    // Here we just re-init views
    if (sectionId === 'products') renderProducts();
    if (sectionId === 'vendors') renderVendors();
    if (sectionId === 'inventory') renderInventory();
    if (sectionId === 'pettycash') renderPettyCash();
};

// Modal Handling
window.openModal = function (id) {
    document.getElementById(id).classList.remove('hidden');
};
window.closeModal = function (id) {
    document.getElementById(id).classList.add('hidden');
};

// Forms
document.getElementById('form-add-product').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const product = {
        brand: formData.get('brand'),
        model: formData.get('model'),
        specs: formData.get('specs'),
        purchasePrice: Number(formData.get('purchasePrice')),
        salesPrice: Number(formData.get('salesPrice'))
    };
    db.addProduct(product);
    closeModal('modal-add-product');
    renderProducts();
    e.target.reset();
});

document.getElementById('form-add-vendor').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    db.addVendor({
        name: formData.get('name'),
        contact: formData.get('contact'),
        gst: formData.get('gst'),
        address: formData.get('address')
    });
    closeModal('modal-add-vendor');
    renderVendors();
    e.target.reset();
});

document.getElementById('form-add-petty').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const storeId = formData.get('storeId');
    const amount = Number(formData.get('amount'));

    db.addPettyCash({
        storeId: storeId,
        type: 'CREDIT',
        amount: amount,
        description: formData.get('description'),
        by: 'admin'
    });
    closeModal('modal-add-petty');
    renderPettyCash();
    e.target.reset();
});


// Initial Load
initDashboard();
renderInventory(); // Background load
