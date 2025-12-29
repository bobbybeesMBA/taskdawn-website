/**
 * Task Dawn Setup Wizard - SPA Logic
 * Version: 1.0.0 Alpha
 */

const AppState = {
    currentStep: 1,
    totalSteps: 4,
    google: {
        clientId: null,
        clientSecret: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        isAuthorized: false
    },
    icloud: {
        isConfigured: false,
        skipped: false
    },
    github: {
        pat: null,
        username: null,
        repoName: 'task-dawn-engine',
        repoExists: false,
        repoUrl: null,
        isConnected: false
    },
    deployed: false
};

function logToConsole(consoleId, message, type) {
    const el = document.getElementById(consoleId);
    const ts = new Date().toLocaleTimeString();
    const color = type === 'error' ? '#FF0000' : type === 'success' ? '#00FF00' : '#FFFF00';
    el.innerHTML += '<br><font size="1" style="color:' + color + '">[' + ts + '] ' + message + '</font>';
    el.scrollTop = el.scrollHeight;
}

function updateProgressBar() {
    const fill = document.getElementById('progress-bar-fill');
    const pct = ((AppState.currentStep - 1) * 25) + 12.5;
    fill.style.width = Math.min(pct, 100) + '%';
}

function updateStepIndicators(step) {
    for (let i = 1; i <= 4; i++) {
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

function updateSidebarStatus() {
    const sg = document.getElementById('status-google');
    const si = document.getElementById('status-icloud');
    const sh = document.getElementById('status-github');
    const sd = document.getElementById('status-deploy');
    
    if (AppState.google.isAuthorized) {
        sg.innerHTML = '&#9745; Google: Connected';
        sg.style.color = '#009900';
    }
    if (AppState.icloud.isConfigured || AppState.icloud.skipped) {
        si.innerHTML = AppState.icloud.skipped ? '&#9744; iCloud: Skipped' : '&#9745; iCloud: Configured';
        si.style.color = AppState.icloud.skipped ? '#666666' : '#009900';
    }
    if (AppState.github.isConnected) {
        sh.innerHTML = '&#9745; GitHub: Connected';
        sh.style.color = '#009900';
    }
    if (AppState.deployed) {
        sd.innerHTML = '&#9745; Deploy: Complete';
        sd.style.color = '#009900';
    }
}

function goToStep(step) {
    if (step === 2 && !AppState.google.isAuthorized) {
        alert('Please complete Google authorization first!');
        return;
    }
    if (step === 3 && !AppState.icloud.isConfigured && !AppState.icloud.skipped) {
        alert('Please complete or skip iCloud setup first!');
        return;
    }
    if (step === 4 && !AppState.github.isConnected) {
        alert('Please complete GitHub setup first!');
        return;
    }
    
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('step-' + i + '-content');
        if (el) el.style.display = 'none';
    }
    
    const current = document.getElementById('step-' + step + '-content');
    if (current) current.style.display = 'block';
    
    AppState.currentStep = step;
    updateProgressBar();
    updateStepIndicators(step);
    
    if (step === 4) updateDeploySummary();
}

function initiateGoogleOAuth() {
    const clientId = document.getElementById('google-client-id').value.trim();
    const clientSecret = document.getElementById('google-client-secret').value.trim();
    
    if (!clientId || !clientSecret) {
        alert('Please enter both Client ID and Client Secret!');
        return;
    }
    
    AppState.google.clientId = clientId;
    AppState.google.clientSecret = clientSecret;
    
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/tasks.readonly');
    
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
        'client_id=' + encodeURIComponent(clientId) +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&response_type=code' +
        '&scope=' + scope +
        '&access_type=offline' +
        '&prompt=consent';
    
    sessionStorage.setItem('taskdawn_state', JSON.stringify(AppState));
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
        const saved = sessionStorage.getItem('taskdawn_state');
        if (saved) Object.assign(AppState, JSON.parse(saved));
        await exchangeCodeForTokens(code);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function exchangeCodeForTokens(code) {
    const redirectUri = window.location.origin + window.location.pathname;
    
    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code,
                client_id: AppState.google.clientId,
                client_secret: AppState.google.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        
        const data = await response.json();
        
        if (data.access_token) {
            AppState.google.accessToken = data.access_token;
            AppState.google.refreshToken = data.refresh_token || '[No refresh token]';
            AppState.google.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000)).toLocaleString();
            AppState.google.isAuthorized = true;
            
            document.getElementById('google-access-token').value = maskToken(data.access_token);
            document.getElementById('google-refresh-token').value = data.refresh_token ? maskToken(data.refresh_token) : '[Not provided]';
            document.getElementById('google-token-expiry').value = AppState.google.tokenExpiry;
            document.getElementById('btn-step1-next').disabled = false;
            
            updateSidebarStatus();
            alert('Google authorization successful!');
        } else {
            alert('Failed to get tokens: ' + (data.error_description || data.error));
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function maskToken(token) {
    if (!token || token.length < 20) return token;
    return token.substring(0, 10) + '...' + token.substring(token.length - 10);
}

function skipICloudSetup() {
    AppState.icloud.skipped = true;
    AppState.icloud.isConfigured = false;
    document.getElementById('btn-step2-next').disabled = false;
    updateSidebarStatus();
    alert('iCloud setup skipped. You can configure it later.');
}

function checkICloudConfirmation() {
    const checkbox = document.getElementById('icloud-confirmed');
    if (checkbox.checked) {
        AppState.icloud.isConfigured = true;
        AppState.icloud.skipped = false;
        document.getElementById('btn-step2-next').disabled = false;
        updateSidebarStatus();
    } else {
        AppState.icloud.isConfigured = false;
        if (!AppState.icloud.skipped) {
            document.getElementById('btn-step2-next').disabled = true;
        }
    }
}

async function checkGitHubRepo() {
    const pat = document.getElementById('github-pat').value.trim();
    if (!pat) {
        alert('Please enter your GitHub Personal Access Token!');
        return;
    }
    
    AppState.github.pat = pat;
    const consoleId = 'github-console';
    logToConsole(consoleId, 'Connecting to GitHub...', 'info');
    
    try {
        const headers = {
            'Authorization': 'token ' + pat,
            'Accept': 'application/vnd.github.v3+json'
        };
        
        logToConsole(consoleId, 'Fetching user info...', 'info');
        const userRes = await fetch('https://api.github.com/user', { headers });
        
        if (!userRes.ok) throw new Error('Invalid token: ' + userRes.status);
        
        const user = await userRes.json();
        AppState.github.username = user.login;
        document.getElementById('github-username').value = user.login;
        logToConsole(consoleId, 'Authenticated as: ' + user.login, 'success');
        
        logToConsole(consoleId, 'Checking for repo: ' + AppState.github.repoName, 'info');
        const repoRes = await fetch('https://api.github.com/repos/' + user.login + '/' + AppState.github.repoName, { headers });
        
        if (repoRes.ok) {
            const repo = await repoRes.json();
            AppState.github.repoExists = true;
            AppState.github.repoUrl = repo.html_url;
            AppState.github.isConnected = true;
            document.getElementById('github-repo-status').value = 'EXISTS (Private: ' + repo.private + ')';
            document.getElementById('github-repo-url').value = repo.html_url;
            logToConsole(consoleId, 'Repository found!', 'success');
        } else if (repoRes.status === 404) {
            logToConsole(consoleId, 'Creating repository...', 'info');
            const createRes = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: AppState.github.repoName,
                    description: 'Task Dawn Automation Engine',
                    private: true,
                    auto_init: true
                })
            });
            
            if (!createRes.ok) {
                const err = await createRes.json();
                throw new Error('Failed to create repo: ' + (err.message || createRes.status));
            }
            
            const newRepo = await createRes.json();
            AppState.github.repoExists = true;
            AppState.github.repoUrl = newRepo.html_url;
            AppState.github.isConnected = true;
            document.getElementById('github-repo-status').value = 'CREATED (Private)';
            document.getElementById('github-repo-url').value = newRepo.html_url;
            logToConsole(consoleId, 'Repository created!', 'success');
        }
        
        document.getElementById('btn-step3-next').disabled = false;
        updateSidebarStatus();
        logToConsole(consoleId, 'GitHub setup complete!', 'success');
        
    } catch (err) {
        logToConsole(consoleId, 'ERROR: ' + err.message, 'error');
        alert('GitHub Error: ' + err.message);
    }
}

function updateDeploySummary() {
    if (AppState.google.isAuthorized) {
        document.getElementById('summary-google').textContent = 'Connected';
        document.getElementById('summary-google-status').innerHTML = '&#9745;';
        document.getElementById('summary-google-status').className = 'status-complete';
    }
    if (AppState.icloud.isConfigured) {
        document.getElementById('summary-icloud').textContent = 'IFTTT Bridge Configured';
        document.getElementById('summary-icloud-status').innerHTML = '&#9745;';
        document.getElementById('summary-icloud-status').className = 'status-complete';
    } else if (AppState.icloud.skipped) {
        document.getElementById('summary-icloud').textContent = 'Skipped';
        document.getElementById('summary-icloud-status').innerHTML = '&#9744;';
    }
    if (AppState.github.isConnected) {
        document.getElementById('summary-github').textContent = AppState.github.username + '/' + AppState.github.repoName;
        document.getElementById('summary-github-status').innerHTML = '&#9745;';
        document.getElementById('summary-github-status').className = 'status-complete';
    }
}

async function deploySecrets() {
    const consoleId = 'deploy-console';
    
    if (!AppState.google.isAuthorized || !AppState.github.isConnected) {
        alert('Please complete all required steps first!');
        return;
    }
    
    const btn = document.getElementById('btn-deploy');
    btn.disabled = true;
    btn.textContent = 'DEPLOYING...';
    
    logToConsole(consoleId, 'Starting deployment...', 'info');
    logToConsole(consoleId, 'Waiting for encryption library...', 'info');
    
    // Wait for sodium to be ready
    if (window.sodiumReady) {
        await window.sodiumReady;
    }
    
    // Check if libsodium is loaded
    if (typeof sodium === 'undefined') {
        logToConsole(consoleId, 'ERROR: Encryption library failed to load.', 'error');
        logToConsole(consoleId, 'Try: Hard refresh (Ctrl+Shift+R) or clear cache', 'error');
        btn.disabled = false;
        btn.textContent = '⚡ [ DEPLOY TO GITHUB ] ⚡';
        return;
    }
    
    logToConsole(consoleId, 'Encryption library loaded!', 'success');
    
    const headers = {
        'Authorization': 'token ' + AppState.github.pat,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    
    const owner = AppState.github.username;
    const repo = AppState.github.repoName;
    
    try {
        await sodium.ready;
        logToConsole(consoleId, 'Encryption initialized', 'success');
        
        logToConsole(consoleId, 'Getting public key...', 'info');
        const keyRes = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/actions/secrets/public-key', { headers });
        
        if (!keyRes.ok) {
            const keyErr = await keyRes.json().catch(() => ({}));
            throw new Error('Failed to get public key: ' + (keyErr.message || keyRes.status));
        }
        
        const keyData = await keyRes.json();
        logToConsole(consoleId, 'Public key obtained', 'success');
        
        const secrets = {
            'GOOGLE_CLIENT_ID': AppState.google.clientId,
            'GOOGLE_CLIENT_SECRET': AppState.google.clientSecret,
            'GOOGLE_REFRESH_TOKEN': AppState.google.refreshToken
        };
        
        for (const [name, value] of Object.entries(secrets)) {
            logToConsole(consoleId, 'Encrypting ' + name + '...', 'info');
            
            // Encrypt the secret
            const binkey = sodium.from_base64(keyData.key, sodium.base64_variants.ORIGINAL);
            const binsec = sodium.from_string(value);
            const encBytes = sodium.crypto_box_seal(binsec, binkey);
            const encrypted = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
            
            logToConsole(consoleId, 'Deploying ' + name + '...', 'info');
            
            const res = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/actions/secrets/' + name, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ 
                    encrypted_value: encrypted, 
                    key_id: keyData.key_id 
                })
            });
            
            if (res.ok || res.status === 201 || res.status === 204) {
                logToConsole(consoleId, name + ' deployed!', 'success');
            } else {
                const errBody = await res.json().catch(() => ({}));
                throw new Error('Failed to deploy ' + name + ': ' + (errBody.message || res.status));
            }
        }
        
        document.getElementById('summary-secrets-status').innerHTML = '&#9745;';
        document.getElementById('summary-secrets-status').className = 'status-complete';
        
        AppState.deployed = true;
        updateSidebarStatus();
        document.getElementById('progress-bar-fill').style.width = '100%';
        
        logToConsole(consoleId, '=== DEPLOYMENT COMPLETE ===', 'success');
        
        document.getElementById('success-message').style.display = 'block';
        document.getElementById('link-to-repo').href = AppState.github.repoUrl;
        btn.textContent = '✓ DEPLOYED';
        
    } catch (err) {
        logToConsole(consoleId, 'ERROR: ' + err.message, 'error');
        alert('Deployment failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = '⚡ [ DEPLOY TO GITHUB ] ⚡';
    }
}

async function encryptSecret(secret, publicKey) {
    // Check if libsodium is loaded
    if (typeof sodium === 'undefined') {
        console.error('libsodium not loaded! Encryption will fail.');
        throw new Error('Encryption library not loaded. Please refresh the page.');
    }
    
    try {
        await sodium.ready;
        const binkey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
        const binsec = sodium.from_string(secret);
        const enc = sodium.crypto_box_seal(binsec, binkey);
        return sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);
    } catch (e) {
        console.error('Encryption error:', e);
        throw new Error('Failed to encrypt secret: ' + e.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    handleOAuthCallback();
    
    const saved = sessionStorage.getItem('taskdawn_state');
    if (saved) {
        const restored = JSON.parse(saved);
        if (restored.google.clientId) {
            document.getElementById('google-client-id').value = restored.google.clientId;
        }
        if (restored.google.clientSecret) {
            document.getElementById('google-client-secret').value = restored.google.clientSecret;
        }
    }
    
    updateProgressBar();
    updateStepIndicators(1);
});

window.addEventListener('beforeunload', function(e) {
    if (AppState.google.isAuthorized && !AppState.deployed) {
        e.preventDefault();
        e.returnValue = 'You have unsaved progress. Leave anyway?';
        return e.returnValue;
    }
});
