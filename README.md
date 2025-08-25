# CSESync - Automatic GitHub Integration for Competitive Programming

#### Video Demo: "https://youtu.be/XentLk-gjHw"

#### Description:

CSES Sync is a Chrome browser extension designed specifically for competitive programmers who use the CSES Problem Set (https://cses.fi/problemset/). This extension automatically synchronizes accepted programming solutions from CSES directly to a GitHub repository, eliminating the manual process of copying and organizing solved problems. The extension intelligently tracks user submissions and only pushes code to GitHub when a solution is genuinely accepted, making it an invaluable tool for maintaining a comprehensive portfolio of competitive programming achievements.

## Installation and Setup

### Prerequisites
- Google Chrome browser (version 88 or higher)
- A GitHub account (OAuth Device Flow is used; no personal access token setup required)

### Installation Steps

1. **Download the Extension Files**
   - Clone or download this repository to your local machine
   - Ensure all files (manifest.json, background.js, content.js, popup.html, popup.js, settings.html, settings.js, and icons folder) are in the same directory

2. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by toggling the switch in the top-right corner
   - Click "Load unpacked" button
   - Select the folder containing the extension files
   - The CSES Sync extension should now appear in your extensions list

3. **Connect GitHub (OAuth Device Flow)**
   - Click the CSES Sync extension icon in your Chrome toolbar
   - In the popup, click "Sign in with GitHub"
   - A one-time code and a link to GitHub will appear; follow the link and enter the code to authorize
   - After authorization, the popup will show that you are connected (your GitHub username appears)
   - Open "Settings" in the popup and configure your repository:
     - Paste your repository URL (e.g., `https://github.com/yourusername/cses-solutions`) and click "Save"

### How to Use

1. **Navigate to CSES Problem Set**
   - Go to https://cses.fi/problemset/
   - Log in to your CSES account
   - Select any problem you want to solve

2. **Solve and Submit**
   - Write your solution in the code editor
   - Click the "Submit" button (this is crucial - the extension only activates when you actually click submit)
   - Wait for the submission to be processed (3-4 seconds)

3. **Automatic Synchronization**
   - If your solution is accepted, the extension will automatically:
     - Extract your code and problem metadata
     - Create a properly formatted commit
     - Push the solution to your GitHub repository
   - You'll see a confirmation in the extension popup

4. **Monitor Activity**
   - Click the extension icon to view recent synchronization activities
   - Check your GitHub repository to see the organized solutions

### Repository Structure
The extension creates the following structure in your GitHub repository:
```
your-repo/
├── Problem-1001-Problem-Name/
│   └── solution.cpp
├── Problem-1002-Another-Problem/
│   └── solution.cpp
└── ...
```

### Troubleshooting

**Extension not detecting submissions:**
- Ensure you're clicking the actual Submit button on CSES
- Check that you're on a CSES problem page (URL contains cses.fi)
- Verify the extension is enabled in Chrome

**GitHub push failures:**
- Ensure you are signed in via the extension popup (GitHub OAuth)
- Confirm the extension was authorized with repository access (scope `repo`)
- Check that the repository URL in Settings is correct and that you have write access

**Code not appearing correctly:**
- The extension automatically formats C++ code for better readability
- If formatting appears incorrect, the original code structure is preserved

## Project Overview

The primary motivation behind CSES Sync stems from the common practice among competitive programmers of maintaining solution repositories on GitHub for portfolio purposes, interview preparation, and personal reference. Manually copying each accepted solution from CSES to GitHub is time-consuming and error-prone. This extension automates the entire workflow, ensuring that every accepted solution is properly formatted and committed to the user's repository with appropriate metadata including problem names, descriptions, and submission details.

## Technical Architecture

### Core Files and Functionality

**manifest.json**
This file serves as the extension's configuration blueprint, defining permissions, content scripts, background scripts, and the extension's metadata. It specifies that the extension requires access to CSES domains and GitHub API endpoints, along with storage permissions for maintaining user settings and authentication tokens. The manifest also declares the popup interface and settings page locations.

**background.js**
The background script acts as the extension's central coordinator and GitHub API interface. It maintains persistent state across browser sessions and handles all external API communications. When triggered by the content script, it receives submission data and performs the following operations:
- Authenticates with GitHub using OAuth Device Flow (stores access token in Chrome storage)
- Creates properly formatted commit messages with problem metadata
- Handles file organization within the target repository
- Manages error handling for network failures or API limitations
- Provides user feedback through the extension's popup interface

**content.js**
This is the most complex component, responsible for monitoring CSES pages and detecting successful submissions. The script implements a sophisticated state management system that addresses two critical challenges:

1. **Submission Tracking**: Rather than monitoring all page content for "accepted" text (which would trigger false positives from test case results), the script specifically listens for submit button clicks. It uses sessionStorage to persist the submission state across page navigations, ensuring that only intentional submissions trigger the synchronization process.

2. **Result Detection**: The script employs a custom DOM parsing algorithm that specifically targets the "Result:" table cell that appears 3-4 seconds after submission completion. This approach avoids confusion with test case results that may also display "accepted" status but aren't relevant to the final submission result.

The content script also implements a MutationObserver pattern to handle dynamic content loading, ensuring reliable detection even when results appear asynchronously. It includes safety timeouts to prevent infinite monitoring and cleanup mechanisms to avoid memory leaks.

**popup.html and popup.js**
These files create the extension's user interface, providing a clean and intuitive control panel. Users can view their connection status, monitor recent synchronization activities, and access quick links to their GitHub repository. The popup interface also displays helpful error messages and setup instructions for new users.

**settings.html and settings.js**
The settings page allows users to configure their target repository (owner/name or full URL). Authentication is handled in the popup via OAuth Device Flow, so users do not need to paste any tokens. The settings include basic validation and show the currently configured repository.

## Design Decisions and Technical Challenges

### State Management Strategy
One of the most significant technical challenges was maintaining submission state across page navigations. CSES redirects users from the problem page to a results page after submission, which would normally lose JavaScript state. The solution involved implementing a sessionStorage-based state management system that persists the "submit clicked" flag across page transitions while automatically clearing it after result processing to prevent duplicate submissions.

### Result Detection Accuracy
Initial implementations struggled with false positives from test case results. The final approach uses a sophisticated DOM traversal algorithm that specifically searches for table cells containing "Result:" text and then examines adjacent cells for the actual verdict. This method ensures that only the final submission result triggers synchronization, not intermediate test case outcomes.

### Error Handling and User Experience
The extension implements comprehensive error handling for various failure scenarios including network timeouts, API rate limits, authentication failures, and malformed HTML content. Each error type triggers appropriate user notifications and provides actionable guidance for resolution.

### Performance Optimization
To minimize resource usage, the extension uses targeted DOM monitoring rather than continuous page scanning. MutationObserver instances are created only after submit button clicks and are automatically disposed of after result detection or timeout periods.

## Security and Privacy Considerations

The extension operates with minimal required permissions and stores sensitive data (GitHub tokens) securely in Chrome's encrypted storage system. All GitHub API communications use HTTPS, and the extension never transmits user code to any third-party services other than the user's specified GitHub repository.

This project represents a complete solution for competitive programmers seeking to maintain organized, automated solution portfolios while focusing on problem-solving rather than manual repository management. The extension's intelligent detection algorithms and robust error handling make it a reliable tool for serious competitive programming practice.

