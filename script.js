// API Base URL
const API_BASE = 'http://localhost:5000/api';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const userMenu = document.getElementById('userMenu');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const generateBtn = document.getElementById('generateBtn');
const emailDisplay = document.getElementById('emailDisplay');

// Authentication State
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

// Check if user is logged in
async function checkAuthStatus() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showUserMenu();
        } else {
            localStorage.removeItem('authToken');
            authToken = null;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth Buttons
    loginBtn.addEventListener('click', () => showModal('loginModal'));
    registerBtn.addEventListener('click', () => showModal('registerModal'));

    // Modal Closes
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Email Generation
    generateBtn.addEventListener('click', generateTempEmail);
    document.getElementById('copyEmail').addEventListener('click', copyEmail);

    // Show Register Modal
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('registerModal');
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Show/Hide Modals
function showModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById(modalId).style.display = 'block';
}

// Handle User Login
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showUserMenu();
            showModal('none');
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Login failed. Please try again.', 'error');
    }
}

// Handle User Registration
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const plan = formData.get('plan');

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, plan })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Registration successful! Please login.', 'success');
            showModal('loginModal');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Registration failed. Please try again.', 'error');
    }
}

// Generate Temporary Email
async function generateTempEmail() {
    if (!currentUser) {
        showModal('loginModal');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/email/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('generatedEmail').textContent = data.email.address;
            emailDisplay.style.display = 'flex';
            showNotification('Email generated successfully!', 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to generate email', 'error');
    }
}

// Copy Email to Clipboard
function copyEmail() {
    const email = document.getElementById('generatedEmail').textContent;
    navigator.clipboard.writeText(email).then(() => {
        showNotification('Email copied to clipboard!', 'success');
    });
}

// Show User Menu
function showUserMenu() {
    document.querySelector('.auth-buttons').style.display = 'none';
    userMenu.style.display = 'flex';
    document.getElementById('userEmail').textContent = currentUser.email;
}

// Handle Logout
function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    userMenu.style.display = 'none';
    document.querySelector('.auth-buttons').style.display = 'flex';
    showNotification('Logged out successfully', 'success');
}

// Show Notification
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 3000;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Plan Selection
function selectPlan(plan) {
    if (!currentUser) {
        showModal('registerModal');
        return;
    }

    if (plan === 'premium') {
        initiatePayment();
    } else {
        showNotification('Free plan activated!', 'success');
    }
}

// Initiate Payment
async function initiatePayment() {
    try {
        const response = await fetch(`${API_BASE}/payment/initiate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan: 'premium' })
        });

        const data = await response.json();

        if (data.success) {
            showPaymentModal(data.payment, data.qrCode);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Payment initiation failed', 'error');
    }
}

// Show Payment Modal
function showPaymentModal(payment, qrCode) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Complete Payment</h2>
            <div class="payment-info">
                <p><strong>Amount:</strong> ₹${payment.amount}</p>
                <p><strong>UPI ID:</strong> ${payment.upiId}</p>
                <p><strong>Note:</strong> ${payment.note}</p>
            </div>
            <div class="qr-code">
                <img src="${qrCode}" alt="QR Code">
            </div>
            <form id="paymentProofForm">
                <input type="text" placeholder="UTR Number" required>
                <input type="text" placeholder="Screenshot URL" required>
                <button type="submit" class="btn-primary">Submit Proof</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });

    // Submit proof
    modal.querySelector('#paymentProofForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitPaymentProof(payment.id, modal);
    });
}

// Submit Payment Proof
async function submitPaymentProof(paymentId, modal) {
    const formData = new FormData(modal.querySelector('#paymentProofForm'));
    
    try {
        const response = await fetch(`${API_BASE}/payment/submit-proof`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentId,
                utrNumber: formData.get('utrNumber'),
                screenshot: formData.get('screenshot')
            })
        });

        const data = await response.json();

        if (data.success) {
            modal.remove();
            showNotification('Payment proof submitted! Waiting for approval.', 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Submission failed', 'error');
    }
}