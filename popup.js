// popup.js - CSES Sync OAuth Popup Script

console.log("🎨 CSES Sync Popup: OAuth Script loading...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("🎨 CSES Sync Popup: DOM loaded, initializing OAuth...");
    
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const settingsButton = document.getElementById('settingsButton');
    const notAuthenticatedDiv = document.getElementById('notAuthenticated');
    const authenticatedDiv = document.getElementById('authenticated');
    const loadingDiv = document.getElementById('loading');
    const statusMessage = document.getElementById('statusMessage');
    const usernameSpan = document.getElementById('username');
    const repoInfoDiv = document.getElementById('repoInfo');
    const repoLink = document.getElementById('repoLink');

    // Utility functions for display control
    function showElement(element) {
        element.classList.remove('hidden');
    }
    
    function hideElement(element) {
        element.classList.add('hidden');
    }
    
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = type;
        showElement(statusMessage);
        console.log(`📱 Status (${type}): ${message}`);
    }

    function hideStatus() {
        hideElement(statusMessage);
    }

    function showLoading() {
        hideElement(notAuthenticatedDiv);
        hideElement(authenticatedDiv);
        showElement(loadingDiv);
    }

    function hideLoading() {
        hideElement(loadingDiv);
    }

    function showAuthenticated(userInfo) {
        hideLoading();
        hideElement(notAuthenticatedDiv);
        showElement(authenticatedDiv);
        usernameSpan.textContent = userInfo.login || 'Unknown';
        
        // Load and display repository info
        loadRepositoryInfo();
    }

    function showNotAuthenticated() {
        hideLoading();
        showElement(notAuthenticatedDiv);
        hideElement(authenticatedDiv);
        usernameSpan.textContent = '-';
        hideElement(repoInfoDiv);
    }

    // Load repository information
    async function loadRepositoryInfo() {
        console.log("📁 Loading repository information...");
        
        try {
            const result = await chrome.storage.sync.get(['repoOwner', 'repoName', 'repoUrl']);
            
            if (result.repoOwner && result.repoName) {
                const repoUrl = result.repoUrl || `https://github.com/${result.repoOwner}/${result.repoName}`;
                
                console.log("✅ Repository configured:", result.repoOwner + "/" + result.repoName);
                
                // Show repository info
                repoLink.href = repoUrl;
                repoLink.textContent = `${result.repoOwner}/${result.repoName}`;
                showElement(repoInfoDiv);
            } else {
                console.log("ℹ️ No repository configured");
                hideElement(repoInfoDiv);
            }
        } catch (error) {
            console.error("❌ Error loading repository info:", error);
            hideElement(repoInfoDiv);
        }
    }

    // Navigation to settings
    function openSettings() {
        console.log("⚙️ Opening settings page...");
        window.location.href = 'settings.html';
    }

    // Check current authentication status
    async function checkAuthStatus() {
        console.log("🔍 Checking authentication status...");
        
        try {
            const result = await chrome.storage.sync.get(['githubToken', 'githubUser']);
            
            if (result.githubToken && result.githubUser) {
                console.log("✅ User is authenticated:", result.githubUser.login);
                showAuthenticated(result.githubUser);
                hideStatus();
            } else {
                console.log("❌ User is not authenticated");
                showNotAuthenticated();
                showStatus('Sign in with your GitHub account', 'info');
            }
        } catch (error) {
            console.error("❌ Error checking auth status:", error);
            showNotAuthenticated();
            showStatus('Could not check authentication status', 'error');
        }
    }

    // GitHub Device Flow login
    async function loginWithGitHub() {
        console.log("🔑 Starting GitHub Device Flow...");
        showLoading();
        hideStatus();

        try {
            // Step 1: Start Device Flow
            const deviceResult = await chrome.runtime.sendMessage({
                type: 'GITHUB_DEVICE_FLOW_START'
            });

            console.log("📱 Device Flow result received:", deviceResult);

            if (deviceResult && deviceResult.success && deviceResult.step === 'device_code') {
                // Show device code to user
                showDeviceCode(deviceResult);
                
                // Step 2: Start polling for token
                const pollResult = await chrome.runtime.sendMessage({
                    type: 'GITHUB_DEVICE_FLOW_POLL',
                    deviceCode: deviceResult.device_code,
                    interval: deviceResult.interval
                });

                console.log("🔄 Poll result received:", pollResult);

                if (pollResult && pollResult.success) {
                    console.log("✅ Device Flow successful");
                    showAuthenticated(pollResult.user);
                    showStatus('GitHub sign in successful!', 'success');
                    
                    // Auto-hide success message after 3 seconds
                    setTimeout(hideStatus, 3000);
                } else {
                    const errorMsg = pollResult && pollResult.error ? pollResult.error : 'Polling failed';
                    console.error("❌ Device Flow polling failed:", errorMsg);
                    showNotAuthenticated();
                    showStatus(`Sign in failed: ${errorMsg}`, 'error');
                }
            } else {
                const errorMsg = deviceResult && deviceResult.error ? deviceResult.error : 'Could not get device code';
                console.error("❌ Device Flow failed:", errorMsg);
                showNotAuthenticated();
                showStatus(`Sign in failed: ${errorMsg}`, 'error');
            }
        } catch (error) {
            console.error("❌ Device Flow error:", error);
            showNotAuthenticated();
            showStatus('An error occurred during sign in', 'error');
        }
    }

    // Show device code to user
    function showDeviceCode(deviceInfo) {
        hideLoading();
        
        // Update UI to show device code
        notAuthenticatedDiv.innerHTML = `
            <div class="device-flow-container">
                <h3 class="device-flow-title">📱 GitHub Device Flow</h3>
                <div class="device-flow-box">
                    <p class="device-flow-instruction">Enter this code on GitHub:</p>
                    <div class="device-code">${deviceInfo.user_code}</div>
                </div>
                <a href="${deviceInfo.verification_uri}" target="_blank" class="github-auth-link">
                   🔗 Authorize on GitHub
                </a>
                <p class="device-flow-note">
                   Automatic sign in after authorization...
                </p>
                <div class="spinner-container">
                    <div class="spinner spinner-center"></div>
                    <p class="waiting-note">Waiting for token...</p>
                </div>
            </div>
        `;
        
        notAuthenticatedDiv.classList.remove('hidden');
    }

    // Logout
    async function logout() {
        console.log("🚪 Logging out...");
        showLoading();
        hideStatus();

        try {
            const result = await chrome.runtime.sendMessage({
                type: 'GITHUB_LOGOUT'
            });

            if (result.success) {
                console.log("✅ Logout successful");
                showNotAuthenticated();
                showStatus('Signed out successfully', 'success');
                
                // Auto-hide message after 2 seconds
                setTimeout(hideStatus, 2000);
            } else {
                console.error("❌ Logout failed:", result.error);
                showStatus(`Sign out error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error("❌ Logout error:", error);
            showStatus('An error occurred during sign out', 'error');
        }
    }

    // Event listeners
    loginButton.addEventListener('click', loginWithGitHub);
    logoutButton.addEventListener('click', logout);
    settingsButton.addEventListener('click', openSettings);

    // Initialize
    checkAuthStatus();
    
    console.log("✅ CSES Sync Popup: OAuth popup ready!");
});

console.log("✅ CSES Sync Popup: OAuth script loaded!");