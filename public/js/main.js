export class FileExplorer {
    constructor() {
        const treeView = document.getElementById('treeView');
        const listView = document.getElementById('fileList');
        if (!treeView || !listView) {
            throw new Error('Required DOM elements not found');
        }
        this.treeView = treeView;
        this.listView = listView;
        this.currentPath = '/';
        this.expandedFolders = new Set();
        this.init();
    }
    async init() {
        const data = await this.fetchFolderContents('/');
        this.updateTreeView(data);
        this.updateListView(data);
    }
    async fetchFolderContents(path) {
        const response = await fetch(`/api/files${path}`);
        return response.json();
    }
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        if (options.className)
            element.className = options.className;
        if (options.textContent)
            element.textContent = options.textContent;
        if (options.style)
            element.setAttribute('style', options.style);
        return element;
    }
    createListRow(icon, text, modified = '--', size = '--', onClick) {
        const row = this.createElement('tr', { className: 'list-item' });
        const nameCell = this.createElement('td');
        nameCell.append(icon, text);
        row.append(nameCell, this.createElement('td', { textContent: modified }), this.createElement('td', { textContent: size }));
        if (onClick) {
            row.addEventListener('click', onClick);
        }
        return row;
    }
    createFolderIcon(isExpanded = false) {
        const icon = this.createElement('span', { className: 'folder-icon' });
        if (isExpanded)
            icon.classList.add('open');
        return icon;
    }
    createFileIcon() {
        return this.createElement('span', { className: 'file-icon' });
    }
    createIcon(type, isExpanded = false) {
        return type === 'folder' ? this.createFolderIcon(isExpanded) : this.createFileIcon();
    }
    formatSize(size) {
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = size === 0 ? 0 : Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
        return `${(size / Math.pow(1024, index)).toFixed(index ? 1 : 0)}${units[index]}`;
    }
    getParentPath(path) {
        if (path === '/' || !path)
            return '/';
        const parts = path.split('/').filter(Boolean);
        parts.pop();
        return parts.length === 0 ? '/' : '/' + parts.join('/');
    }
    buildPath(name, parentPath) {
        return parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
    }
    async toggleFolderExpansion(path, forceState) {
        // Never toggle root folder
        if (path === '/')
            return;
        const isCurrentlyExpanded = this.expandedFolders.has(path);
        const shouldExpand = forceState !== undefined ? forceState : !isCurrentlyExpanded;
        if (shouldExpand) {
            this.expandedFolders.add(path);
        }
        else {
            this.removeExpandedFolder(path);
        }
        const treeItem = this.treeView.querySelector(`[data-path="${path}"]`);
        if (treeItem) {
            const icon = treeItem.querySelector('.folder-icon');
            const childContainer = treeItem.querySelector('.tree-children');
            treeItem.classList.toggle('open', shouldExpand);
            icon?.classList.toggle('open', shouldExpand);
            if (shouldExpand && childContainer && childContainer.children.length === 0) {
                const children = await this.fetchFolderContents(path);
                this.updateTreeView(children, childContainer, path.split('/').filter(Boolean).length, path);
            }
            else if (!shouldExpand && childContainer) {
                childContainer.innerHTML = '';
            }
        }
        this.updateListViewExpansion();
    }
    removeExpandedFolder(path) {
        for (const expandedPath of this.expandedFolders) {
            if (expandedPath === path || expandedPath.startsWith(path + '/')) {
                this.expandedFolders.delete(expandedPath);
            }
        }
    }
    updateListViewExpansion() {
        this.listView.querySelectorAll('.list-item').forEach(item => {
            const nameCell = item.querySelector('td');
            if (nameCell) {
                const itemPath = this.buildPath(nameCell.textContent || '', this.currentPath);
                const icon = item.querySelector('.folder-icon');
                if (icon) {
                    icon.classList.toggle('open', this.expandedFolders.has(itemPath));
                }
            }
        });
    }
    async handleFolderSelect(path, source) {
        const previousPath = this.currentPath;
        const isSamePath = previousPath === path;
        this.currentPath = path;
        if (source === 'tree' || !isSamePath) {
            const data = await this.fetchFolderContents(path);
            this.updateListView(data);
        }
        if (source === 'list') {
            await this.expandTreeToPath(path);
        }
        if (source === 'tree' || isSamePath) {
            await this.toggleFolderExpansion(path);
        }
        this.updateSelection(path);
    }
    updateSelection(path) {
        this.treeView.querySelectorAll('.tree-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        this.listView.querySelectorAll('.list-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        const treeItem = this.treeView.querySelector(`[data-path="${path}"]`);
        if (treeItem) {
            treeItem.classList.add('selected');
        }
        const fileName = path.split('/').pop();
        this.listView.querySelectorAll('.list-item').forEach(item => {
            const nameCell = item.querySelector('td');
            if (nameCell && nameCell.textContent === fileName) {
                item.classList.add('selected');
            }
        });
    }
    async expandTreeToPath(path) {
        const pathParts = path.split('/').filter(Boolean);
        let currentPath = '';
        for (const part of pathParts) {
            currentPath = this.buildPath(part, currentPath);
            await this.toggleFolderExpansion(currentPath, true);
        }
    }
    updateListView(data) {
        const fragment = document.createDocumentFragment();
        if (this.currentPath !== '/') {
            const parentIcon = this.createFolderIcon();
            const parentRow = this.createListRow(parentIcon, '...', undefined, undefined, () => this.handleFolderSelect(this.getParentPath(this.currentPath), 'list'));
            fragment.appendChild(parentRow);
        }
        data.forEach(item => {
            const icon = this.createIcon(item.type, item.type === 'folder' && this.expandedFolders.has(this.buildPath(item.name, this.currentPath)));
            const row = this.createListRow(icon, item.name, new Date(item.modified).toLocaleString(), item.type === 'file' ? this.formatSize(item.size) : '--', item.type === 'folder' ? () => this.handleFolderSelect(this.buildPath(item.name, this.currentPath), 'list') : undefined);
            fragment.appendChild(row);
        });
        this.listView.innerHTML = '';
        this.listView.appendChild(fragment);
    }
    updateTreeView(data, parentElement = this.treeView, level = 0, parentPath = '') {
        if (!parentElement)
            return;
        const fragment = document.createDocumentFragment();
        if (level === 0) {
            parentElement.innerHTML = '';
            const rootIcon = this.createFolderIcon(true);
            const rootDiv = this.createElement('div', {
                className: 'tree-item root-folder open',
                style: `--level: 0`
            });
            const rootContent = this.createElement('span');
            rootContent.append(rootIcon, this.createElement('span', { textContent: 'Files' }));
            const childContainer = this.createElement('div', { className: 'tree-children' });
            rootDiv.append(rootContent, childContainer);
            rootDiv.dataset.path = '/';
            // Only handle click for navigation, not for collapsing
            rootContent.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleFolderSelect('/', 'tree');
            });
            // Root folder is always expanded
            this.expandedFolders.add('/');
            parentElement.appendChild(rootDiv);
            parentElement = childContainer;
            parentPath = '/';
        }
        data.forEach(item => {
            const itemPath = this.buildPath(item.name, parentPath);
            const div = this.createElement('div', {
                className: 'tree-item',
                style: `--level: ${level + 1}`
            });
            div.dataset.path = itemPath;
            const icon = this.createIcon(item.type);
            const itemContent = this.createElement('span');
            itemContent.append(icon, this.createElement('span', { textContent: item.name }));
            if (item.type === 'folder') {
                const childContainer = this.createElement('div', { className: 'tree-children' });
                div.append(itemContent, childContainer);
                itemContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleFolderSelect(itemPath, 'tree');
                });
            }
            else {
                div.appendChild(itemContent);
            }
            fragment.appendChild(div);
        });
        parentElement.appendChild(fragment);
    }
}
// Initialize the file explorer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FileExplorer();
});
