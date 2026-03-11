// API Configuration
const API_URL = 'https://donationmanagement-backend-2.onrender.com';

async function debugCampaignStatus() {
    console.log('🔍 Checking campaign status...');
    const token = localStorage.getItem('token');
    
    try {
        // Check all campaigns
        const response = await fetch(`${API_URL}/campaigns/`);
        if (response.ok) {
            const campaigns = await response.json();
            console.log('📊 All campaigns:', campaigns);
            console.log('📊 Total campaigns:', campaigns.length);
            
            const active = campaigns.filter(c => c.status === 'active');
            const pending = campaigns.filter(c => c.status === 'pending');
            
            console.log('✅ Active campaigns:', active.length);
            console.log('⏳ Pending campaigns:', pending.length);
            
            if (active.length === 0) {
                console.log('⚠️ No active campaigns found! NGOs need to activate their campaigns.');
            }
        }
        
        // If user is NGO, check their campaigns
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'ngo') {
            const ngoResponse = await fetch(`${API_URL}/campaigns/ngo/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (ngoResponse.ok) {
                const ngoCampaigns = await ngoResponse.json();
                console.log('🏢 Your campaigns:', ngoCampaigns);
            }
        }
    } catch (error) {
        console.error('Debug error:', error);
    }
}

// Authentication check on every page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    checkAuth();
    
    // Update navigation based on auth status
    updateNavigation();
    
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Load page-specific content
    loadPageContent();
});

// Check authentication status
async function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Protected pages that require authentication
    const protectedPages = ['dashboard.html'];
    
    if (protectedPages.includes(currentPage)) {
        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = 'index.html';
            return;
        }
        
        // Validate token with backend
        const isValid = await validateToken(token);
        if (!isValid) {
            console.log('Token invalid, logging out');
            logout();
        }
    }
}

// Validate token with backend
async function validateToken(token) {
    try {
        console.log('Validating token...');
        const response = await fetch(`${API_URL}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Token validation response:', response.status);
        
        if (response.status === 422) {
            console.log('Token validation failed - 422 error');
            return false;
        }
        
        return response.ok;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

// Update navigation based on login status
function updateNavigation() {
    const nav = document.querySelector('.navbar-nav');
    if (!nav) return;
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user && user.username) {
        // User is logged in
        nav.innerHTML = `
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('campaigns') ? 'active' : ''}" href="campaigns.html">
                    <i class="fas fa-campaigns me-1"></i>Campaigns
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('about') ? 'active' : ''}" href="about.html">
                    <i class="fas fa-info-circle me-1"></i>About
                </a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle btn btn-light text-primary px-4 ms-3" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user-circle me-2"></i>${user.full_name || user.username}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="dashboard.html">
                        <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()">
                        <i class="fas fa-sign-out-alt me-2"></i>Logout
                    </a></li>
                </ul>
            </li>
        `;
    } else {
        // User is not logged in
        nav.innerHTML = `
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('campaigns') ? 'active' : ''}" href="campaigns.html">
                    <i class="fas fa-campaigns me-1"></i>Campaigns
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('about') ? 'active' : ''}" href="about.html">
                    <i class="fas fa-info-circle me-1"></i>About
                </a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle btn btn-light text-primary px-4 ms-3" href="#" id="loginDropdown" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-sign-in-alt me-2"></i>Login
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="index.html">
                        <i class="fas fa-sign-in-alt me-2"></i>Login
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="register.html?type=user">
                        <i class="fas fa-user me-2"></i>Register as User
                    </a></li>
                    <li><a class="dropdown-item" href="register.html?type=ngo">
                        <i class="fas fa-building me-2"></i>Register as NGO
                    </a></li>
                </ul>
            </li>
        `;
    }
}
// Activate Campaign
window.activateCampaign = async function(campaignId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showNotification('Please login', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to activate this campaign? It will be visible to all users.')) {
        return;
    }
    
    try {
        showNotification('Activating campaign...', 'info');
        
        const response = await fetch(`${API_URL}/campaigns/${campaignId}/activate`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Campaign activated successfully!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showNotification(data.detail || 'Activation failed', 'danger');
        }
    } catch (error) {
        console.error('Activation error:', error);
        showNotification('Activation failed', 'danger');
    }
};

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';
    submitBtn.disabled = true;
    
    try {
        console.log('Attempting login for:', username);
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (response.ok) {
            // Store token and user data
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showNotification('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showNotification(data.detail || 'Invalid username or password', 'danger');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    
    const userType = document.getElementById('userType').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone')?.value || '';
    const address = document.getElementById('address')?.value || '';
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Registering...';
    submitBtn.disabled = true;
    
    try {
        console.log('Attempting registration for:', username);
        
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                email,
                full_name: fullName,
                role: userType,
                phone,
                address
            })
        });
        
        const data = await response.json();
        console.log('Registration response:', data);
        
        if (response.ok) {
            showNotification('Registration successful! Please login.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showNotification(data.detail || 'Registration failed', 'danger');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'danger');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Logout function
window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
};

// Show notification
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg`;
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Load page-specific content
function loadPageContent() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    
    if (path === 'dashboard.html') {
        loadDashboard();
    } else if (path === 'campaigns.html') {
        loadCampaigns();
    } else if (path === 'index.html') {
        loadHomeCampaigns();
    }
}

// Load Dashboard
async function loadDashboard() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user || !user.username) {
        console.log('No token or user found, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    debugCampaignStatus();
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) return;
    
    // Show loading
    dashboardContent.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading your dashboard...</p>
        </div>
    `;
    
    try {
        console.log('Loading dashboard with token');
        
        const response = await fetch(`${API_URL}/users/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Dashboard response status:', response.status);
        
        if (response.status === 401) {
            console.log('Unauthorized - token invalid');
            logout();
            return;
        }
        
        if (response.status === 422) {
            console.log('Unprocessable content - check token format');
            showNotification('Authentication error. Please login again.', 'danger');
            logout();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Failed to load dashboard: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dashboard data received:', data);
        
        // Update dashboard title
        document.getElementById('dashboardTitle').textContent = `${(user.role || 'User').toUpperCase()} Dashboard`;
        document.getElementById('welcomeMessage').textContent = 
            `Welcome back, ${user.full_name || user.username}! Here's what's happening.`;
        
        // Load role-specific content
        if (user.role === 'ngo') {
            // For NGO, load their full campaigns list
            await loadNgoCampaigns();
        } else if (user.role === 'user') {
            // For users, load active campaigns separately
            const activeCampaigns = await loadActiveCampaigns();
            renderUserDashboard(data, activeCampaigns);
        } else {
            // For admin
            renderDashboard(user.role || 'user', data);
        }
        
    } catch (error) {
        console.error('Dashboard error:', error);
        dashboardContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to load dashboard. Error: ${error.message}
                <br>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt me-2"></i>Retry
                </button>
            </div>
        `;
    }
}

// Load active campaigns for user dashboard
async function loadActiveCampaigns() {
    console.log('🔍 Fetching active campaigns from:', `${API_URL}/campaigns/?status=active`);
    
    try {
        const response = await fetch(`${API_URL}/campaigns/?status=active`);
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
            const campaigns = await response.json();
            console.log('✅ Campaigns received:', campaigns.length);
            
            if (campaigns.length > 0) {
                console.log('📊 First campaign:', campaigns[0]);
            } else {
                console.log('⚠️ No active campaigns found!');
                console.log('💡 Possible reasons:');
                console.log('   1. NGOs need to click "Activate" on their campaigns');
                console.log('   2. Campaigns might have status="pending"');
                console.log('   3. Check if campaigns exist in database');
                
                // Try fetching all campaigns to debug
                const allResponse = await fetch(`${API_URL}/campaigns/`);
                if (allResponse.ok) {
                    const allCampaigns = await allResponse.json();
                    console.log('📊 All campaigns in DB:', allCampaigns.length);
                    const pendingCount = allCampaigns.filter(c => c.status === 'pending').length;
                    const activeCount = allCampaigns.filter(c => c.status === 'active').length;
                    console.log(`   Active: ${activeCount}, Pending: ${pendingCount}`);
                }
            }
            
            return campaigns;
        } else {
            console.log('❌ Failed to fetch campaigns. Status:', response.status);
            const errorText = await response.text();
            console.log('❌ Error details:', errorText);
            return [];
        }
    } catch (error) {
        console.error('❌ Error loading active campaigns:', error);
        return [];
    }
}

// Load NGO's full campaigns list
async function loadNgoCampaigns() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
        const response = await fetch(`${API_URL}/campaigns/ngo/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const campaigns = await response.json();
            renderNgoDashboard(campaigns);
        }
    } catch (error) {
        console.error('Error loading NGO campaigns:', error);
    }
}

// Render NGO Dashboard with full campaigns
function renderNgoDashboard(campaigns) {
    const dashboardContent = document.getElementById('dashboardContent');
    
    // Calculate stats
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const pendingCampaigns = campaigns.filter(c => c.status === 'pending').length;
    const totalRaised = campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0);
    
    let campaignsHTML = '';
    if (campaigns.length === 0) {
        campaignsHTML = '<p class="text-muted text-center">You haven\'t created any campaigns yet</p>';
    } else {
        campaignsHTML = campaigns.map(c => {
            const progress = ((c.raised_amount || 0) / (c.goal_amount || 1)) * 100;
            const itemProgress = c.required_items ? 
                c.required_items.reduce((sum, item) => sum + ((item.quantity_collected || 0) / item.quantity_needed * 100), 0) / c.required_items.length : 0;
            
            return `
                <div class="col-md-6 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="badge ${c.status === 'active' ? 'bg-success' : c.status === 'pending' ? 'bg-warning' : 'bg-secondary'} mb-2">
                                        ${c.status}
                                    </span>
                                    <span class="badge bg-info mb-2 ms-1">${c.campaign_type || 'money'}</span>
                                </div>
                                <small class="text-muted">${new Date(c.created_at).toLocaleDateString()}</small>
                            </div>
                            
                            <h5 class="mt-2">${c.title}</h5>
                            <p class="text-muted small">${c.description || ''}</p>
                            
                            ${c.campaign_type !== 'items' ? `
                                <div class="mt-3">
                                    <div class="d-flex justify-content-between small">
                                        <span>Raised: ₹${(c.raised_amount || 0).toLocaleString()}</span>
                                        <span>Goal: ₹${(c.goal_amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div class="progress mt-1" style="height: 5px;">
                                        <div class="progress-bar bg-success" style="width: ${progress}%"></div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${c.required_items && c.required_items.length > 0 ? `
                                <div class="mt-3">
                                    <h6 class="small">Items Progress:</h6>
                                    <div class="progress mb-2" style="height: 5px;">
                                        <div class="progress-bar bg-info" style="width: ${itemProgress}%"></div>
                                    </div>
                                    <div class="small">
                                        ${c.required_items.map(item => `
                                            <div class="d-flex justify-content-between">
                                                <span>${item.item_name}:</span>
                                                <span>${item.quantity_collected || 0}/${item.quantity_needed} ${item.unit}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="mt-3 d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="viewCampaignDetails('${c.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                ${c.status === 'pending' ? `
                                    <button class="btn btn-sm btn-success" onclick="activateCampaign('${c.id}')">
                                        <i class="fas fa-check-circle"></i> Activate
                                    </button>
                                ` : ''}
                                ${c.status === 'active' ? `
                                    <button class="btn btn-sm btn-outline-success" onclick="donateMoney('${c.id}')">
                                        <i class="fas fa-money-bill"></i> Add Money
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    dashboardContent.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-3 mb-3">
                <div class="card bg-primary text-white">
                    <div class="card-body">
                        <h6>Total Campaigns</h6>
                        <h3>${totalCampaigns}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-success text-white">
                    <div class="card-body">
                        <h6>Active</h6>
                        <h3>${activeCampaigns}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-warning text-white">
                    <div class="card-body">
                        <h6>Pending</h6>
                        <h3>${pendingCampaigns}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-info text-white">
                    <div class="card-body">
                        <h6>Total Raised</h6>
                        <h3>₹${totalRaised.toLocaleString()}</h3>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">My Campaigns</h5>
                        <button class="btn btn-primary btn-sm" onclick="createCampaign()">
                            <i class="fas fa-plus me-2"></i>New Campaign
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${campaignsHTML}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}// Render Dashboard based on role (for admin)
function renderDashboard(role, data) {
    const dashboardContent = document.getElementById('dashboardContent');
    
    let statsHTML = '';
    let additionalHTML = '';
    
    // Common stats for all roles
    statsHTML = `
        <div class="row mb-4">
            <div class="col-md-3 mb-3">
                <div class="card bg-primary text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-hand-holding-heart fa-2x mb-2"></i>
                        <h6 class="text-white-50">Total Donations</h6>
                        <h3>₹${(data.total_donations || 0).toLocaleString()}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-success text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-campaigns fa-2x mb-2"></i>
                        <h6 class="text-white-50">Total Campaigns</h6>
                        <h3>${data.total_campaigns || 0}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-info text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-building fa-2x mb-2"></i>
                        <h6 class="text-white-50">Total NGOs</h6>
                        <h3>${data.total_ngos || 0}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-warning text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <h6 class="text-white-50">Total Users</h6>
                        <h3>${data.total_users || 0}</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Admin specific content
    additionalHTML = `
        <div class="row">
            <div class="col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-header bg-white">
                        <h5 class="mb-0">Recent Donations</h5>
                    </div>
                    <div class="card-body">
                        ${renderRecentDonations(data.recent_donations)}
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-header bg-white">
                        <h5 class="mb-0">Recent Campaigns</h5>
                    </div>
                    <div class="card-body">
                        ${renderRecentCampaigns(data.recent_campaigns)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    dashboardContent.innerHTML = statsHTML + additionalHTML;
}

// Render User Dashboard with separate active campaigns
function renderUserDashboard(stats, activeCampaigns) {
    const dashboardContent = document.getElementById('dashboardContent');
    
    // Calculate user-specific stats
    const totalDonated = stats.recent_donations ? 
        stats.recent_donations.reduce((sum, d) => sum + (d.amount || 0), 0) : 0;
    
    const uniqueNgos = stats.recent_donations ? 
        [...new Set(stats.recent_donations.map(d => d.campaign_id))].length : 0;
    
    // Stats cards
    const statsHTML = `
        <div class="row mb-4">
            <div class="col-md-3 mb-3">
                <div class="card bg-primary text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-hand-holding-heart fa-2x mb-2"></i>
                        <h6 class="text-white-50">My Donations</h6>
                        <h3>${stats.recent_donations ? stats.recent_donations.length : 0}</h3>
                        <small>Total: ₹${totalDonated.toLocaleString()}</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-success text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-building fa-2x mb-2"></i>
                        <h6 class="text-white-50">NGOs Supported</h6>
                        <h3>${uniqueNgos}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-info text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-campaigns fa-2x mb-2"></i>
                        <h6 class="text-white-50">Active Campaigns</h6>
                        <h3>${activeCampaigns.length}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-warning text-white h-100">
                    <div class="card-body">
                        <i class="fas fa-bell fa-2x mb-2"></i>
                        <h6 class="text-white-50">Notifications</h6>
                        <h3 id="userNotificationCount">0</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Active campaigns HTML
    let campaignsHTML = '';
    if (activeCampaigns.length === 0) {
        campaignsHTML = '<p class="text-muted text-center py-4">No active campaigns at the moment</p>';
    } else {
        campaignsHTML = activeCampaigns.slice(0, 4).map(campaign => {
            const progress = ((campaign.raised_amount || 0) / (campaign.goal_amount || 1)) * 100;
            
            // Generate items HTML if exists
            let itemsHTML = '';
            if (campaign.required_items && campaign.required_items.length > 0) {
                itemsHTML = `
                    <div class="mt-2 small">
                        <strong>Items needed:</strong>
                        ${campaign.required_items.slice(0, 2).map(item => `
                            <div class="d-flex justify-content-between">
                                <span>${item.item_name}:</span>
                                <span>${item.quantity_collected || 0}/${item.quantity_needed} ${item.unit}</span>
                            </div>
                        `).join('')}
                        ${campaign.required_items.length > 2 ? 
                            `<small class="text-muted">+${campaign.required_items.length - 2} more items</small>` : ''}
                    </div>
                `;
            }
            
            return `
                <div class="col-md-6 mb-3">
                    <div class="card h-100 campaign-card shadow-sm border-0 rounded-3">
                        <img src="${campaign.image_url || 'https://images.unsplash.com/photo-1488521787991-0c7e7c3d6b9d'}" 
                             class="card-img-top rounded-top-3" style="height: 150px; object-fit: cover;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <span class="badge bg-success me-1">${campaign.category || 'General'}</span>
                                    <span class="badge bg-info">${campaign.campaign_type || 'money'}</span>
                                </div>
                                <small class="text-muted">by ${campaign.ngo_name || 'NGO'}</small>
                            </div>
                            <h6 class="card-title fw-bold mb-2">${campaign.title}</h6>
                            <p class="card-text small text-muted mb-2">${campaign.description ? campaign.description.substring(0, 60) + '...' : 'Help make a difference!'}</p>
                            
                            ${campaign.campaign_type !== 'items' ? `
                                <div class="progress mb-2" style="height: 5px;">
                                    <div class="progress-bar bg-success" style="width: ${progress}%"></div>
                                </div>
                                <div class="d-flex justify-content-between small mb-2">
                                    <span><strong>₹${(campaign.raised_amount || 0).toLocaleString()}</strong> raised</span>
                                    <span>Goal: ₹${(campaign.goal_amount || 0).toLocaleString()}</span>
                                </div>
                            ` : ''}
                            
                            ${itemsHTML}
                            
                            <div class="d-grid gap-2 mt-3">
                                ${campaign.campaign_type !== 'items' ? `
                                    <button class="btn btn-primary btn-sm" onclick="donateMoney('${campaign.id}')">
                                        <i class="fas fa-money-bill me-2"></i>Donate Money
                                    </button>
                                ` : ''}
                                
                                ${campaign.campaign_type !== 'money' ? `
                                    <button class="btn btn-success btn-sm" onclick="donateItems('${campaign.id}')">
                                        <i class="fas fa-box me-2"></i>Donate Items
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Recent donations HTML
    let donationsHTML = '';
    if (!stats.recent_donations || stats.recent_donations.length === 0) {
        donationsHTML = `
            <div class="text-center py-4">
                <i class="fas fa-heart fa-3x text-muted mb-3"></i>
                <p class="text-muted">You haven't made any donations yet</p>
                <a href="campaigns.html" class="btn btn-primary btn-sm">Browse Campaigns</a>
            </div>
        `;
    } else {
        donationsHTML = stats.recent_donations.slice(0, 5).map(d => `
            <div class="list-group-item d-flex justify-content-between align-items-center border-0">
                <div>
                    <h6 class="mb-1">${d.campaign_title || 'Campaign'}</h6>
                    <small class="text-muted">${d.donated_at ? new Date(d.donated_at).toLocaleDateString() : 'N/A'}</small>
                </div>
                <span class="badge bg-success rounded-pill">₹${(d.amount || 0).toLocaleString()}</span>
            </div>
        `).join('');
    }
    
    dashboardContent.innerHTML = `
        ${statsHTML}
        
        <div class="row">
            <div class="col-lg-8 mb-4">
                <div class="card h-100 border-0 shadow-sm rounded-4">
                    <div class="card-header bg-white border-0 pt-4 d-flex justify-content-between align-items-center">
                        <h5 class="fw-bold mb-0">
                            <i class="fas fa-campaigns text-primary me-2"></i>Active Campaigns
                        </h5>
                        <a href="campaigns.html" class="btn btn-outline-primary btn-sm rounded-pill px-3">
                            View All <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${campaignsHTML}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-4 mb-4">
                <div class="card h-100 border-0 shadow-sm rounded-4">
                    <div class="card-header bg-white border-0 pt-4">
                        <h5 class="fw-bold mb-0">
                            <i class="fas fa-history text-primary me-2"></i>My Recent Donations
                        </h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="list-group list-group-flush">
                            ${donationsHTML}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load notification count
    loadNotificationsCount();
}

// Load notifications count
async function loadNotificationsCount() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/users/notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const notifications = await response.json();
            const unread = notifications.filter(n => !n.read).length;
            const badge = document.getElementById('userNotificationCount');
            if (badge) {
                badge.textContent = unread;
                if (unread === 0) {
                    badge.style.opacity = '0.5';
                }
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Helper functions for rendering tables and lists
function renderRecentDonations(donations) {
    if (!donations || donations.length === 0) {
        return '<p class="text-muted text-center my-3">No recent donations</p>';
    }
    
    return `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Donor</th>
                        <th>Campaign</th>
                        <th>Amount</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${donations.slice(0, 5).map(d => `
                        <tr>
                            <td>${d.user_name || 'Anonymous'}</td>
                            <td>${d.campaign_title || 'Campaign'}</td>
                            <td>₹${(d.amount || 0).toLocaleString()}</td>
                            <td>${d.donated_at ? new Date(d.donated_at).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderRecentCampaigns(campaigns) {
    if (!campaigns || campaigns.length === 0) {
        return '<p class="text-muted text-center my-3">No recent campaigns</p>';
    }
    
    return `
        <div class="list-group">
            ${campaigns.slice(0, 5).map(c => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${c.title || 'Untitled'}</h6>
                        <small class="text-muted">by ${c.ngo_name || 'NGO'}</small>
                    </div>
                    <span class="badge ${c.status === 'active' ? 'bg-success' : 'bg-warning'}">
                        ${c.status || 'pending'}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

// Campaign creation with items
window.createCampaign = async function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'ngo') {
        showNotification('Only NGOs can create campaigns', 'warning');
        return;
    }
    
    // Campaign details
    const title = prompt('Enter campaign title:');
    if (!title) return;
    
    const description = prompt('Enter campaign description:');
    if (!description) return;
    
    const category = prompt('Enter category (Education/Healthcare/Food/Emergency):', 'Education');
    
    const campaignType = prompt('Campaign type? (money/items/both):', 'both');
    
    let goal_amount = 0;
    let required_items = [];
    
    if (campaignType === 'money' || campaignType === 'both') {
        const goalInput = prompt('Enter monetary goal amount (₹):', '0');
        goal_amount = parseFloat(goalInput) || 0;
    }
    
    if (campaignType === 'items' || campaignType === 'both') {
        const hasItems = confirm('Do you want to add required items?');
        if (hasItems) {
            let addMore = true;
            while (addMore) {
                const itemName = prompt('Item name:');
                if (!itemName) break;
                
                const quantity = parseInt(prompt('Quantity needed:'), 10);
                if (isNaN(quantity)) break;
                
                const unit = prompt('Unit (pieces/kg/liters/boxes):', 'pieces');
                
                required_items.push({
                    item_name: itemName,
                    quantity_needed: quantity,
                    quantity_collected: 0,
                    unit: unit,
                    is_urgent: confirm('Is this item urgent?')
                });
                
                addMore = confirm('Add another item?');
            }
        }
    }
    
    const pickupRequired = campaignType !== 'money' ? confirm('Is pickup required for items?') : false;
    let pickup_address = '';
    if (pickupRequired) {
        pickup_address = prompt('Enter pickup address:') || '';
    }
    
    try {
        showNotification('Creating campaign...', 'info');
        
        const response = await fetch(`${API_URL}/campaigns/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                category,
                campaign_type: campaignType,
                goal_amount,
                required_items,
                pickup_required: pickupRequired,
                pickup_address
            })
        });
        
        if (response.ok) {
            showNotification('Campaign created successfully! Pending approval.', 'success');
            setTimeout(() => window.location.reload(), 2000);
        } else {
            const data = await response.json();
            showNotification(data.detail || 'Creation failed', 'danger');
        }
    } catch (error) {
        console.error('Campaign creation error:', error);
        showNotification('Campaign creation failed', 'danger');
    }
};

// Donate Money
window.donateMoney = async function(campaignId) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user || !user.username) {
        showNotification('Please login to donate', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    if (user.role !== 'user') {
        showNotification('Only users can donate to campaigns', 'warning');
        return;
    }
    
    const amount = prompt('Enter donation amount (₹):', '100');
    if (!amount) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        showNotification('Please enter a valid amount', 'danger');
        return;
    }
    
    try {
        showNotification('Processing donation...', 'info');
        
        // Send as JSON
        const response = await fetch(`${API_URL}/donations/money`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                campaign_id: campaignId,
                amount: amountNum
                // payment_method is optional
            })
        });
        
        const data = await response.json();
        console.log('Donation response:', data);
        
        if (response.ok) {
            showNotification(`Thank you for donating ₹${amountNum}!`, 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showNotification(data.detail || 'Donation failed', 'danger');
        }
    } catch (error) {
        console.error('Donation error:', error);
        showNotification('Donation failed. Please try again.', 'danger');
    }
};
// Donate Items
window.donateItems = async function(campaignId) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'user') {
        showNotification('Please login as user to donate', 'warning');
        return;
    }
    
    const items = [];
    let addMore = true;
    
    while (addMore) {
        const itemName = prompt('Item name:');
        if (!itemName) break;
        
        const quantity = parseInt(prompt('Quantity:'), 10);
        if (isNaN(quantity)) break;
        
        const unit = prompt('Unit (pieces/kg/liters/boxes):', 'pieces');
        const condition = prompt('Condition (new/gently_used/used):', 'new');
        
        items.push({
            name: itemName,
            quantity,
            unit,
            condition
        });
        
        addMore = confirm('Add another item?');
    }
    
    if (items.length === 0) {
        showNotification('No items added', 'warning');
        return;
    }
    
    const deliveryMethod = prompt('Delivery method (pickup/dropoff):', 'dropoff');
    let pickup_address = '';
    
    if (deliveryMethod === 'pickup') {
        pickup_address = prompt('Enter your pickup address:') || '';
    }
    
    const notes = prompt('Any notes for the volunteer? (optional):') || '';
    
    try {
        showNotification('Processing donation...', 'info');
        
        const response = await fetch(`${API_URL}/donations/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                campaign_id: campaignId,
                items,
                delivery_method: deliveryMethod,
                pickup_address,
                notes
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            setTimeout(() => window.location.reload(), 2000);
        } else {
            showNotification(data.detail || 'Donation failed', 'danger');
        }
    } catch (error) {
        console.error('Item donation error:', error);
        showNotification('Donation failed', 'danger');
    }
};

// Volunteer registration
window.registerAsVolunteer = async function(ngoId) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'user') {
        showNotification('Please login as user to volunteer', 'warning');
        return;
    }
    
    const areas = prompt('Enter available areas (comma-separated):', '')?.split(',').map(s => s.trim()) || [];
    
    try {
        const response = await fetch(`${API_URL}/volunteers/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ngo_id: ngoId,
                available_areas: areas
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Registered as volunteer!', 'success');
        } else {
            showNotification(data.detail || 'Registration failed', 'danger');
        }
    } catch (error) {
        console.error('Volunteer registration error:', error);
        showNotification('Registration failed', 'danger');
    }
};

// View campaign details
window.viewCampaignDetails = function(campaignId) {
    window.location.href = `campaign-details.html?id=${campaignId}`;
};

// Load Campaigns for campaigns page
async function loadCampaigns() {
    try {
        const response = await fetch(`${API_URL}/campaigns/?status=active`);
        if (response.ok) {
            const campaigns = await response.json();
            displayCampaigns(campaigns);
        }
    } catch (error) {
        console.error('Campaigns error:', error);
    }
}

// Display Campaigns on campaigns page
function displayCampaigns(campaigns) {
    const campaignsGrid = document.getElementById('campaignsGrid');
    if (!campaignsGrid) return;
    
    if (!campaigns || campaigns.length === 0) {
        campaignsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-campaigns fa-4x text-muted mb-3"></i>
                <h4>No Active Campaigns</h4>
                <p class="text-muted">Check back later for new campaigns</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    campaigns.forEach((campaign, index) => {
        const progress = ((campaign.raised_amount || 0) / (campaign.goal_amount || 1)) * 100;
        
        // Generate items HTML if exists
        let itemsHTML = '';
        if (campaign.required_items && campaign.required_items.length > 0) {
            itemsHTML = `
                <div class="mt-2 small">
                    <strong>Items needed:</strong>
                    ${campaign.required_items.map(item => `
                        <div class="d-flex justify-content-between">
                            <span>${item.item_name}:</span>
                            <span>${item.quantity_collected || 0}/${item.quantity_needed} ${item.unit}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        html += `
            <div class="col-md-4 mb-4" data-aos="flip-left" data-aos-delay="${index * 100}">
                <div class="card h-100 shadow-sm border-0 rounded-4 campaign-card">
                    <img src="${campaign.image_url || 'https://images.unsplash.com/photo-1488521787991-0c7e7c3d6b9d'}" 
                         class="card-img-top rounded-top-4" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <div class="mb-2">
                            <span class="badge bg-success">${campaign.category || 'General'}</span>
                            <span class="badge bg-info">${campaign.campaign_type || 'money'}</span>
                        </div>
                        <h5 class="card-title">${campaign.title || 'Untitled'}</h5>
                        <p class="card-text text-muted small">by ${campaign.ngo_name || 'NGO'}</p>
                        <p class="card-text">${campaign.description || 'Help make a difference!'}</p>
                        
                        ${campaign.campaign_type !== 'items' ? `
                            <div class="progress mb-2" style="height: 8px;">
                                <div class="progress-bar bg-success" style="width: ${progress}%"></div>
                            </div>
                            <div class="d-flex justify-content-between mb-3 small">
                                <span><strong>₹${(campaign.raised_amount || 0).toLocaleString()}</strong> raised</span>
                                <span>Goal: ₹${(campaign.goal_amount || 0).toLocaleString()}</span>
                            </div>
                        ` : ''}
                        
                        ${itemsHTML}
                        
                        <div class="d-grid gap-2 mt-3">
                            ${campaign.campaign_type !== 'items' ? `
                                <button class="btn btn-primary" onclick="donateMoney('${campaign.id}')">
                                    <i class="fas fa-money-bill me-2"></i>Donate Money
                                </button>
                            ` : ''}
                            
                            ${campaign.campaign_type !== 'money' ? `
                                <button class="btn btn-success" onclick="donateItems('${campaign.id}')">
                                    <i class="fas fa-box me-2"></i>Donate Items
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    campaignsGrid.innerHTML = html;
}

// Load Home Campaigns
async function loadHomeCampaigns() {
    try {
        const response = await fetch(`${API_URL}/campaigns/?status=active`);
        if (response.ok) {
            const campaigns = await response.json();
            const container = document.getElementById('homeCampaigns');
            
            if (container && campaigns && campaigns.length > 0) {
                let html = '';
                campaigns.slice(0, 3).forEach((campaign, index) => {
                    const progress = ((campaign.raised_amount || 0) / (campaign.goal_amount || 1)) * 100;
                    html += `
                        <div class="col-md-4 mb-4" data-aos="flip-left" data-aos-delay="${index * 100}">
                            <div class="card h-100 shadow-sm border-0 rounded-4 campaign-card">
                                <img src="${campaign.image_url || 'https://images.unsplash.com/photo-1488521787991-0c7e7c3d6b9d'}" 
                                     class="card-img-top rounded-top-4" style="height: 200px; object-fit: cover;">
                                <div class="card-body">
                                    <span class="badge bg-success mb-2">${campaign.category || 'General'}</span>
                                    <h5 class="card-title">${campaign.title || 'Untitled'}</h5>
                                    <p class="card-text text-muted">${campaign.description || 'Help make a difference!'}</p>
                                    <div class="progress mb-2" style="height: 8px;">
                                        <div class="progress-bar bg-success" style="width: ${progress}%"></div>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span>Raised: ₹${(campaign.raised_amount || 0).toLocaleString()}</span>
                                        <span>Goal: ₹${(campaign.goal_amount || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
            }
        }
    } catch (error) {
        console.error('Error loading home campaigns:', error);
    }
}
