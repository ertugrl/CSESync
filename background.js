// background.js - CSES Sync OAuth Background Service Worker

console.log("🚀 CSES Sync Background: OAuth Service Worker started!");

// --- Utility Functions ---
function encodeBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
    }));
}

// --- OAuth Configuration ---
const GITHUB_CONFIG = {
    clientId: 'Ov23litFdmGxnoiRmInN',
    scopes: 'repo'
};

// --- Device Flow Functions ---
async function startGitHubDeviceFlow() {
    console.log("🔑 Starting GitHub Device Flow...");
    
    try {
        // Step 1: Request device and user codes
        const deviceResponse = await fetch('https://github.com/login/device/code', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: GITHUB_CONFIG.clientId,
                scope: GITHUB_CONFIG.scopes
            })
        });

        if (!deviceResponse.ok) {
            throw new Error(`Device code request failed: ${deviceResponse.status}`);
        }

        const deviceData = await deviceResponse.json();
        console.log("🎫 Device code received:", deviceData.user_code);

        // Step 2: Return device info to popup for user interaction
        return {
            success: true,
            step: 'device_code',
            user_code: deviceData.user_code,
            verification_uri: deviceData.verification_uri,
            device_code: deviceData.device_code,
            interval: deviceData.interval,
            expires_in: deviceData.expires_in
        };

    } catch (error) {
        console.error("❌ Device Flow failed:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function pollForAccessToken(deviceCode, interval) {
    console.log("🔄 Starting token polling...");
    
    const maxPolls = 50; // Maximum number of polls
    let polls = 0;
    
    while (polls < maxPolls) {
        try {
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
            
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: GITHUB_CONFIG.clientId,
                    device_code: deviceCode,
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                })
            });

            if (!tokenResponse.ok) {
                throw new Error(`Token request failed: ${tokenResponse.status}`);
            }

            const tokenData = await tokenResponse.json();
            
            if (tokenData.access_token) {
                console.log("🔑 Access token received!");
                
                // Get user information
                const userResponse = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `token ${tokenData.access_token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!userResponse.ok) {
                    throw new Error(`Failed to get user info: ${userResponse.status}`);
                }

                const userData = await userResponse.json();
                console.log("👤 User data received:", userData.login);

                // Store token and user data
                await chrome.storage.sync.set({
                    githubToken: tokenData.access_token,
                    githubUser: {
                        login: userData.login,
                        id: userData.id,
                        avatar_url: userData.avatar_url,
                        name: userData.name
                    }
                });

                return {
                    success: true,
                    user: {
                        login: userData.login,
                        id: userData.id,
                        avatar_url: userData.avatar_url,
                        name: userData.name
                    }
                };
            } else if (tokenData.error === 'authorization_pending') {
                console.log("⏳ Authorization still pending...");
                polls++;
                continue;
            } else if (tokenData.error === 'slow_down') {
                console.log("🐌 Slowing down polling...");
                interval += 5; // Increase interval
                polls++;
                continue;
            } else if (tokenData.error === 'expired_token') {
                throw new Error('Device code expired. Please try again.');
            } else if (tokenData.error === 'access_denied') {
                throw new Error('Access denied by user.');
            } else {
                throw new Error(`Token error: ${tokenData.error_description || tokenData.error}`);
            }
            
        } catch (error) {
            console.error("❌ Polling error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    return {
        success: false,
        error: 'Polling timeout. Please try again.'
    };
}

async function logoutFromGitHub() {
    console.log("🚪 Logging out from GitHub...");
    
    try {
        // Clear stored token and user data
        await chrome.storage.sync.remove(['githubToken', 'githubUser']);
        
        // Revoke token if needed (optional)
        const result = await chrome.storage.sync.get(['githubToken']);
        if (result.githubToken) {
            try {
                // Note: This requires client_secret, so it's optional
                console.log("🔄 Attempting to revoke token...");
                // In production, this should be done server-side
            } catch (revokeError) {
                console.warn("⚠️ Token revocation failed:", revokeError.message);
            }
        }
        
        console.log("✅ Logout completed successfully!");
        return { success: true };
        
    } catch (error) {
        console.error("❌ Logout failed:", error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// --- GitHub API Interaction (Updated for OAuth) ---
async function createOrUpdateGitHubFile(owner, repo, path, content, message, accessToken, maxRetries = 3) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Get existing file SHA if it exists (fresh each attempt)
            let sha = null;
            try {
                const getResponse = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `token ${accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (getResponse.ok) {
                    const fileData = await getResponse.json();
                    sha = fileData.sha;
                    console.log(`📝 File exists (attempt ${attempt})`);
                } else if (getResponse.status === 404) {
                    console.log(`📝 File does not exist, creating new (attempt ${attempt})`);
                } else {
                    console.warn(`⚠️ Unexpected status checking file: ${getResponse.status}`);
                }
            } catch (error) {
                console.log(`📝 Error checking file, will try to create new (attempt ${attempt})`);
            }

            // Create fresh request body for each attempt
            const requestBody = {
                message: message,
                content: encodeBase64(content)
            };
            
            if (sha) {
                requestBody.sha = sha;
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                console.log(`✅ GitHub API success on attempt ${attempt}`);
                return await response.json();
            }

            // Handle errors
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: errorText };
            }
            
            // For 409 (conflict) or 422 (validation) errors, retry
            if ((response.status === 409 || response.status === 422) && attempt < maxRetries) {
                console.warn(`⚠️ GitHub API Error ${response.status} on attempt ${attempt}, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }
            
            throw new Error(`GitHub API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// --- Message Handlers ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle Device Flow start request
    if (message.type === 'GITHUB_DEVICE_FLOW_START') {
        console.log("🔑 Device Flow start request received");
        startGitHubDeviceFlow().then(result => {
            console.log("🔑 Sending device flow result:", result);
            sendResponse(result);
        }).catch(error => {
            console.error("❌ Device Flow process error:", error);
            sendResponse({
                success: false,
                error: error.message
            });
        });
        return true; // Will respond asynchronously
    }

    // Handle Device Flow polling request
    if (message.type === 'GITHUB_DEVICE_FLOW_POLL') {
        console.log("🔄 Device Flow polling request received");
        pollForAccessToken(message.deviceCode, message.interval).then(result => {
            console.log("🔄 Sending polling result:", result);
            sendResponse(result);
        }).catch(error => {
            console.error("❌ Device Flow polling error:", error);
            sendResponse({
                success: false,
                error: error.message
            });
        });
        return true; // Will respond asynchronously
    }

    // Handle logout request
    if (message.type === 'GITHUB_LOGOUT') {
        console.log("🚪 Logout request received");
        logoutFromGitHub().then(result => {
            console.log("🚪 Sending logout result:", result);
            sendResponse(result);
        }).catch(error => {
            console.error("❌ Logout process error:", error);
            sendResponse({
                success: false,
                error: error.message
            });
        });
        return true; // Will respond asynchronously
    }

    // Handle CSES submission (updated for OAuth)
    if (message.type === "ACCEPTED_SUBMISSION" || (message.success && message.type === "ACCEPTED_SUBMISSION")) {
        console.log("🎯 Processing ACCEPTED_SUBMISSION with OAuth...");
        handleCsesSubmission(message);
        return; // Fire and forget
    }
});

// Separate async function for CSES submission
async function handleCsesSubmission(message) {
    let problemData;
    if (message.success !== undefined) {
        if (!message.success) {
            console.error("❌ Content script reported data extraction failure");
            return;
        }
        problemData = message.data;
    } else {
        problemData = message.data;
    }
    
    console.log(`📊 Data: ${problemData.problemName} (ID: ${problemData.problemId})`);

    // Validation
    if (!problemData.problemId || !problemData.problemName || !problemData.submittedCode) {
        console.error("❌ Missing required data fields");
        return;
    }

    const githubToken = result.githubToken;
    const githubUser = result.githubUser;

    if (!githubToken || !githubUser) {
        console.error("❌ GitHub OAuth token not found");
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'CSES Sync Error',
            message: 'GitHub girişi yapılmamış. Lütfen extension popup\'tan giriş yapın.',
            priority: 2
        });
        return; 
    }

    // GitHub repository details - Use authenticated user's username
    const owner = githubUser.login; // Use authenticated user's username
    const repo = 'CSES-Solutions';  // Repository name

    console.log(`🐙 Target: ${owner}/${repo}`);

    // Check if this problem was already processed recently
    const submissionKey = `${problemData.problemId}_${problemData.problemName}`;
    const lastProcessed = await chrome.storage.local.get([submissionKey]);
    const now = Date.now();
    
    if (lastProcessed[submissionKey] && (now - lastProcessed[submissionKey]) < 30000) {
        console.log(`⏳ Problem ${problemData.problemId} was processed recently, skipping to prevent duplicates`);
        return;
    }
    
    // Mark this problem as being processed
    await chrome.storage.local.set({ [submissionKey]: now });

    // Prepare file paths and content
    const problemFolderPath = `CSES_Problems/${problemData.problemId}-${problemData.problemName.replace(/[^a-zA-Z0-9-]/g, '_')}`;
    const readmePath = `${problemFolderPath}/README.md`;
    const codeFilePath = `${problemFolderPath}/solution.cpp`;

    // README content
    let readmeContent = `# ${problemData.problemName} (ID: ${problemData.problemId})\n\n`;
    readmeContent += `**Problem Link:** [${problemData.problemUrl}](${problemData.problemUrl})\n\n`;
    
    if (problemData.problemDescription) {
        readmeContent += `## Problem Description\n\n${problemData.problemDescription}\n\n`;
    } else {
        readmeContent += `## Problem Description\n\n*Problem description will be extracted in future updates.*\n\n`;
    }
    
    readmeContent += `## Solution\n\n\`\`\`cpp\n${problemData.submittedCode}\n\`\`\`\n`;

    // Code file content
    let codeFileContent = `// CSES Problem ${problemData.problemId}: ${problemData.problemName}\n`;
    codeFileContent += `// Link: ${problemData.problemUrl}\n`;
    if (problemData.problemDescription && problemData.problemDescription.length > 0) {
        const firstLine = problemData.problemDescription.split('\n')[0].substring(0, 80);
        codeFileContent += `// Description: ${firstLine}...\n`;
    }
    codeFileContent += `\n${problemData.submittedCode}\n`;

    try {
        console.log(`🚀 Creating README...`);
        await createOrUpdateGitHubFile(
            owner, repo, readmePath, readmeContent, 
            `Add CSES problem ${problemData.problemId}: ${problemData.problemName} README`, 
            githubToken
        );

        console.log(`🚀 Creating solution file...`);
        await createOrUpdateGitHubFile(
            owner, repo, codeFilePath, codeFileContent, 
            `Add CSES problem ${problemData.problemId}: ${problemData.problemName} solution`, 
            githubToken
        );

        console.log(`🎉 SUCCESS: ${problemData.problemName} pushed to GitHub!`);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'CSES Sync Success!',
            message: `Solution for "${problemData.problemName}" pushed to GitHub.`,
            priority: 2
        });

    } catch (error) {
        console.error('❌ GitHub push failed:', error.message);
        
        let errorMessage = error.message;
        if (error.message.includes('409')) {
            errorMessage = 'File conflict detected. Multiple updates happening simultaneously.';
        } else if (error.message.includes('422')) {
            errorMessage = 'Invalid request to GitHub API. Please check repository access.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Repository not found. Please check repository name and permissions.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = 'GitHub authentication failed. Please re-login from extension popup.';
        }
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'CSES Sync Error',
            message: `Failed to push "${problemData.problemName}": ${errorMessage}`,
            priority: 2
        });
    }
}

// Check auth status on startup
chrome.storage.sync.get(['githubToken', 'githubUser']).then(result => {
    if (result.githubToken && result.githubUser) {
        console.log("🔑 OAuth status: Authenticated as", result.githubUser.login);
    } else {
        console.log("🔑 OAuth status: Not authenticated");
    }
});