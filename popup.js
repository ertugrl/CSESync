// popup.js - CSES Sync Popup Script

console.log("🎨 CSES Sync Popup: Script loading...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("🎨 CSES Sync Popup: DOM loaded, initializing...");
    
    const githubPatInput = document.getElementById('githubPatInput');
    const savePatButton = document.getElementById('savePatButton');
    const clearPatButton = document.getElementById('clearPatButton');
    const statusMessage = document.getElementById('statusMessage');

    console.log("🎨 Elements found:");
    console.log("   githubPatInput:", !!githubPatInput);
    console.log("   savePatButton:", !!savePatButton);
    console.log("   clearPatButton:", !!clearPatButton);
    console.log("   statusMessage:", !!statusMessage);

    // Load saved PAT when the popup opens
    console.log("🔑 CSES Sync Popup: Loading saved PAT from storage...");
    chrome.storage.sync.get(['githubPat'], (result) => {
        console.log("💾 Storage get result:", result);
        console.log("💾 Chrome runtime last error:", chrome.runtime.lastError);
        
        if (chrome.runtime.lastError) {
            const errorMsg = `Error loading PAT: ${chrome.runtime.lastError.message}`;
            console.error("❌ CSES Sync Popup:", errorMsg);
            statusMessage.textContent = errorMsg;
            statusMessage.classList.add('error');
            return;
        }

        if (result.githubPat) {
            console.log("✅ PAT found in storage!");
            console.log("   PAT length:", result.githubPat.length);
            console.log("   PAT starts with:", result.githubPat.substring(0, 4));
            
            githubPatInput.value = result.githubPat.substring(0, 4) + '...'; 
            statusMessage.textContent = 'PAT loaded. (Masked for security)';
            statusMessage.classList.remove('error'); // Clear previous error if any
            statusMessage.classList.add('info'); 
        } else {
            console.log("ℹ️ No PAT found in storage");
            githubPatInput.value = ''; // Ensure input is empty if no PAT
            statusMessage.textContent = 'No PAT found. Please enter yours.';
            statusMessage.classList.remove('error');
            statusMessage.classList.add('info');
        }
    });

    // Save PAT when the button is clicked
    savePatButton.addEventListener('click', () => {
        console.log("💾 CSES Sync Popup: Save PAT button clicked");
        const pat = githubPatInput.value.trim();
        
        console.log("🔑 PAT validation:");
        console.log("   PAT length:", pat.length);
        console.log("   PAT starts with:", pat.substring(0, 4));
        console.log("   Contains '...':", pat.includes('...'));

        if (pat.includes('...') && pat.length < 5) { // Simple check if it's the masked value and not a new short PAT
            const errorMsg = 'Please re-enter full PAT to save changes.';
            console.warn("⚠️ CSES Sync Popup:", errorMsg);
            statusMessage.textContent = errorMsg;
            statusMessage.classList.remove('info', 'success');
            statusMessage.classList.add('error');
            return;
        }

        if (pat) {
            console.log("💾 CSES Sync Popup: Saving PAT to storage...");
            chrome.storage.sync.set({ githubPat: pat }, () => {
                console.log("💾 Storage set complete");
                console.log("💾 Chrome runtime last error:", chrome.runtime.lastError);
                
                if (chrome.runtime.lastError) {
                    const errorMsg = `Error saving PAT: ${chrome.runtime.lastError.message}`;
                    console.error("❌ CSES Sync Popup:", errorMsg);
                    statusMessage.textContent = errorMsg;
                    statusMessage.classList.remove('info', 'success');
                    statusMessage.classList.add('error');
                } else {
                    console.log("✅ PAT saved successfully!");
                    statusMessage.textContent = 'PAT saved successfully!';
                    statusMessage.classList.remove('info', 'error');
                    statusMessage.classList.add('success');
                    githubPatInput.value = pat.substring(0, 4) + '...';
                }
            });
        } else {
            const errorMsg = 'Please enter a valid PAT.';
            console.warn("⚠️ CSES Sync Popup:", errorMsg);
            statusMessage.textContent = errorMsg;
            statusMessage.classList.remove('info', 'success');
            statusMessage.classList.add('error');
        }
    });

    // Clear PAT when the "Clear PAT" button is clicked
    clearPatButton.addEventListener('click', () => {
        console.log("🗑️ CSES Sync Popup: Clear PAT button clicked");
        chrome.storage.sync.remove('githubPat', () => {
            console.log("🗑️ Storage remove complete");
            console.log("💾 Chrome runtime last error:", chrome.runtime.lastError);
            
            if (chrome.runtime.lastError) {
                const errorMsg = `Error clearing PAT: ${chrome.runtime.lastError.message}`;
                console.error("❌ CSES Sync Popup:", errorMsg);
                statusMessage.textContent = errorMsg;
                statusMessage.classList.remove('info', 'success');
                statusMessage.classList.add('error');
            } else {
                console.log("✅ PAT cleared successfully!");
                githubPatInput.value = ''; 
                statusMessage.textContent = 'PAT cleared successfully!';
                statusMessage.classList.remove('info', 'error', 'success'); // Remove all status classes
                statusMessage.classList.add('success');
            }
        });
    });
    
    console.log("✅ CSES Sync Popup: All event listeners attached, popup ready!");
});

console.log("✅ CSES Sync Popup: Script loaded!");