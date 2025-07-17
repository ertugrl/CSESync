// background.js - CSES Sync Background Service Worker

// --- Utility Functions ---

/**
 * Encodes a string to Base64.
 * GitHub API expects file content to be Base64 encoded.
 * @param {string} str The string to encode.
 * @returns {string} The Base64 encoded string.
 */
function encodeBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Decodes a Base64 string. (Not strictly needed for this task, but good for completeness)
 * @param {string} str The Base64 string to decode.
 * @returns {string} The decoded string.
 */
function decodeBase64(str) {
    return decodeURIComponent(escape(atob(str)));
}

// --- GitHub API Interaction ---

/**
 * Creates or updates a file in a GitHub repository.
 * @param {string} owner The GitHub repository owner (username/organization).
 * @param {string} repo The GitHub repository name.
 * @param {string} path The path to the file in the repository (e.g., "problems/1068/README.md").
 * @param {string} content The content of the file (plain text).
 * @param {string} message The commit message.
 * @param {string} githubPat The Personal Access Token for GitHub authentication.
 * @returns {Promise<object>} A promise that resolves with the API response, or rejects with an error.
 */
async function createOrUpdateGitHubFile(owner, repo, path, content, message, githubPat) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const encodedContent = encodeBase64(content);

    // Prepare the request body
    const body = {
        message: message,
        content: encodedContent,
    };

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API Error:', response.status, response.statusText, errorData);
            throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} - ${errorData.message}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('CSES Sync Background: Error in createOrUpdateGitHubFile:', error);
        throw error;
    }
}

// --- Main Message Listener ---

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log("CSES Sync Background: Message received from content script.");
    console.log("Sender:", sender); 
    console.log("Message data:", message);

    if (message.type === "PROBLEM_DATA") {
        const problemData = message.data;

        // 1. Get PAT from storage
        const result = await chrome.storage.sync.get(['githubPat']);
        const githubPat = result.githubPat;

        if (!githubPat) {
            console.error("CSES Sync Background: GitHub PAT not found in storage. Please set it in the extension popup.");
            return; 
        }

        // 2. Define GitHub repository details (For now, hardcode these or get from user settings later)
        const owner = 'testUser9887'; // TODO: Replace with your GitHub username
        const repo = 'testRepo';       // TODO: Replace with your GitHub repository name (e.g., 'CSES_Solutions')

        // 3. Prepare file paths and content
        const problemFolderPath = `CSES_Problems/${problemData.id}-${problemData.title.replace(/[^a-zA-Z0-9-]/g, '_')}`;
        const readmePath = `${problemFolderPath}/README.md`;
        const codeFilePath = `${problemFolderPath}/solution.cpp`; 

        // Content for README.md
        const readmeContent = `# ${problemData.title} (ID: ${problemData.id})\n\n` +
                              `**Problem Link:** [${problemData.url}](${problemData.url})\n\n` +
                              `## Problem Description\n\n` +
                              `// TODO: Problem description will be extracted here later. For now, it's a placeholder.\n\n` +
                              `## Solution\n\n` +
                              `// TODO: Your solution code will be pushed here later. For now, it's a placeholder.\n`;

        // Content for the code file (initially empty or with a template)
        const codeFileContent = `// CSES Problem ${problemData.id}: ${problemData.title}\n` +
                                `// Link: ${problemData.url}\n\n` +
                                `// Your solution code here\n\n`;

        try {
            console.log(`CSES Sync Background: Attempting to create/update README for ${problemData.title}...`);
            const readmeResponse = await createOrUpdateGitHubFile(
                owner, repo, readmePath, readmeContent, `Add CSES problem ${problemData.id}: ${problemData.title} README`, githubPat
            );
            console.log('CSES Sync Background: README created/updated successfully:', readmeResponse.content.html_url);

            console.log(`CSES Sync Background: Attempting to create/update solution file for ${problemData.title}...`);
            const codeFileResponse = await createOrUpdateGitHubFile(
                owner, repo, codeFilePath, codeFileContent, `Add CSES problem ${problemData.id}: ${problemData.title} solution file`, githubPat
            );
            console.log('CSES Sync Background: Solution file created/updated successfully:', codeFileResponse.content.html_url);

            // TODO: Send success notification to user (Task 4.1)
            console.log(`CSES Sync: Successfully pushed ${problemData.title} to GitHub!`);

        } catch (error) {
            console.error('CSES Sync Background: Failed to push files to GitHub:', error);
            // TODO: Send error notification to user (Task 4.1)
        }
    }
});

console.log("CSES Sync Background: Service Worker started.");