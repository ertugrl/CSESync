# CSESync Privacy Policy

Last updated: 2025-08-23

## Summary
CSESync uploads your Accepted solutions from the CSES Problem Set to your GitHub repository. We collect only what’s necessary to perform this action and do not sell or share data with third parties.

## Data We Collect and Why
- GitHub OAuth access token
  - Purpose: authenticate GitHub API requests to create/update files in your chosen repo
  - Storage: Chrome’s encrypted `chrome.storage.sync` on your device
- GitHub user info (login, id, avatar, name)
  - Purpose: show signed‑in status and select default repository
  - Storage: `chrome.storage.sync`
- Repository settings (owner/name)
  - Purpose: target repository configuration
  - Storage: `chrome.storage.sync`
- Problem metadata and your submitted code
  - Purpose: commit files to your GitHub repository when a submission is Accepted
  - Storage with developer: none. Sent only to GitHub on your behalf

We do not collect browsing history, contacts, precise location, or sensitive categories.

## Data Sharing
- Sent only to GitHub domains: `github.com` and `api.github.com` to perform commits.
- Not shared or sold to third parties beyond this functionality.

## Permissions Used
- `storage`: save authentication and settings locally
- `notifications`: show success/error/auth notices
- Host access: `cses.fi/*` (detect result and extract problem text/code), `github.com/*` (OAuth), `api.github.com/*` (GitHub API)

## Retention and Control
- Data is kept locally until you sign out or uninstall.
- Sign out from the extension to delete token and profile info from `chrome.storage.sync`.
- You can also revoke CSESync’s access in GitHub settings (Applications > Authorized OAuth Apps).

## Children’s Privacy
CSESync is not intended for children under 13 and does not knowingly collect data from them.

## Changes to This Policy
We may update this policy as the extension evolves. Material changes will be reflected on this page with an updated “Last updated” date.

## Contact
For questions or requests, contact: <your-email-here>