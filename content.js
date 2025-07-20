// content.js - CSES Sync Data Scraper & Event Trigger

console.log("🌍 CSES Sync Content: Script starting to load...");
console.log("🔗 Current URL:", window.location.href);
console.log("📍 Page title:", document.title);

// --- SELECTORS (Updated for CSES Result page) ---
const SELECTORS = {
    // Result sayfasındaki Task link'i - resimdeki "Increasing Array" link'i
    PROBLEM_NAME_LINK: 'a[href*="/task/"]', // Daha genel selector
    // Result sayfasındaki status ve result
    SUBMISSION_STATUS: 'td:contains("Status:")', // Bu result sayfasında farklı olabilir
    SUBMISSION_RESULT: 'td:contains("ACCEPTED"), td:contains("WRONG ANSWER"), td:contains("TIME LIMIT EXCEEDED")', // Result değeri
    // Result sayfasındaki kod bloğu
    SUBMITTED_CODE_BLOCK: 'pre, .code-block, div[class*="code"]' // Daha genel kod selector'ları
};

console.log("🎯 CSES Sync Content: Selectors defined for RESULT page:");
console.log("   PROBLEM_NAME_LINK:", SELECTORS.PROBLEM_NAME_LINK);
console.log("   SUBMISSION_STATUS:", SELECTORS.SUBMISSION_STATUS);
console.log("   SUBMISSION_RESULT:", SELECTORS.SUBMISSION_RESULT);
console.log("   SUBMITTED_CODE_BLOCK:", SELECTORS.SUBMITTED_CODE_BLOCK);

// --- Helper Functions ---

/**
 * Checks the current submission result and triggers push if ACCEPTED
 */
function checkSubmissionResult() {
    console.log('🔍 CSES Sync: Checking submission result...');
    
    // ===========================================
    // 📋 STEP 1: ACCEPTED FLAG DETECTION
    // ===========================================
    let resultText = '';
    let statusText = '';
    
    // Quick check for ACCEPTED
    if (document.body.textContent.includes('ACCEPTED')) {
        console.log('✅ STEP 1: ACCEPTED flag detected');
        resultText = 'ACCEPTED';
        statusText = 'READY';
    } else {
        console.log('❌ STEP 1: ACCEPTED flag not found');
        return;
    }
    
    // ===========================================
    // 🆔 STEP 2: PROBLEM ID EXTRACTION
    // ===========================================
    let problemId = null;
    let problemUrl = null;
    
    const taskLinks = document.querySelectorAll('a[href*="/task/"]');
    console.log(`🔗 STEP 2: Found ${taskLinks.length} task links`);
    
    for (let link of taskLinks) {
        const href = link.getAttribute('href');
        const idMatch = href.match(/\/task\/(\d+)\/?/);
        if (idMatch) {
            problemId = idMatch[1];
            problemUrl = `https://cses.fi/problemset/task/${problemId}/`;
            console.log(`✅ STEP 2: Problem ID extracted: ${problemId}`);
            break;
        }
    }
    
    if (!problemId) {
        console.log('❌ STEP 2: Problem ID extraction failed');
        return;
    }
    
    // ===========================================
    // 📄 STEP 3: PROBLEM CONTENT FETCHING
    // ===========================================
    console.log('🌐 STEP 3: Fetching problem content...');
    fetchProblemContent(problemId, problemUrl);
}

/**
 * Fetches problem content from the task URL
 */
async function fetchProblemContent(problemId, problemUrl) {
    try {
        const response = await fetch(problemUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const htmlContent = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const titleElement = doc.querySelector('h1');
        const problemTitle = titleElement ? titleElement.textContent.trim() : `Problem ${problemId}`;
        
        // Extract problem description
        const contentElements = doc.querySelectorAll('p, div');
        let problemDescription = '';
        for (let element of contentElements) {
            const text = element.textContent.trim();
            if (text.length > 50 && !text.includes('Time limit') && !text.includes('Memory limit')) {
                problemDescription = text;
                break;
            }
        }
        
        console.log(`✅ STEP 3: Content fetched - "${problemTitle}"`);
        
        // Proceed with data extraction
        proceedWithDataExtraction(problemId, problemTitle, problemDescription, problemUrl);
        
    } catch (error) {
        console.error('❌ STEP 3: Content fetch failed:', error.message);
    }
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

/**
 * Proceeds with the actual data extraction if all tests pass
 */
function proceedWithDataExtraction(problemId, problemTitle, problemDescription, problemUrl) {
    console.log('📊 STEP 4: Extracting submitted code...');
    
    const codeElements = document.querySelectorAll('pre, code, .code-block');
    let submittedCode = '';
    
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
            console.log(`✅ STEP 4: Code extracted and formatted (${submittedCode.length} chars, ${submittedCode.split('\n').length} lines)`);
            break;
        }
    }
    
    if (submittedCode) {
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
        
        console.log('📤 STEP 5: Sending to background for GitHub push...');
        console.log('📝 Code preview (first 3 lines):');
        submittedCode.split('\n').slice(0, 3).forEach((line, i) => {
            console.log(`   ${i + 1}: ${line}`);
        });
        
        chrome.runtime.sendMessage(submissionData)
            .then(() => {
                console.log('✅ SUCCESS: Data sent to background!');
            })
            .catch(error => {
                console.error('❌ Error sending message:', error);
            });
    } else {
        console.log('❌ STEP 4: Could not find submitted code');
    }
}

/**
 * Monitors the DOM for changes to the submission result.
 * For result pages, checks immediately since result is already shown.
 */
function monitorSubmissionResult() {
    console.log('🔭 CSES Sync Content: Starting submission result monitoring...');
    
    // Check if this is a result page (result already shown) or submission page (need to wait)
    const isResultPage = window.location.href.includes('/result/');
    
    if (isResultPage) {
        console.log('📊 CSES Sync Content: Result page detected - checking immediately...');
        
        // On result pages, check immediately since result is already available
        checkSubmissionResult();
        
        // Also set up observer in case content loads dynamically
        setupMutationObserver();
    } else {
        console.log('📊 CSES Sync Content: Submission page detected - setting up observer...');
        setupMutationObserver();
    }
}

/**
 * Sets up mutation observer for dynamic content changes
 */
function setupMutationObserver() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true, attributes: true, characterData: true };
    console.log("⚙️ Observer config:", config);

    let hasPushed = false;
    let mutationCount = 0;

    const observer = new MutationObserver((mutationsList, observer) => {
        mutationCount++;
        console.log(`🔄 CSES Sync Content: DOM mutation #${mutationCount} detected`);
        
        if (hasPushed) {
            console.log('✋ CSES Sync Content: Already pushed, disconnecting observer');
            observer.disconnect();
            return;
        }

        // Check result after each mutation
        checkSubmissionResult();
    });

    observer.observe(targetNode, config);
    console.log('👀 CSES Sync Content: MutationObserver started');
}

// --- Main Execution Logic ---

console.log("🔍 CSES Sync Content: Checking page URL...");
console.log("   Full URL:", window.location.href);
console.log("   Path:", window.location.pathname);
console.log("   Includes '/result/':", window.location.href.includes('/result/'));
console.log("   Includes '/submission/':", window.location.href.includes('/submission/'));

// Check if we are on a CSES result details page (where we can see ACCEPTED/REJECTED results)
if (window.location.href.includes('/result/')) {
    console.log('✅ CSES Sync Content: Detected a RESULT page! Starting monitor...');
    monitorSubmissionResult();
} else if (window.location.href.includes('/submission/')) {
    console.log('✅ CSES Sync Content: Detected a SUBMISSION page! Starting monitor...');
    monitorSubmissionResult();
} else {
    // If not on a result/submission page, do nothing (or add other specific logic if needed later)
    console.log('ℹ️ CSES Sync Content: Not on a result/submission page. Extension will wait.');
    console.log('💡 To test the extension, navigate to a CSES result page (URL containing "/result/") or submission page (URL containing "/submission/")');
}

console.log("✅ CSES Sync Content: Script loaded and initialized!");