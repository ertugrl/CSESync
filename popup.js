// popup.js - CSES Sync Popup Script

document.addEventListener('DOMContentLoaded', () => {
    const githubPatInput = document.getElementById('githubPatInput');
    const savePatButton = document.getElementById('savePatButton');
    const clearPatButton = document.getElementById('clearPatButton');
    const statusMessage = document.getElementById('statusMessage');

    // Load saved PAT when the popup opens
    chrome.storage.sync.get(['githubPat'], (result) => {
        if (chrome.runtime.lastError) {
            statusMessage.textContent = `Error loading PAT: ${chrome.runtime.lastError.message}`;
            statusMessage.classList.add('error');
            console.error("CSES Sync Popup: Error loading PAT", chrome.runtime.lastError);
            return;
        }

        if (result.githubPat) {
            githubPatInput.value = result.githubPat.substring(0, 4) + '...'; 
            statusMessage.textContent = 'PAT loaded. (Masked for security)';
            statusMessage.classList.remove('error'); // Clear previous error if any
            statusMessage.classList.add('info'); 
        } else {
            githubPatInput.value = ''; // Ensure input is empty if no PAT
            statusMessage.textContent = 'No PAT found. Please enter yours.';
            statusMessage.classList.remove('error');
            statusMessage.classList.add('info');
        }
    });

    // Save PAT when the button is clicked
    savePatButton.addEventListener('click', () => {
        const pat = githubPatInput.value.trim();

        if (pat.includes('...') && pat.length < 5) { // Simple check if it's the masked value and not a new short PAT
            statusMessage.textContent = 'Please re-enter full PAT to save changes.';
            statusMessage.classList.remove('info', 'success');
            statusMessage.classList.add('error');
            return;
        }

        if (pat) {
            chrome.storage.sync.set({ githubPat: pat }, () => {
                if (chrome.runtime.lastError) {
                    statusMessage.textContent = `Error saving PAT: ${chrome.runtime.lastError.message}`;
                    statusMessage.classList.remove('info', 'success');
                    statusMessage.classList.add('error');
                    console.error("CSES Sync Popup: Error saving PAT", chrome.runtime.lastError);
                } else {
                    statusMessage.textContent = 'PAT saved successfully!';
                    statusMessage.classList.remove('info', 'error');
                    statusMessage.classList.add('success');
                    console.log("CSES Sync Popup: PAT saved.");
                    githubPatInput.value = pat.substring(0, 4) + '...';
                }
            });
        } else {
            statusMessage.textContent = 'Please enter a valid PAT.';
            statusMessage.classList.remove('info', 'success');
            statusMessage.classList.add('error');
        }
    });

    // Clear PAT when the "Clear PAT" button is clicked
    clearPatButton.addEventListener('click', () => {
        chrome.storage.sync.remove('githubPat', () => {
            if (chrome.runtime.lastError) {
                statusMessage.textContent = `Error clearing PAT: ${chrome.runtime.lastError.message}`;
                statusMessage.classList.remove('info', 'success');
                statusMessage.classList.add('error');
                console.error("CSES Sync Popup: Error clearing PAT", chrome.runtime.lastError);
            } else {
                githubPatInput.value = ''; 
                statusMessage.textContent = 'PAT cleared successfully!';
                statusMessage.classList.remove('info', 'error', 'success'); // Remove all status classes
                statusMessage.classList.add('success');
                console.log("CSES Sync Popup: PAT cleared.");
            }
        });
    });
});