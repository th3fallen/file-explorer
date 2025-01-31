/*
 * File Explorer Implementation
 * 
 * Design Decisions:
 * 1. Functional Approach:
 *    - Chose a functional programming style over class-based for better testability
 *    - Pure functions are easier to test and reason about
 *    - State is managed through a simple state object rather than class properties
 * 
 * 2. State Management:
 *    - Internal state management was chosen for simplicity
 *    - Trade-off: URL-based state would enable shareable links but add complexity
 *    - expandedFolders uses a Set for O(1) lookup performance
 * 
 * 3. DOM Manipulation:
 *    - Direct DOM manipulation used instead of virtual DOM for simplicity
 *    - Trade-off: Less optimal for complex UI updates but simpler implementation
 *    - Separated DOM creation functions for better maintainability
 * 
 * 4. API Integration:
 *    - Simple fetch-based API calls without caching
 *    - Known limitation: Duplicate calls between tree and list views
 *    - Trade-off: Accepted for code challenge scope, would need optimization for production
 * 
 * 5. Event Handling:
 *    - Event delegation not implemented for simplicity
 *    - Trade-off: More event listeners but clearer code structure
 */

// Core interfaces defining the data structures
export interface ITreeNode {
    type: 'file' | 'folder';
    name: string;
    modified: Date;
    size?: number;  // Optional as folders don't have a size
}

// Props interface for creating DOM elements, following a React-like pattern
interface IElementProps {
    className?: string;
    textContent?: string;
    style?: string;
}

// State management interface - kept minimal for simplicity
interface ExplorerState {
    expandedFolders: Set<string>;  // Using Set for O(1) lookup of expanded state
    currentPath: string;           // Current directory path being viewed
    treeView: HTMLElement;         // Reference to tree view DOM element
    listView: HTMLElement;         // Reference to list view DOM element
}

// Pure utility functions - these have no side effects and are easily testable
export const buildPath = (name: string, parentPath: string): string => {
    return parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
};

export const getParentPath = (path: string): string => {
    if (path === '/' || !path) return '/';
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length === 0 ? '/' : '/' + parts.join('/');
};

export const formatSize = (size: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = size === 0 ? 0 : Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    return `${(size / Math.pow(1024, index)).toFixed(index ? 1 : 0)}${units[index]}`;
};

// DOM manipulation functions - separated for better organization and testability
const createElement = (tag: string, props: IElementProps = {}): HTMLElement => {
    const element = document.createElement(tag);
    if (props.className) element.className = props.className;
    if (props.textContent) element.textContent = props.textContent;
    if (props.style) element.setAttribute('style', props.style);
    return element;
};

// Icon creation functions - abstracted for consistency and reusability
const createFolderIcon = (isExpanded = false): HTMLElement => {
    const icon = createElement('span', { className: 'folder-icon' });
    if (isExpanded) icon.classList.add('open');
    return icon;
};

const createFileIcon = (): HTMLElement => {
    return createElement('span', { className: 'file-icon' });
};

const createIcon = (type: 'file' | 'folder', isExpanded = false): HTMLElement => {
    return type === 'folder' ? createFolderIcon(isExpanded) : createFileIcon();
};

// API functions - kept simple for the code challenge
// Note: In a production environment, we'd want to add:
// - Error handling
// - Request caching
// - Request cancellation
// - Loading states
const fetchFolderContents = async (path: string): Promise<ITreeNode[]> => {
    const response = await fetch(`/api/files${path}`);
    return response.json();
};

// State management - simple implementation for the code challenge
// In a larger application, consider:
// - Using a proper state management library
// - Implementing undo/redo functionality
// - Adding persistence
const createInitialState = (treeView: HTMLElement, listView: HTMLElement): ExplorerState => ({
    expandedFolders: new Set(['/']) as Set<string>,
    currentPath: '/',
    treeView,
    listView
});

// UI update functions - handle DOM updates based on state changes
const createListRow = (
    icon: HTMLElement,
    text: string,
    modified?: string,
    size?: string,
    onClick?: () => void
): HTMLElement => {
    const row = createElement('tr', { className: 'list-item' });
    const nameCell = createElement('td');
    nameCell.append(icon, text);
    row.append(
        nameCell,
        createElement('td', { textContent: modified || '--' }),
        createElement('td', { textContent: size || '--' })
    );
    if (onClick) {
        row.addEventListener('click', onClick);
    }
    return row;
};

// List view update - handles both file and folder display
// Note: Could be optimized to only update changed items
const updateListView = (state: ExplorerState, data: ITreeNode[]): void => {
    const fragment = document.createDocumentFragment();

    // Parent directory navigation - improves UX by allowing easy upward navigation
    if (state.currentPath !== '/') {
        const parentIcon = createFolderIcon();
        const parentRow = createListRow(
            parentIcon,
            '...',
            undefined,
            undefined,
            () => handleFolderSelect(state, getParentPath(state.currentPath), 'list')
        );
        fragment.appendChild(parentRow);
    }

    data.forEach(item => {
        const icon = createIcon(
            item.type,
            item.type === 'folder' && state.expandedFolders.has(buildPath(item.name, state.currentPath))
        );

        const row = createListRow(
            icon,
            item.name,
            new Date(item.modified).toLocaleString(),
            item.type === 'file' ? formatSize(item.size || 0) : '--',
            item.type === 'folder'
                ? () => handleFolderSelect(state, buildPath(item.name, state.currentPath), 'list')
                : undefined
        );

        fragment.appendChild(row);
    });

    state.listView.innerHTML = '';
    state.listView.appendChild(fragment);
};

// Tree view update - handles the hierarchical folder structure
// Note: Uses recursion for simplicity, might need optimization for deep structures
const updateTreeView = (
    state: ExplorerState,
    data: ITreeNode[],
    parentElement: HTMLElement = state.treeView,
    level = 0,
    parentPath = ''
): void => {
    if (!parentElement) return;

    const fragment = document.createDocumentFragment();

    // Root folder special case - always visible and expanded
    if (level === 0) {
        parentElement.innerHTML = '';
        const rootIcon = createFolderIcon(true);
        const rootDiv = createElement('div', {
            className: 'tree-item root-folder open',
            style: `--level: 0`
        });

        const rootContent = createElement('span');
        rootContent.append(rootIcon, createElement('span', { textContent: 'Files' }));
        const childContainer = createElement('div', { className: 'tree-children' });
        rootDiv.append(rootContent, childContainer);
        rootDiv.dataset.path = '/';

        rootContent.addEventListener('click', (e) => {
            e.stopPropagation();
            handleFolderSelect(state, '/', 'tree');
        });

        parentElement.appendChild(rootDiv);
        parentElement = childContainer;
        parentPath = '/';
    }

    // Build tree structure recursively
    data.forEach(item => {
        const itemPath = buildPath(item.name, parentPath);
        const div = createElement('div', {
            className: 'tree-item',
            style: `--level: ${level + 1}`
        });
        div.dataset.path = itemPath;

        const icon = createIcon(item.type);
        const itemContent = createElement('span');
        itemContent.append(icon, createElement('span', { textContent: item.name }));

        if (item.type === 'folder') {
            const childContainer = createElement('div', { className: 'tree-children' });
            div.append(itemContent, childContainer);
            itemContent.addEventListener('click', (e) => {
                e.stopPropagation();
                handleFolderSelect(state, itemPath, 'tree');
            });
        } else {
            div.appendChild(itemContent);
        }

        fragment.appendChild(div);
    });

    parentElement.appendChild(fragment);
};

// Updates folder expansion icons in the list view for consistency
const updateListViewExpansion = (state: ExplorerState): void => {
    state.listView.querySelectorAll('.list-item').forEach(item => {
        const nameCell = item.querySelector('td');
        if (nameCell) {
            const itemPath = buildPath(nameCell.textContent || '', state.currentPath);
            const icon = nameCell.querySelector('.folder-icon');
            if (icon) {
                icon.classList.toggle('open', state.expandedFolders.has(itemPath));
            }
        }
    });
};

// Event handlers - manage user interactions
const removeExpandedFolder = (state: ExplorerState, path: string): void => {
    for (const expandedPath of state.expandedFolders) {
        if (expandedPath === path || expandedPath.startsWith(path + '/')) {
            state.expandedFolders.delete(expandedPath);
        }
    }
};

// Handles folder expansion toggling with optional forced state
const toggleFolderExpansion = async (state: ExplorerState, path: string, forceState?: boolean): Promise<void> => {
    if (path === '/') return;

    const isCurrentlyExpanded = state.expandedFolders.has(path);
    const shouldExpand = forceState !== undefined ? forceState : !isCurrentlyExpanded;

    if (shouldExpand) {
        state.expandedFolders.add(path);
    } else {
        removeExpandedFolder(state, path);
    }

    const treeItem = state.treeView.querySelector(`[data-path="${path}"]`);
    if (treeItem) {
        const icon = treeItem.querySelector('.folder-icon');
        const childContainer = treeItem.querySelector('.tree-children') as HTMLElement;

        treeItem.classList.toggle('open', shouldExpand);
        icon?.classList.toggle('open', shouldExpand);

        if (shouldExpand && childContainer && childContainer.children.length === 0) {
            const children = await fetchFolderContents(path);
            updateTreeView(state, children, childContainer, path.split('/').filter(Boolean).length, path);
        } else if (!shouldExpand && childContainer) {
            childContainer.innerHTML = '';
        }
    }

    updateListViewExpansion(state);
};

// Coordinates updates between tree and list views when selecting folders
const handleFolderSelect = async (state: ExplorerState, path: string, source: 'tree' | 'list'): Promise<void> => {
    const previousPath = state.currentPath;
    const isSamePath = previousPath === path;

    state.currentPath = path;

    if (source === 'tree' || !isSamePath) {
        const data = await fetchFolderContents(path);
        updateListView(state, data);
    }

    if (source === 'list') {
        await expandTreeToPath(state, path);
    }

    if (source === 'tree' || isSamePath) {
        await toggleFolderExpansion(state, path);
    }

    updateSelection(state, path);
};

// Helper function to expand tree to show a specific path
const expandTreeToPath = async (state: ExplorerState, path: string): Promise<void> => {
    const pathParts = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of pathParts) {
        currentPath = buildPath(part, currentPath);
        await toggleFolderExpansion(state, currentPath, true);
    }
};

// Updates visual selection state in both views
const updateSelection = (state: ExplorerState, path: string): void => {
    state.treeView.querySelectorAll('.tree-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    state.listView.querySelectorAll('.list-item.selected').forEach(item => {
        item.classList.remove('selected');
    });

    const treeItem = state.treeView.querySelector(`[data-path="${path}"]`);
    if (treeItem) {
        treeItem.classList.add('selected');
    }

    const fileName = path.split('/').pop();
    state.listView.querySelectorAll('.list-item').forEach(item => {
        const nameCell = item.querySelector('td');
        if (nameCell && nameCell.textContent === fileName) {
            item.classList.add('selected');
        }
    });
};

// Main factory function - creates a new file explorer instance
export const createFileExplorer = (treeViewId: string, listViewId: string) => {
    const treeView = document.getElementById(treeViewId);
    const listView = document.getElementById(listViewId);

    if (!treeView || !listView) {
        throw new Error('Required DOM elements not found');
    }

    const state = createInitialState(treeView, listView);

    const init = async () => {
        const data = await fetchFolderContents('/');
        updateTreeView(state, data);
        updateListView(state, data);
    };

    return {
        init,
        state // Exposed for testing purposes
    };
};

// Initialize the file explorer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const explorer = createFileExplorer('treeView', 'fileList');
    explorer.init();
});
