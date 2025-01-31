const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// API endpoint to get directory contents
app.get('/api/files/*', async (req, res) => {
    try {
        const requestedPath = req.params[0] || '';
        const fullPath = path.join(__dirname, requestedPath);
        
        // Ensure the path is within our project directory
        if (!fullPath.startsWith(__dirname)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const stats = await fs.stat(fullPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Not a directory' });
        }

        const contents = await fs.readdir(fullPath);
        const items = await Promise.all(
            contents.map(async (name) => {
                const itemPath = path.join(fullPath, name);
                const itemStats = await fs.stat(itemPath);
                return {
                    type: itemStats.isDirectory() ? 'folder' : 'file',
                    name: name,
                    modified: itemStats.mtime,
                    size: itemStats.size,
                    children: itemStats.isDirectory() ? [] : undefined
                };
            })
        );

        res.json(items);
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
