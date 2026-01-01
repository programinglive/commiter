# PRD: Usage Clarification and Automated Testing

## Overview
Prevent users and AI assistants from misusing `@programinglive/commiter` as a generic git commit tool. Guide AI assistants toward the correct tool (@programinglive/dev-workflow-mcp-server) and ensure these safeguards are verified by automated tests.

## Problem
AI assistants sometimes assume `@programinglive/commiter` is for committing files (e.g., `commiter "message"`). This fails because the tool is meant for setup and release orchestration. Automated verification of these safeguards was initially missing.

## Requirements
- Display a warning banner if arguments are passed to `node index.js`.
- Suggest standard `git commit` commands.
- Provide a tip to use the MCP dev-workflow for AI assistants.
- Update release script error messages to include the same tip.
- **[NEW]** Implement automated tests to verify the above behavior across `index.js` and `scripts/release.cjs`.

## Verification
- Automated tests in `test/usage-warning.test.js`.
- Manual verification of CLI output.
