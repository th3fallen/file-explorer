# Cribl File System Explorer

A vanilla JavaScript/TypeScript implementation of a file system explorer.

## Features

- Directory tree navigation in left sidebar
- File/folder listing in right pane
- Expand/collapse folders in tree view
- Synchronized selection between tree and list views
- REST API backend for folder content retrieval
- Unit tests with Jest

## Assumptions
- While not requested for the frontend challenge, I added a small node api for fetching folder contents.
- I also added a `...` item to the main file view to allow navigation back to the parent directory.
- I didn't use the rotating carrots as picured in the example, instead I used an open and closed folder icon.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Run tests:
```bash
npm test
```

## Technical Details

- Built with vanilla JavaScript/TypeScript
- Minimal external dependencies
- Express.js for backend API
- Jest for unit testing