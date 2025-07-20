// background.js - CSES Sync Background Service Worker

console.log("🚀 CSES Sync Background: Service Worker started and ready!");

// --- Utility Functions ---
function encodeBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
    }));
}

function decodeBase64(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// --- GitHub API Interaction ---
async function createOrUpdateGitHubFile(owner, repo, path, content, message, githubPat, maxRetries = 3) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Get existing file SHA if it exists (fresh each attempt)
            let sha = null;
            try {
                const getResponse = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `token ${githubPat}`,
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
                    'Authorization': `token ${githubPat}`,
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
                // Wait a bit before retry to avoid rapid requests
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }
            
            // If we've exhausted retries or it's a different error, throw
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

// --- Main Message Listener ---
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "ACCEPTED_SUBMISSION" || (message.success && message.type === "ACCEPTED_SUBMISSION")) {
        console.log("🎯 Processing ACCEPTED_SUBMISSION...");
        
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

        // Get PAT from storage
        const result = await chrome.storage.sync.get(['githubPat']);
        const githubPat = result.githubPat;

        if (!githubPat) {
            console.error("❌ GitHub PAT not found");
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'CSES Sync Error',
                message: 'GitHub PAT not set. Please configure in extension popup.',
                priority: 2
            });
            return; 
        }

        // GitHub repository details
        const owner = 'testUser9887'; // Your GitHub username
        const repo = 'testRepo';  // Your repository name

        console.log(`🐙 Target: ${owner}/${repo}`);

        // Check if this problem was already processed recently to prevent duplicates
        const submissionKey = `${problemData.problemId}_${problemData.problemName}`;
        const lastProcessed = await chrome.storage.local.get([submissionKey]);
        const now = Date.now();
        
        if (lastProcessed[submissionKey] && (now - lastProcessed[submissionKey]) < 30000) { // 30 seconds cooldown
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
                owner, repo, readmePath, readmeContent, `Add CSES problem ${problemData.problemId}: ${problemData.problemName} README`, githubPat
            );

            console.log(`🚀 Creating solution file...`);
            await createOrUpdateGitHubFile(
                owner, repo, codeFilePath, codeFileContent, `Add CSES problem ${problemData.problemId}: ${problemData.problemName} solution`, githubPat
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
            
            // More specific error messages
            let errorMessage = error.message;
            if (error.message.includes('409')) {
                errorMessage = 'File conflict detected. Multiple updates happening simultaneously.';
            } else if (error.message.includes('422')) {
                errorMessage = 'Invalid request to GitHub API. Please check repository access.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Repository not found. Please check repository name and permissions.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage = 'GitHub authentication failed. Please check your PAT token.';
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
});

// Test storage immediately on startup
chrome.storage.sync.get(['githubPat']).then(result => {
    console.log("🔑 PAT status:", !!result.githubPat ? "Available" : "Not set");
});