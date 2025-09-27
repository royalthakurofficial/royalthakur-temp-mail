// Admin Panel JavaScript
const API_BASE = 'http://localhost:5000/api';
let adminToken = localStorage.getItem('adminToken');

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const adminLoginForm = document.getElementById('adminLoginForm');
const logoutAdminBtn = document.getElementById('logoutAdmin');

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    setupAdminEventListeners();
});

// Check Admin Authentication
async function checkAdminAuth() {
    if (!adminToken) return;

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.user.role === 'super_admin') {
                showAdminPanel();
                loadDashboardData();
            } else {
                localStorage.removeItem('adminToken');
            }
        }
    } catch (error) {
        console.error('Admin auth check failed:', error);
    }
}

// Setup Event Listeners
function setupAdminEventListeners() {
    // Admin Login
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    
    // Logout
    logoutAdminBtn.addEventListener('click', handleAdminLogout);
    
    // Tab Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.dataset.tab);
        });
    });
    
    // User Search
    document.getElementById('userSearch').addEventListener('input', searchUsers);
}

// Handle Admin Login
async function handleAdminLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
        const response = await fetch(`${API_BASE}/auth/admin-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            showAdminPanel();
            loadDashboardData();
            showAdminNotification('Login successful!', 'success');
        } else {
            showAdminNotification(data.message, 'error');
        }
    } catch (error) {
        showAdminNotification('Login failed', 'error');
    }
}

// Show Admin Panel
function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'flex';
}

// Handle Admin Logout
function handleAdminLogout() {
    localStorage.removeItem('adminToken');
    adminToken = null;
    adminPanel.style.display = 'none';
    loginScreen.style.display = 'flex';
    showAdminNotification('Logged out successfully', 'success');
}

// Switch Tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Activate nav item
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update breadcrumb
    document.getElementById('currentTab').textContent = 
        tabName.charAt(0).toUpperCase() + tabName.slice(1);
    
    // Load tab data
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'payments':
            loadPaymentsData();
            break;
        case 'emails':
            loadEmailsData();
            break;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            updateDashboardStats(data.stats);
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Update Dashboard Stats
function updateDashboardStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('premiumUsers').textContent = stats.premiumUsers;
    document.getElementById('totalEmails').textContent = stats.totalEmails;
    document.getElementById('totalRevenue').textContent = `₹${stats.totalRevenue}`;
}

// Load Users Data
async function loadUsersData() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            populateUsersTable(data.users);
        }
    } catch (error) {
        console.error('Failed to load users data:', error);
    }
}

// Populate Users Table
function populateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.email}</td>
            <td>
                <span class="plan-badge ${user.plan}">${user.plan}</span>
            </td>
            <td>${user.apiCalls}/${user.maxApiCalls}</td>
            <td>
                <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                    ${user.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="btn-primary" onclick="editUser('${user._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-outline" onclick="deleteUser('${user._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load Payments Data
async function loadPaymentsData() {
    try {
        const response = await fetch(`${API_BASE}/admin/payments`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            populatePaymentsTable(data.payments);
        }
    } catch (error) {
        console.error('Failed to load payments data:', error);
    }
}

// Populate Payments Table
function populatePaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = '';

    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.userId?.email || 'N/A'}</td>
            <td>₹${payment.amount}</td>
            <td>${payment.utrNumber || 'Pending'}</td>
            <td>
                <span class="status-badge ${payment.status}">${payment.status}</span>
            </td>
            <td>${new Date(payment.createdAt).toLocaleDateString()}</td>
            <td>
                ${payment.status === 'submitted' ? `
                    <button class="btn-success" onclick="approvePayment('${payment._id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Approve Payment
async function approvePayment(paymentId) {
    if (!confirm('Are you sure you want to approve this payment?')) return;

    try {
        const response = await fetch(`${API_BASE}/admin/payments/${paymentId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showAdminNotification('Payment approved successfully!', 'success');
            loadPaymentsData();
            loadDashboardData();
        } else {
            showAdminNotification(data.message, 'error');
        }
    } catch (error) {
        showAdminNotification('Approval failed', 'error');
    }
}

// Search Users
async function searchUsers() {
    const searchTerm = this.value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/users?search=${searchTerm}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            populateUsersTable(data.users);
        }
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Load Emails Data
async function loadEmailsData() {
    try {
        const response = await fetch(`${API_BASE}/admin/emails`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            populateEmailsTable(data.emails);
        }
    } catch (error) {
        console.error('Failed to load emails data:', error);
    }
}

// Populate Emails Table
function populateEmailsTable(emails) {
    const tbody = document.getElementById('emailsTableBody');
    tbody.innerHTML = '';

    emails.forEach(email => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${email.emailAddress}</td>
            <td>${email.userId?.email || 'N/A'}</td>
            <td>${email.messages?.length || 0} messages</td>
            <td>${new Date(email.createdAt).toLocaleDateString()}</td>
            <td>
                <span class="status-badge ${email.isActive ? 'active' : 'inactive'}">
                    ${email.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Show Admin Notification
function showAdminNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Edit User (Placeholder)
function editUser(userId) {
    showAdminNotification('Edit user functionality coming soon', 'info');
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showAdminNotification('User deleted successfully', 'success');
            loadUsersData();
            loadDashboardData();
        } else {
            showAdminNotification(data.message, 'error');
        }
    } catch (error) {
        showAdminNotification('Deletion failed', 'error');
    }
}