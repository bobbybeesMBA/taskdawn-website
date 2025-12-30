/**
 * Task Dawn Setup Wizard - Simplified SPA Logic
 * Option A: Each user provides their own Google OAuth credentials
 * Version: 2.0.0
 */

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
    currentStep: 1,
    user: {
        email: null,
        clientId: null,
        clientSecret: null,
        refreshToken: null,
        accessToken: null,
        isAuthorized: false
    }
};

// ============================================
// GOOGLE OAUTH FUNCTIONS
// ============================================

function initiateGoogleOAuth() {
    const clientId = document.getElementById('google-client-id').value.trim();
    const clientSecret = document.getElementById('google-client-secret').value.trim();
    
    if (!clientId || !clientSecret) {
        alert('Please enter both your Google Client ID and Client Secret!');
        return;
    }
    
    // Save credentials to state
    AppState.user.clientId = clientId;
    AppState.user.clientSecret = clientSecret;
    
    // Save to session storage for after redirect
    sessionStorage.setItem('taskdawn_client_id', clientId);
    sessionStorage.setItem('taskdawn_client_secret', clientSecret);
    
    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = [
        'https://www.googleapis.com/auth/tasks.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');
    
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
        'client_id=' + encodeURIComponent(clientId) +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&response_type=code' +
        '&scope=' + encodeURIComponent(scopes) +
        '&access_type=offline' +
        '&prompt=consent';
    
    // Redirect to Google
    window.location.href = authUrl;
}

async function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    
    if (error) {
        alert('Google OAuth Error: ' + error);
        return;
    }
    
    if (code) {
        // Restore credentials from session storage
        const clientId = sessionStorage.getItem('taskdawn_client_id');
        const clientSecret = sessionStorage.getItem('taskdawn_client_secret');
        
        if (!clientId || !clientSecret) {
            alert('Session expired. Please start over.');
            return;
        }
        
        AppState.user.clientId = clientId;
        AppState.user.clientSecret = clientSecret;
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Exchange code for tokens
        await exchangeCodeForTokens(code);
    }
}

async function exchangeCodeForTokens(code) {
    updateAuthStatus('Connecting...', '#CC9900');
    
    const redirectUri = window.location.origin + window.location.pathname;
    
    try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code,
                client_id: AppState.user.clientId,
                client_secret: AppState.user.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }
        
        if (!tokenData.refresh_token) {
            throw new Error('No refresh token received. Please try again.');
        }
        
        AppState.user.accessToken = tokenData.access_token;
        AppState.user.refreshToken = tokenData.refresh_token;
        
        // Get user's email
        await fetchUserEmail(tokenData.access_token);
        
        // Mark as authorized
        AppState.user.isAuthorized = true;
        
        // Clear session storage
        sessionStorage.removeItem('taskdawn_client_id');
        sessionStorage.removeItem('taskdawn_client_secret');
        
        // Update UI
        updateAuthStatus('Connected!', '#009900');
        document.getElementById('user-email').textContent = AppState.user.email;
        updateSidebarStatus();
        
        // Auto-advance to step 2
        setTimeout(() => goToStep(2), 1000);
        
    } catch (err) {
        console.error('Token exchange error:', err);
        updateAuthStatus('Error: ' + err.message, '#CC0000');
        alert('Authentication failed: ' + err.message);
    }
}

async function fetchUserEmail(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch user info');
    }
    
    const userInfo = await response.json();
    AppState.user.email = userInfo.email;
}

// ============================================
// UI FUNCTIONS
// ============================================

function updateAuthStatus(message, color) {
    const statusEl = document.getElementById('auth-status');
    statusEl.innerHTML = '<b>' + message + '</b>';
    statusEl.style.color = color;
}

function updateSidebarStatus() {
    const statusGoogle = document.getElementById('status-google');
    const statusComplete = document.getElementById('status-complete');
    
    if (AppState.user.isAuthorized) {
        statusGoogle.innerHTML = '&#9745; Google: Connected';
        statusGoogle.style.color = '#009900';
    }
    
    if (AppState.currentStep === 2) {
        statusComplete.innerHTML = '&#9745; Registration: Done';
        statusComplete.style.color = '#009900';
    }
}

function updateProgressBar() {
    const fill = document.getElementById('progress-bar-fill');
    const percentage = AppState.currentStep === 1 ? 25 : 100;
    fill.style.width = percentage + '%';
}

function updateStepIndicators(step) {
    for (let i = 1; i <= 2; i++) {
        const prog = document.getElementById('progress-step-' + i);
        const nav = document.getElementById('nav-step-' + i);
        
        if (prog) {
            prog.classList.remove('progress-active', 'progress-completed');
            if (i < step) prog.classList.add('progress-completed');
            else if (i === step) prog.classList.add('progress-active');
        }
        
        if (nav) {
            nav.classList.remove('active-step', 'completed-step');
            if (i < step) nav.classList.add('completed-step');
            else if (i === step) nav.classList.add('active-step');
        }
    }
}

function goToStep(step) {
    // Validate step transition
    if (step === 2 && !AppState.user.isAuthorized) {
        alert('Please connect your Google account first!');
        return;
    }
    
    // Hide all steps
    document.getElementById('step-1-content').style.display = 'none';
    document.getElementById('step-2-content').style.display = 'none';
    
    // Show target step
    document.getElementById('step-' + step + '-content').style.display = 'block';
    
    // Update state
    AppState.currentStep = step;
    
    // Update UI
    updateProgressBar();
    updateStepIndicators(step);
    updateSidebarStatus();
    
    // If step 2, populate the admin JSON
    if (step === 2) {
        populateAdminJson();
    }
}

function populateAdminJson() {
    const json = {
        name: AppState.user.email.split('@')[0],
        email: AppState.user.email,
        google_client_id: AppState.user.clientId,
        google_client_secret: AppState.user.clientSecret,
        google_refresh_token: AppState.user.refreshToken
    };
    
    document.getElementById('admin-json').value = JSON.stringify(json, null, 2);
    document.getElementById('success-email').textContent = AppState.user.email;
}

function copyAdminJson() {
    const textarea = document.getElementById('admin-json');
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile
    
    try {
        document.execCommand('copy');
        document.getElementById('copy-status').textContent = '✓ Copied!';
        setTimeout(() => {
            document.getElementById('copy-status').textContent = '';
        }, 2000);
    } catch (err) {
        // Fallback for modern browsers
        navigator.clipboard.writeText(textarea.value).then(() => {
            document.getElementById('copy-status').textContent = '✓ Copied!';
            setTimeout(() => {
                document.getElementById('copy-status').textContent = '';
            }, 2000);
        }).catch(() => {
            alert('Copy failed. Please select and copy manually.');
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check for OAuth callback
    handleOAuthCallback();
    
    // Initialize UI
    updateProgressBar();
    updateStepIndicators(1);
});
