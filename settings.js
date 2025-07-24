// settings.js - CSES Sync Settings Management

console.log("⚙️ CSES Sync Settings: Script loading...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("⚙️ CSES Sync Settings: DOM loaded, initializing...");
    
    const backButton = document.getElementById('backButton');
    const repoUrlInput = document.getElementById('repoUrl');
    const saveButton = document.getElementById('saveButton');
    const statusMessage = document.getElementById('statusMessage');
    const currentRepoDiv = document.getElementById('currentRepo');
    const repoStatusP = document.getElementById('repoStatus');

    // Utility functions
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = type;
        statusMessage.style.display = 'block';
        console.log(`📱 Status (${type}): ${message}`);
    }

    function hideStatus() {
        statusMessage.style.display = 'none';
    }

    // Parse GitHub URL to extract owner and repo
    function parseGitHubUrl(url) {
        try {
            // Remove trailing slash if exists
            url = url.replace(/\/$/, '');
            
            // Match GitHub URL patterns
            const patterns = [
                /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)$/,
                /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\.git$/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return {
                        owner: match[1],
                        repo: match[2],
                        fullUrl: `https://github.com/${match[1]}/${match[2]}`
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error("❌ Error parsing GitHub URL:", error);
            return null;
        }
    }

    // Load current repository settings
    async function loadCurrentRepo() {
        console.log("📖 Loading current repository settings...");
        
        try {
            const result = await chrome.storage.sync.get(['repoOwner', 'repoName', 'repoUrl']);
            
            if (result.repoOwner && result.repoName) {
                console.log("✅ Repository found:", result.repoOwner + "/" + result.repoName);
                
                const repoUrl = result.repoUrl || `https://github.com/${result.repoOwner}/${result.repoName}`;
                
                // Update UI to show current repo
                currentRepoDiv.className = 'current-repo';
                repoStatusP.innerHTML = `<a href="${repoUrl}" target="_blank">${result.repoOwner}/${result.repoName}</a>`;
                
                // Pre-fill input with current URL
                repoUrlInput.value = repoUrl;
            } else {
                console.log("ℹ️ No repository configured");
                currentRepoDiv.className = 'current-repo no-repo';
                repoStatusP.textContent = 'No repository configured';
                repoUrlInput.value = '';
            }
        } catch (error) {
            console.error("❌ Error loading repository settings:", error);
            showStatus('Could not load repository settings', 'error');
        }
    }

    // Save repository settings
    async function saveRepository() {
        console.log("💾 Saving repository settings...");
        const url = repoUrlInput.value.trim();
        
        hideStatus();
        saveButton.disabled = true;
        saveButton.textContent = '💾 Saving...';
        
        try {
            if (!url) {
                throw new Error('Please enter a repository URL');
            }
            
            const parsed = parseGitHubUrl(url);
            if (!parsed) {
                throw new Error('Invalid GitHub repository URL. Please use format: https://github.com/username/repository');
            }
            
            console.log("✅ Parsed repository:", parsed);
            
            // Save to storage
            await chrome.storage.sync.set({
                repoOwner: parsed.owner,
                repoName: parsed.repo,
                repoUrl: parsed.fullUrl
            });
            
            console.log("✅ Repository settings saved successfully!");
            
            // Update UI
            currentRepoDiv.className = 'current-repo';
            repoStatusP.innerHTML = `<a href="${parsed.fullUrl}" target="_blank">${parsed.owner}/${parsed.repo}</a>`;
            
            showStatus('Repository saved successfully!', 'success');
            
            // Auto-hide success message after 3 seconds
            setTimeout(hideStatus, 3000);
            
        } catch (error) {
            console.error("❌ Error saving repository:", error);
            showStatus(`Save failed: ${error.message}`, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = '💾 Save Repository';
        }
    }

    // Navigation - go back to main popup
    function goBack() {
        console.log("🔙 Navigating back to main popup...");
        window.location.href = 'popup.html';
    }

    // Input validation in real-time
    function validateInput() {
        const url = repoUrlInput.value.trim();
        
        if (!url) {
            saveButton.disabled = true;
            return;
        }
        
        const parsed = parseGitHubUrl(url);
        saveButton.disabled = !parsed;
        
        if (url && !parsed) {
            repoUrlInput.style.borderColor = '#dc3545';
        } else {
            repoUrlInput.style.borderColor = '#ddd';
        }
    }

    // Event listeners
    backButton.addEventListener('click', goBack);
    saveButton.addEventListener('click', saveRepository);
    repoUrlInput.addEventListener('input', validateInput);
    
    // Handle Enter key in input
    repoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !saveButton.disabled) {
            saveRepository();
        }
    });

    // Initialize
    loadCurrentRepo();
    validateInput();
    
    console.log("✅ CSES Sync Settings: Ready!");
});

console.log("✅ CSES Sync Settings: Script loaded!"); 