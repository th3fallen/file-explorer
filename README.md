# Cribl File System Explorer

A vanilla JavaScript/TypeScript implementation of a file system explorer.

## Features

- Zero dependencies for the frontend (typescript doesn't count :D)
- Directory tree navigation in left sidebar
- File/folder listing in right pane
- Expand/collapse folders in tree view
- Synchronized selection between tree and list views
- REST API backend for folder content retrieval
- Unit tests with Jest

## Assumptions
- While not requested for the frontend challenge, I added a small express api for fetching folder contents.
- I also added a `...` item to the main file view to allow navigation back to the parent directory.
- I didn't use the rotating carrots as picured in the example, instead I used an open and closed folder icon.

## Thoughts
- The API fetching is not ideal, because at the moment it makes 2 requests for each folder one from the sidebar and one from the main view. but for a code challenge it's good enough.
- I kept state management internal to simplify testing but if i had more time i would probably handle the currently viewed folder via the URI so a user could link back to the same folder they were looking at.

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