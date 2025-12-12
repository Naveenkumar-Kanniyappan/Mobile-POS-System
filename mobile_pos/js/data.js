/**
 * Data Management for Mobile POS
 * Handles LocalStorage and Mock Data Generation
 */

const APP_KEY = 'mobile_pos_data_v1';

// Initial Mock Data
const INITIAL_DATA = {
    currentSession: null, // { user, role, storeId }
    stores: [
        { id: 'store_1', name: 'Univercell Market', location: 'Downtown' },
        { id: 'store_2', name: 'AZ Store', location: 'Uptown' }
    ],
    users: [
        { id: 'admin', username: 'admin', password: '123', role: 'admin', name: 'Super Admin' },
        { id: 'user1', username: 'univercell', password: '123', role: 'store_user', storeId: 'store_1', name: 'Univercell Manager' },
        { id: 'user2', username: 'azstore', password: '123', role: 'store_user', storeId: 'store_2', name: 'AZ Manager' }
    ],
    vendors: [
        { id: 'v1', name: 'Global Mobiles Supply', contact: '555-0101', gst: 'GST12345', address: '123 Supply St' },
        { id: 'v2', name: 'Tech Aggregators', contact: '555-0102', gst: 'GST67890', address: '456 Tech Ave' }
    ],
    // Product Catalog (Master List)
    products: [
        { id: 'p1', brand: 'Samsung', model: 'Galaxy S24', specs: '8GB/256GB', purchasePrice: 70000, salesPrice: 75000 },
        { id: 'p2', brand: 'Apple', model: 'iPhone 15', specs: '128GB', purchasePrice: 65000, salesPrice: 72000 },
        { id: 'p3', brand: 'Xiaomi', model: 'Note 13', specs: '6GB/128GB', purchasePrice: 15000, salesPrice: 18000 }
    ],
    // Inventory: Store-wise stock mapping
    inventory: [
        { storeId: 'store_1', productId: 'p1', quantity: 10 },
        { storeId: 'store_1', productId: 'p2', quantity: 5 },
        { storeId: 'store_2', productId: 'p1', quantity: 8 },
        { storeId: 'store_2', productId: 'p3', quantity: 20 }
    ],
    // Transactions (Sales & Purchases)
    transactions: [
        { id: 't1', type: 'PURCHASE', storeId: 'store_1', vendorId: 'v1', productId: 'p1', quantity: 10, price: 70000, date: '2024-05-01', status: 'Approved' },
        { id: 't2', type: 'SALE', storeId: 'store_1', customerType: 'Retail', productId: 'p1', quantity: 1, price: 75000, date: '2024-05-02' }
    ],
    // Petty Cash Log
    pettyCash: [
        { id: 'pc1', storeId: 'store_1', type: 'CREDIT', amount: 5000, description: 'Weekly Allowance from Admin', date: '2024-05-01', by: 'admin' },
        { id: 'pc2', storeId: 'store_1', type: 'DEBIT', amount: 200, description: 'Tea & Snacks', date: '2024-05-02', by: 'user1' }
    ]
};

// Data Store Class
class DataStore {
    constructor() {
        this.load();
    }

    load() {
        const stored = localStorage.getItem(APP_KEY);
        if (stored) {
            this.data = JSON.parse(stored);
        } else {
            this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
            this.save();
        }
    }

    save() {
        localStorage.setItem(APP_KEY, JSON.stringify(this.data));
    }

    reset() {
        this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
        this.save();
        window.location.reload();
    }

    // Auth helpers
    login(username, password) {
        const user = this.data.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.data.currentSession = user;
            this.save();
            return user;
        }
        return null;
    }

    logout() {
        this.data.currentSession = null;
        this.save();
        window.location.href = 'index.html';
    }

    getCurrentUser() {
        // In a real app, we'd check session validity more robustly.
        // For this template, we trust the local storage state or defaults for demo.
        return this.data.currentSession;
    }

    // Generic Getters
    getStores() { return this.data.stores; }
    getUsers() { return this.data.users; }
    getVendors() { return this.data.vendors; }
    getProducts() { return this.data.products; }

    // Inventory Logic
    getInventory(storeId) {
        return this.data.inventory.filter(i => i.storeId === storeId).map(inv => {
            const product = this.data.products.find(p => p.id === inv.productId);
            // Safety check in case product was deleted but inventory remains
            if (!product) return null;
            return { ...inv, ...product };
        }).filter(item => item !== null);
    }

    getAllInventory() {
        return this.data.inventory.map(inv => {
            const product = this.data.products.find(p => p.id === inv.productId);
            const store = this.data.stores.find(s => s.id === inv.storeId);
            if (!product) return null;
            return { ...inv, productName: product.brand + ' ' + product.model, storeName: store.name };
        }).filter(item => item !== null);
    }

    // update stock helper
    updateStock(storeId, productId, change) {
        let item = this.data.inventory.find(i => i.storeId === storeId && i.productId === productId);
        if (item) {
            item.quantity += parseInt(change);
        } else if (change > 0) {
            this.data.inventory.push({ storeId, productId, quantity: parseInt(change) });
        }
        this.save();
    }

    // Transactions
    addTransaction(transaction) {
        transaction.id = 't' + Date.now();
        transaction.date = new Date().toISOString().split('T')[0]; // Simple YYYY-MM-DD
        this.data.transactions.push(transaction);

        // Auto update stock if it's a confirmed sale or approved purchase
        // NOTE: Req 3.3 says "Stock automatically increases" on Purchase Entry.
        // Req 3.4 says "Stock automatically decreases" on Sales Entry.
        if (transaction.type === 'SALE') {
            this.updateStock(transaction.storeId, transaction.productId, -transaction.quantity);
        } else if (transaction.type === 'PURCHASE') {
            this.updateStock(transaction.storeId, transaction.productId, transaction.quantity);
        }
        this.save();
    }

    getTransactions(storeId = null) {
        let txs = this.data.transactions;
        if (storeId) {
            txs = txs.filter(t => t.storeId === storeId);
        }
        return txs.map(t => {
            const product = this.data.products.find(p => p.id === t.productId);
            const store = this.data.stores.find(s => s.id === t.storeId);
            const vendor = t.vendorId ? this.data.vendors.find(v => v.id === t.vendorId) : null;
            return {
                ...t,
                productName: product ? (product.brand + ' ' + product.model) : 'Unknown',
                storeName: store ? store.name : 'Unknown',
                vendorName: vendor ? vendor.name : '-'
            };
        }).reverse(); // Newest first
    }

    // Petty Cash
    addPettyCash(entry) {
        entry.id = 'pc' + Date.now();
        entry.date = new Date().toISOString().split('T')[0];
        this.data.pettyCash.push(entry);
        this.save();
    }

    getPettyCash(storeId = null) {
        let logs = this.data.pettyCash;
        if (storeId) logs = logs.filter(l => l.storeId === storeId);
        return logs.map(l => {
            const store = this.data.stores.find(s => s.id === l.storeId);
            return { ...l, storeName: store ? store.name : 'Unknown' };
        }).reverse();
    }

    // Admin: Add Master Product
    addProduct(product) {
        product.id = 'p' + Date.now();
        this.data.products.push(product);
        this.save();
    }

    // Admin: Add Vendor
    addVendor(vendor) {
        vendor.id = 'v' + Date.now();
        this.data.vendors.push(vendor);
        this.save();
    }

    // Admin: Create Store & User
    addStore(storeData, userData) {
        // 1. Create Store
        const storeId = 'store_' + Date.now();
        const newStore = {
            id: storeId,
            name: storeData.name,
            location: storeData.location
        };
        this.data.stores.push(newStore);

        // 2. Create User linked to Store
        const newUser = {
            id: 'user_' + Date.now(),
            username: userData.username,
            password: userData.password,
            role: 'store_user',
            storeId: storeId,
            name: storeData.name + ' Manager'
        };
        this.data.users.push(newUser);

        this.save();
        return { store: newStore, user: newUser };
    }

    // Simple Reports Helpers
    getReportData(type, filterStoreId = null) {
        // Mocking report aggregation
        // Return raw data usually, UI handles aggregation
        // ...
        return {};
    }
}

const db = new DataStore();
