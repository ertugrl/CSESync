// content.js - CSES Sync Data Scraper

/**
 * Function to extract problem data from the CSES problem page.
 * @returns {object|null} An object containing problem data, or null if data cannot be found.
 */
function extractProblemData() {
    // Select the main title block div
    const titleBlockDiv = document.querySelector('.title-block');

    if (!titleBlockDiv) {
        console.warn('CSES Sync: Could not find the .title-block element on the page.');
        return null;
    }

    // Now, select the h1 element *inside* the titleBlockDiv for the problem title
    const problemTitleElement = titleBlockDiv.querySelector('h1');

    if (!problemTitleElement) {
        console.warn('CSES Sync: Could not find the h1 problem title within .title-block.');
        return null;
    }

    const problemTitle = problemTitleElement.innerText.trim();

    // Extract Problem ID from URL
    const url = window.location.href;
    const problemIdMatch = url.match(/\/task\/(\d+)\/?/); // THIS IS THE CRITICAL LINE
    const problemId = problemIdMatch ? problemIdMatch[1] : null;

    if (!problemId) {
        console.warn('CSES Sync: Could not extract problem ID from URL.');
        return null;
    }

    return {
        title: problemTitle,
        id: problemId,
        url: url,
    };
}

// Run the data extraction when the content script loads
const problemData = extractProblemData();

if (problemData) {
    console.log('CSES Sync: Successfully extracted problem data from page.'); // Content script'in kendi konsoluna yazdır
    // Send the extracted data to the background script (Service Worker)
    chrome.runtime.sendMessage({ type: "PROBLEM_DATA", data: problemData })
        .then(response => {
            // This 'then' block will execute if the background script sends a response
            // For now, our background script doesn't send a response, so this might not fire.
            // console.log("CSES Sync Content: Response from background:", response);
        })
        .catch(error => {
            console.error("CSES Sync Content: Error sending message to background:", error);
        });
} else {
    console.log('CSES Sync: Failed to extract problem data or not on a problem page (or problem ID not found).');
}