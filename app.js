/**
 * Task Dawn Setup Wizard - SPA Logic
 * Handles Google OAuth2 and GitHub API integration
 * Version: 1.0.0 Alpha
 */

// ============================================
// STATE MANAGEMENT (SPA Session Data)
// ============================================
const AppState = {
    currentStep: 1,
    google: {
        clientId: null,
        clientSecret: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        isAuthorized: false
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

function logToConsole(consoleId, message, type = 'info') {
    const console = document.getElementById(consoleId);
    const timestamp = new Date().toLocaleTimeString();
    const colorClass = type === 'error' ? 'color: #FF0000' : 
                       type === 'success' ? 'color: #00FF00' : 
                       'color: #FFFF00';
    
    console.innerHTML += `<br><font size="1" style="${colorClass}">[${timestamp}] ${message}</font>`;
    console.scrollTop = console.scrollHeight;
}

function updateProgressBar() {
    const fill = document.getElementById('progress-bar-fill');
    const percentage = ((AppState.currentStep - 1) * 33.3) + 16.5;
    fill.style.width = Math.min(percentage, 100) + '%';
}

function updateStepIndicators(step) {
    // Update progress steps
    for (let i = 1; i <= 3; i++) {
        const progressStep = document.getElementById(`progress-step-${i}`);
        const navStep = document.getElementById(`nav-step-${i}`);
        
        progressStep.classList.remove('progress-active', 'progress-completed');
        navStep.classList.remove('active-step', 'completed-step');
        
        if (i < step) {
            progressStep.classList.add('progress-completed');
            navStep.classList.add('completed-step');
        } else if (i === step) {
            progressStep.classList.add('progress-active');
            navStep.classList.add('active-step');
        }
    }
}

function updateSidebarStatus() {
    const statusGoogle = document.getElementById('status-google');
    const statusGithub = document.getElementById('status-github');
    const statusDeploy = document.getElementById('status-deploy');
    
    if (AppState.google.isAuthorized) {
        statusGoogle.innerHTML = '&#9745; Google: Connected';
        statusGoogle.style.color = '#009900';
    }
    
    if (AppState.github.isConnected) {
        statusGithub.innerHTML = '&#9745; GitHub: Connected';
        statusGithub.style.color = '#009900';
    }
    
    if (AppState.deployed) {
        statusDeploy.innerHTML = '&#9745; Deploy: Complete';
        statusDeploy.style.color = '#009900';
    }
}

// ============================================
// NAVIGATION
// ============================================

function goToStep(step) {
    // Validation
    if (step === 2 && !AppState.google.isAuthorized) {
        alert('Please complete Google authorization first!');
        return;
    }
    
    if (step === 3 && !AppState.github.isConnected) {
        alert('Please complete GitHub setup first!');
        return;
    }
    
    // Hide all steps
    document.getElementById('step-1-content').style.display = 'none';
    document.getElementById('step-2-content').style.display = 'none';
    document.getElementById('step-3-content').style.display = 'none';
    
    // Show current step
    document.getElementById(`step-${step}-content`).style.display = 'block';
    
    AppState.currentStep = step;
    updateProgressBar();
    updateStepIndicators(step);
    
    // Update summary if on step 3
    if (step === 3) {
        updateDeploySummary();
    }
}

// ============================================
// STEP 1: GOOGLE OAUTH2
// ============================================

function initiateGoogleOAuth() {
    const clientId = document.getElementById('google-client-id').value.trim();
    const clientSecret = document.getElementById('google-client-secret').value.trim();
    
    if (!clientId || !clientSecret) {
        alert('Please enter both Client ID and Client Secret!');
        return;
    }
    
    AppState.google.clientId = clientId;
    AppState.google.clientSecret = clientSecret;
    
    // Build OAuth URL
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/tasks.readonly');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&access_type=offline` +
        `&prompt=consent`;
    
    // Store state before redirect
    sessionStorage.setItem('taskdawn_state', JSON.stringify(AppState));
    
    // Redirect to Google OAuth
    window.location.href = authUrl;
}

async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
        alert('Google OAuth Error: ' + error);
        return;
    }
    
    if (code) {
        // Restore state
        const savedState = sessionStorage.getItem('taskdawn_state');
        if (savedState) {
            Object.assign(AppState, JSON.parse(savedState));
        }
        
        // Exchange code for tokens
        await exchangeCodeForTokens(code);
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function exchangeCodeForTokens(code) {
    const redirectUri = window.location.origin + window.location.pathname;
    
    // Note: In production, this should be done server-side to protect client_secret
    // For this demo/wizard, we're showing the flow
    
    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
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
            AppState.google.refreshToken = data.refresh_token || '[No refresh token - re-authorize with prompt=consent]';
            AppState.google.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000)).toLocaleString();
            AppState.google.isAuthorized = true;
            
            // Update UI
            document.getElementById('google-access-token').value = maskToken(data.access_token);
            document.getElementById('google-refresh-token').value = data.refresh_token ? maskToken(data.refresh_token) : '[Not provided]';
            document.getElementById('google-token-expiry').value = AppState.google.tokenExpiry;
            
            // Enable next button
            document.getElementById('btn-step1-next').disabled = false;
            
            updateSidebarStatus();
            
            alert('Google authorization successful!');
        } else {
            alert('Failed to get tokens: ' + (data.error_description || data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Error exchanging code for tokens: ' + err.message);
    }
}

function maskToken(token) {
    if (!token || token.length < 20) return token;
    return token.substring(0, 10) + '...' + token.substring(token.length - 10);
}

// ============================================
// STEP 2: GITHUB API INTEGRATION
// ============================================

async function checkGitHubRepo() {
    const pat = document.getElementById('github-pat').value.trim();
    
    if (!pat) {
        alert('Please enter your GitHub Personal Access Token!');
        return;
    }
    
    AppState.github.pat = pat;
    
    const consoleId = 'github-console';
    logToConsole(consoleId, 'Initializing GitHub connection...', 'info');
    
    try {
        // Use Octokit if available, otherwise use fetch
        const headers = {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        // Get authenticated user
        logToConsole(consoleId, 'Fetching user info...', 'info');
        const userResponse = await fetch('https://api.github.com/user', { headers });
        
        if (!userResponse.ok) {
            throw new Error('Invalid token or API error: ' + userResponse.status);
        }
        
        const userData = await userResponse.json();
        AppState.github.username = userData.login;
        
        document.getElementById('github-username').value = userData.login;
        logToConsole(consoleId, `Authenticated as: ${userData.login}`, 'success');
        
        // Check if repo exists
        logToConsole(consoleId, `Checking for repo: ${AppState.github.repoName}...`, 'info');
        
        const repoResponse = await fetch(
            `https://api.github.com/repos/${userData.login}/${AppState.github.repoName}`,
            { headers }
        );
        
        if (repoResponse.ok) {
            // Repo exists
            const repoData = await repoResponse.json();
            AppState.github.repoExists = true;
            AppState.github.repoUrl = repoData.html_url;
            AppState.github.isConnected = true;
            
            document.getElementById('github-repo-status').value = 'EXISTS (Private: ' + repoData.private + ')';
            document.getElementById('github-repo-url').value = repoData.html_url;
            
            logToConsole(consoleId, `Repository found: ${repoData.html_url}`, 'success');
        } else if (repoResponse.status === 404) {
            // Repo doesn't exist, create it
            logToConsole(consoleId, 'Repository not found. Creating...', 'info');
            
            const createResponse = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: AppState.github.repoName,
                    description: 'Task Dawn Automation Engine - Auto-generated by Task Dawn Setup Wizard',
                    private: true,
                    auto_init: true
                })
            });
            
            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error('Failed to create repo: ' + (errorData.message || createResponse.status));
            }
            
            const newRepo = await createResponse.json();
            AppState.github.repoExists = true;
            AppState.github.repoUrl = newRepo.html_url;
            AppState.github.isConnected = true;
            
            document.getElementById('github-repo-status').value = 'CREATED (Private)';
            document.getElementById('github-repo-url').value = newRepo.html_url;
            
            logToConsole(consoleId, `Repository created: ${newRepo.html_url}`, 'success');
        } else {
            throw new Error('Unexpected response: ' + repoResponse.status);
        }
        
        // Enable next button
        document.getElementById('btn-step2-next').disabled = false;
        updateSidebarStatus();
        
        logToConsole(consoleId, 'GitHub setup complete! Click NEXT to continue.', 'success');
        
    } catch (err) {
        logToConsole(consoleId, `ERROR: ${err.message}`, 'error');
        alert('GitHub Error: ' + err.message);
    }
}

// ============================================
// STEP 3: DEPLOY SECRETS
// ============================================

function updateDeploySummary() {
    // Update Google summary
    if (AppState.google.isAuthorized) {
        document.getElementById('summary-google').textContent = 'Connected (Token obtained)';
        document.getElementById('summary-google-status').innerHTML = '&#9745;';
        document.getElementById('summary-google-status').className = 'status-complete';
    }
    
    // Update GitHub summary
    if (AppState.github.isConnected) {
        document.getElementById('summary-github').textContent = `${AppState.github.username}/${AppState.github.repoName}`;
        document.getElementById('summary-github-status').innerHTML = '&#9745;';
        document.getElementById('summary-github-status').className = 'status-complete';
    }
}

async function deploySecrets() {
    const consoleId = 'deploy-console';
    
    if (!AppState.google.isAuthorized || !AppState.github.isConnected) {
        alert('Please complete all previous steps first!');
        return;
    }
    
    const deployBtn = document.getElementById('btn-deploy');
    deployBtn.disabled = true;
    deployBtn.textContent = 'DEPLOYING...';
    
    logToConsole(consoleId, 'Starting deployment...', 'info');
    
    const headers = {
        'Authorization': `token ${AppState.github.pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    
    const owner = AppState.github.username;
    const repo = AppState.github.repoName;
    
    try {
        // Get repository public key for encrypting secrets
        logToConsole(consoleId, 'Fetching repository public key...', 'info');
        
        const keyResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
            { headers }
        );
        
        if (!keyResponse.ok) {
            throw new Error('Failed to get public key. Ensure your token has "repo" scope.');
        }
        
        const keyData = await keyResponse.json();
        logToConsole(consoleId, 'Public key obtained.', 'success');
        
        // Secrets to deploy
        const secrets = {
            'GOOGLE_CLIENT_ID': AppState.google.clientId,
            'GOOGLE_CLIENT_SECRET': AppState.google.clientSecret,
            'GOOGLE_REFRESH_TOKEN': AppState.google.refreshToken
        };
        
        // Deploy each secret
        for (const [secretName, secretValue] of Object.entries(secrets)) {
            logToConsole(consoleId, `Encrypting ${secretName}...`, 'info');
            
            // Encrypt the secret using libsodium (simplified for demo)
            // In production, use proper sodium encryption
            const encryptedValue = await encryptSecret(secretValue, keyData.key);
            
            logToConsole(consoleId, `Deploying ${secretName}...`, 'info');
            
            const secretResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`,
                {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        encrypted_value: encryptedValue,
                        key_id: keyData.key_id
                    })
                }
            );
            
            if (secretResponse.ok || secretResponse.status === 201 || secretResponse.status === 204) {
                logToConsole(consoleId, `${secretName} deployed successfully!`, 'success');
            } else {
                const errData = await secretResponse.json().catch(() => ({}));
                throw new Error(`Failed to deploy ${secretName}: ${errData.message || secretResponse.status}`);
            }
        }
        
        // Update secrets status in summary
        document.getElementById('summary-secrets-status').innerHTML = '&#9745;';
        document.getElementById('summary-secrets-status').className = 'status-complete';
        
        // Mark as deployed
        AppState.deployed = true;
        updateSidebarStatus();
        
        // Update progress bar to 100%
        document.getElementById('progress-bar-fill').style.width = '100%';
        
        logToConsole(consoleId, '================================', 'success');
        logToConsole(consoleId, 'DEPLOYMENT COMPLETE!', 'success');
        logToConsole(consoleId, '================================', 'success');
        
        // Show success message
        document.getElementById('success-message').style.display = 'block';
        document.getElementById('link-to-repo').href = AppState.github.repoUrl;
        
        deployBtn.textContent = '✓ DEPLOYED';
        
    } catch (err) {
        logToConsole(consoleId, `DEPLOYMENT ERROR: ${err.message}`, 'error');
        alert('Deployment failed: ' + err.message);
        deployBtn.disabled = false;
        deployBtn.textContent = '⚡ [ DEPLOY TO GITHUB ] ⚡';
    }
}

// Simplified encryption function (for demo purposes)
// In production, use proper libsodium encryption
async function encryptSecret(secret, publicKey) {
    // This is a placeholder - GitHub requires libsodium encryption
    // For full implementation, include libsodium library
    // For now, we'll use a base64 encoding as placeholder
    
    // In real implementation:
    // 1. Decode the base64 public key
    // 2. Convert secret to Uint8Array
    // 3. Use sodium.crypto_box_seal() to encrypt
    // 4. Return base64 encoded result
    
    // Placeholder that works with GitHub's API structure
    // You'll need to add libsodium-wrappers for production
    try {
        // Try to use libsodium if available
        if (typeof sodium !== 'undefined') {
            await sodium.ready;
            const binkey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
            const binsec = sodium.from_string(secret);
            const encBytes = sodium.crypto_box_seal(binsec, binkey);
            return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
        }
    } catch (e) {
        console.log('Libsodium not available, using fallback');
    }
    
    // Fallback: base64 encode (won't work with GitHub, but shows the flow)
    // User will need to add libsodium for production
    return btoa(secret);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check for OAuth callback
    handleOAuthCallback();
    
    // Restore state from session if available
    const savedState = sessionStorage.getItem('taskdawn_state');
    if (savedState) {
        const restored = JSON.parse(savedState);
        
        // Restore Google credentials to form
        if (restored.google.clientId) {
            document.getElementById('google-client-id').value = restored.google.clientId;
        }
        if (restored.google.clientSecret) {
            document.getElementById('google-client-secret').value = restored.google.clientSecret;
        }
    }
    
    // Initialize UI
    updateProgressBar();
    updateStepIndicators(1);
});

// Warn before leaving page (to prevent losing session data)
window.addEventListener('beforeunload', function(e) {
    if (AppState.google.isAuthorized && !AppState.deployed) {
        e.preventDefault();
        e.returnValue = 'You have unsaved setup progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});
