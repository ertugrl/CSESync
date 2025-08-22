// content.js - CSES Sync Data Scraper & Event Trigger

console.log("🌍 CSES Sync Content: Script starting to load...");
console.log("🔗 Current URL:", window.location.href);
console.log("📍 Page title:", document.title);

// --- SELECTORS (Updated for CSES submission flow) ---
const SELECTORS = {
    // Problem sayfasındaki submit butonu
    SUBMIT_BUTTON: 'input[type="submit"][value="Submit"], button[type="submit"], input[value="Submit"], button',
    // Result sayfasındaki Task link'i
    PROBLEM_NAME_LINK: 'a[href*="/task/"]',
    // Submit sonrası gözüken Result bloğu - "Result:" yazan kısmın yanındaki Accepted
    // Note: Bu selector'lar JavaScript'te custom olarak bulunacak
    RESULT_TABLE_SELECTOR: 'table, .result-table, div.content',
    // Result sayfasındaki kod bloğu
    SUBMITTED_CODE_BLOCK: 'pre, .code-block, div[class*="code"]'
};

console.log("🎯 CSES Sync Content: Selectors defined:");
console.log("   SUBMIT_BUTTON:", SELECTORS.SUBMIT_BUTTON);
console.log("   PROBLEM_NAME_LINK:", SELECTORS.PROBLEM_NAME_LINK);
console.log("   RESULT_TABLE_SELECTOR:", SELECTORS.RESULT_TABLE_SELECTOR);
console.log("   SUBMITTED_CODE_BLOCK:", SELECTORS.SUBMITTED_CODE_BLOCK);

// --- GLOBAL STATE ---
let submitClicked = false;
let resultObserver = null;

// Check if submit was clicked in this session (survives page navigation)
function wasSubmitClicked() {
    return sessionStorage.getItem('csesSubmitClicked') === 'true';
}

// Mark submit as clicked (survives page navigation)
function markSubmitClicked() {
    submitClicked = true;
    sessionStorage.setItem('csesSubmitClicked', 'true');
}

// Clear submit clicked state
function clearSubmitClicked() {
    submitClicked = false;
    sessionStorage.removeItem('csesSubmitClicked');
}

// Custom function to find Result: block and check if it's ACCEPTED
function findResultStatus() {
    console.log('🔍 Searching for Result: block...');
    
    // Find all table cells
    const cells = document.querySelectorAll('td, th, .cell, div');
    
    for (let cell of cells) {
        const text = cell.textContent.trim();
        
        // Look for "Result:" cell
        if (text === 'Result:' || text.includes('Result:')) {
            console.log('✅ Found Result: cell:', cell.outerHTML);
            
            // Try to find the next cell (sibling)
            let nextCell = cell.nextElementSibling;
            if (nextCell) {
                const resultText = nextCell.textContent.trim();
                console.log('📋 Result value:', resultText);
                
                if (resultText.includes('Accepted') || resultText.includes('ACCEPTED')) {
                    return 'ACCEPTED';
                } else if (resultText.includes('Wrong') || resultText.includes('WRONG')) {
                    return 'WRONG_ANSWER';
                } else if (resultText.includes('Time limit') || resultText.includes('TIME LIMIT')) {
                    return 'TIME_LIMIT';
                }
            }
            
            // Try to find result in same row (look for neighboring cells)
            const row = cell.closest('tr');
            if (row) {
                const rowCells = row.querySelectorAll('td, th');
                for (let i = 0; i < rowCells.length - 1; i++) {
                    if (rowCells[i] === cell && rowCells[i + 1]) {
                        const resultText = rowCells[i + 1].textContent.trim();
                        console.log('📋 Row result value:', resultText);
                        
                        if (resultText.includes('Accepted') || resultText.includes('ACCEPTED')) {
                            return 'ACCEPTED';
                        } else if (resultText.includes('Wrong') || resultText.includes('WRONG')) {
                            return 'WRONG_ANSWER';
                        } else if (resultText.includes('Time limit') || resultText.includes('TIME LIMIT')) {
                            return 'TIME_LIMIT';
                        }
                    }
                }
            }
        }
    }
    
    console.log('⏳ Result: block not found yet');
    return null;
}

/**
 * Formats code by ensuring proper line breaks and basic indentation
 */
function formatCode(code) {
    if (!code || code.length < 10) return code;
    
    // First, normalize any existing line breaks
    let formatted = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // If code is all on one line (no \n characters), try to add line breaks
    if (!formatted.includes('\n') || formatted.split('\n').length < 3) {
        console.log('🔧 Code appears to be on single line, adding formatting...');
        
        // Add line breaks after common C++ patterns
        formatted = formatted
            // After #include statements
            .replace(/(#include\s*<[^>]+>)/g, '$1\n')
            // After semicolons (but not inside for loops)
            .replace(/;(?!\s*[^{};]*[<>=])/g, ';\n')
            // After opening braces
            .replace(/\{/g, '{\n')
            // Before closing braces  
            .replace(/\}/g, '\n}')
            // After using namespace
            .replace(/(using\s+namespace\s+\w+\s*;)/g, '$1\n')
            // Clean up multiple newlines
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // Remove leading/trailing whitespace on lines
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            // Remove empty lines at start/end
            .replace(/^\n+/, '')
            .replace(/\n+$/, '');
    }
    
    // Basic indentation for C++ code
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentedLines = [];
    
    for (let line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            indentedLines.push('');
            continue;
        }
        
        // Decrease indent before closing braces
        if (trimmedLine.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Add current line with proper indentation
        const indent = '    '.repeat(indentLevel); // 4 spaces per level
        indentedLines.push(indent + trimmedLine);
        
        // Increase indent after opening braces
        if (trimmedLine.endsWith('{')) {
            indentLevel++;
        }
    }
    
    const result = indentedLines.join('\n');
    console.log(`✅ Code formatted: ${lines.length} lines, ${indentLevel} final indent level`);
    return result;
}

// --- Helper Functions ---

/**
 * Sets up submit button listener to track when user actually submits
 */
function setupSubmitListener() {
    console.log('🎯 Setting up submit button listener...');
    
    // Function to attach listener to submit button
    function attachSubmitListener() {
        const submitButton = document.querySelector(SELECTORS.SUBMIT_BUTTON);
        if (submitButton) {
            console.log('✅ Submit button found:', submitButton);
            
            submitButton.addEventListener('click', function() {
                console.log('🚀 SUBMIT BUTTON CLICKED! Marking submit state...');
                markSubmitClicked();
                
                // Start monitoring for results after a short delay (to allow navigation)
                setTimeout(() => {
                    checkSubmissionResult();
                }, 1000);
            });
            
            // Also listen for form submit events
            const form = submitButton.closest('form');
            if (form) {
                form.addEventListener('submit', function() {
                    console.log('🚀 FORM SUBMITTED! Marking submit state...');
                    markSubmitClicked();
                    setTimeout(() => {
                        checkSubmissionResult();
                    }, 1000);
                });
            }
            
            return true;
        }
        return false;
    }
    
    // Try to attach listener immediately
    if (attachSubmitListener()) {
        console.log('✅ Submit listener attached immediately');
        return;
    }
    
    // If submit button not found, set up observer to wait for it
    const observer = new MutationObserver(() => {
        if (attachSubmitListener()) {
            console.log('✅ Submit listener attached after DOM change');
            observer.disconnect();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('⏳ Waiting for submit button to appear...');
}

/**
 * Checks the current submission result and triggers push if ACCEPTED
 * Only works if submit button was clicked first
 */
function checkSubmissionResult() {
    // Only proceed if submit button was actually clicked
    if (!wasSubmitClicked()) {
        console.log('⚠️ Submit button was not clicked, skipping result detection');
        return;
    }
    
    console.log('🔍 CSES Sync: Starting ACCEPTED detection after submit...');
    
    // ===========================================
    // 🎯 RESULT DETECTION SYSTEM
    // ===========================================
    
    // Use the new selectors for Result: block (not test cases)
    
    function processResult() {
        console.log('🔄 CSES Sync: Processing result...');
        
        // Use custom function to find Result: block
        const resultStatus = findResultStatus();
        
        if (resultStatus === 'ACCEPTED') {
            console.log('✅ STEP 1: ACCEPTED result confirmed in Result: block');
            
            // Proceed with data extraction (and stop observing)
            if (resultObserver) resultObserver.disconnect();
            extractAndPushData('ACCEPTED');
            
            // Clear submit state to prevent duplicate pushes
            clearSubmitClicked();
            
        } else if (resultStatus === 'WRONG_ANSWER' || resultStatus === 'TIME_LIMIT') {
            console.log('❌ STEP 1: Non-ACCEPTED result detected in Result: block');
            console.log('🔍 Result status:', resultStatus);
            console.log('⏹️ CSES Sync: Skipping push for non-ACCEPTED result');
            
            // Stop observing since we found a definitive result
            if (resultObserver) resultObserver.disconnect();
            
            // Clear submit state since we got a result (but didn't push)
            clearSubmitClicked();
            
        } else {
            console.log('⏳ STEP 1: Result: block not yet available, continuing to wait...');
        }
    }
    
    // First check: Maybe result is already there
    processResult();
    
    // Setup MutationObserver to watch for DOM changes
    resultObserver = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        mutations.forEach((mutation) => {
            // Check if any new nodes contain result elements
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node or its children contain Result: block
                        if (node.textContent && node.textContent.includes('Result:')) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });
        
        if (shouldCheck) {
            console.log('🔄 CSES Sync: DOM change detected, re-checking result...');
            processResult();
        }
    });
    
    // Start observing
    resultObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Safety timeout: Stop observing after 30 seconds
    setTimeout(() => {
        if (resultObserver) {
            resultObserver.disconnect();
            console.log('⏰ CSES Sync: Observer timeout, stopping result detection');
        }
    }, 30000);
    
    console.log('👀 CSES Sync: MutationObserver started, waiting for result...');
}

/**
 * Extract problem data and push to GitHub
 */
function extractAndPushData(resultStatus) {
    console.log('📊 STEP 2: Starting data extraction...');
    
    // ===========================================
    // 🆔 STEP 2A: PROBLEM ID EXTRACTION
    // ===========================================
    let problemId = null;
    let problemUrl = null;
    
    const taskLinks = document.querySelectorAll('a[href*="/task/"]');
    console.log(`🔗 STEP 2A: Found ${taskLinks.length} task links`);
    
    for (let link of taskLinks) {
        const href = link.getAttribute('href');
        const idMatch = href.match(/\/task\/(\d+)\/?/);
        if (idMatch) {
            problemId = idMatch[1];
            problemUrl = `https://cses.fi/problemset/task/${problemId}/`;
            console.log(`✅ STEP 2A: Problem ID extracted: ${problemId}`);
            break;
        }
    }
    
    if (!problemId) {
        console.log('❌ STEP 2A: Problem ID extraction failed');
        return;
    }
    
    // ===========================================
    // 📄 STEP 2B: PROBLEM CONTENT FETCHING
    // ===========================================
    console.log('🌐 STEP 2B: Fetching problem content...');
    fetchProblemContentAndProcess(problemId, problemUrl);
}

/**
 * Fetches problem content and processes the submission
 */
async function fetchProblemContentAndProcess(problemId, problemUrl) {
    let problemTitle = `Problem ${problemId}`;
    let problemDescription = '';
    
    try {
        const response = await fetch(problemUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const htmlContent = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const titleElement = doc.querySelector('h1');
        problemTitle = titleElement ? titleElement.textContent.trim() : `Problem ${problemId}`;
        
        // Extract problem description from the exact selector requested
        const exactSelector = 'body > div.skeleton > div.content-wrapper > div.content > div > p:nth-child(1)';
        const descEl = doc.querySelector(exactSelector);
        if (descEl && descEl.textContent) {
            problemDescription = descEl.textContent.trim();
        } else {
            // Fallback: previous heuristic if the structure changes
            const contentElements = doc.querySelectorAll('p, div');
            for (let element of contentElements) {
                const text = element.textContent.trim();
                if (text.length > 50 && !text.includes('Time limit') && !text.includes('Memory limit')) {
                    problemDescription = text;
                    break;
                }
            }
        }
        
        console.log(`✅ STEP 2B: Content fetched - "${problemTitle}"`);
        
    } catch (error) {
        console.error('❌ STEP 2B: Content fetch failed:', error.message);
        console.log('⚠️ Continuing with basic problem info...');
    }
    
    // ===========================================
    // 💻 STEP 3: CODE EXTRACTION
    // ===========================================
    console.log('📊 STEP 3: Extracting submitted code...');
    
    const codeElements = document.querySelectorAll('pre, code, .code-block');
    let submittedCode = '';
    
    // Try exact Compiler report container first (each line is a child element)
    try {
        const exactCodeSelector = 'body > div.skeleton > div.content-wrapper > div.content > div:nth-child(5) > div > pre > div';
        const codeLinesContainer = document.querySelector(exactCodeSelector);
        if (codeLinesContainer) {
            console.log('🔎 Found compiler report code container. Collecting lines...');
            const lines = [];
            const children = codeLinesContainer.children;
            for (let i = 0; i < children.length; i++) {
                const lineText = (children[i].textContent || '')
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n');
                lines.push(lineText);
            }
            const joined = lines.join('\n').trim();
            if (joined) {
                submittedCode = formatCode(joined);
                console.log(`✅ STEP 3: Code collected from compiler report container (${submittedCode.split('\n').length} lines)`);
            }
        }
    } catch (e) {
        console.warn('⚠️ Compiler report container parsing failed:', e.message);
    }
    
    if (!submittedCode) {
        for (let element of codeElements) {
            // Try different methods to get the code content
            let codeText = '';
            
            // Method 1: Try textContent first (preserves whitespace better)
            codeText = element.textContent || '';
            
            // Method 2: If textContent doesn't have line breaks, try innerHTML and strip tags
            if (codeText && (!codeText.includes('\n') || codeText.split('\n').length < 3)) {
                const innerHTML = element.innerHTML;
                if (innerHTML.includes('<br>') || innerHTML.includes('</div>') || innerHTML.includes('\n')) {
                    // Convert HTML line breaks to actual line breaks
                    codeText = innerHTML
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/div>/gi, '\n')
                        .replace(/<[^>]*>/g, '') // Remove all HTML tags
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"');
                }
            }
            
            codeText = codeText.trim();
            
            console.log(`🔍 Checking element: ${element.tagName}, content length: ${codeText.length}`);
            console.log(`   Has newlines: ${codeText.includes('\n')}, line count: ${codeText.split('\n').length}`);
            
            if (codeText.length > 20 && (
                codeText.includes('#include') || 
                codeText.includes('int main') || 
                codeText.includes('using namespace')
            )) {
                console.log(`✅ Found code element with ${codeText.split('\n').length} lines`);
                
                // Apply formatting to improve readability
                submittedCode = formatCode(codeText);
                console.log(`✅ STEP 3: Code extracted and formatted (${submittedCode.length} chars, ${submittedCode.split('\n').length} lines)`);
                break;
            }
        }
    }
    
    if (!submittedCode) {
        console.log('❌ STEP 3: Could not find submitted code');
        return;
    }
    
    // ===========================================
    // 🚀 STEP 4: SEND TO BACKGROUND
    // ===========================================
    const submissionData = {
        success: true,
        type: "ACCEPTED_SUBMISSION",
        data: {
            problemId: problemId,
            problemName: problemTitle,
            problemUrl: problemUrl,
            problemDescription: problemDescription,
            submissionUrl: window.location.href,
            submittedCode: submittedCode,
        }
    };
    
    console.log('📤 STEP 4: Sending to background for GitHub push...');
    console.log('📝 Code preview (first 3 lines):');
    submittedCode.split('\n').slice(0, 3).forEach((line, i) => {
        console.log(`   ${i + 1}: ${line}`);
    });
    
    try {
        await chrome.runtime.sendMessage(submissionData);
        console.log('✅ SUCCESS: Data sent to background!');
    } catch (error) {
        console.error('❌ Error sending message:', error);
    }
}

// --- Main Execution Logic ---

console.log("🔍 CSES Sync Content: Checking page URL...");
console.log("   Full URL:", window.location.href);
console.log("   Path:", window.location.pathname);

// Set up submit button listener on any CSES page
if (window.location.href.includes('cses.fi')) {
    console.log('✅ CSES Sync Content: On CSES website! Setting up submit tracking...');
    
    // Set up submit button listener
    setupSubmitListener();
    
    // If we're on a result/submission page and submit was already clicked, start monitoring
    if ((window.location.href.includes('/result/') || window.location.href.includes('/submission/')) && wasSubmitClicked()) {
        console.log('✅ Already on result page after submit, starting result monitoring...');
        checkSubmissionResult();
    }
    
} else {
    console.log('ℹ️ CSES Sync Content: Not on CSES website. Extension inactive.');
}

console.log("✅ CSES Sync Content: Script loaded and initialized!");