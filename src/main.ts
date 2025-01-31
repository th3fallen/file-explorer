export interface ITreeNode {
    type: 'file' | 'folder';
    name: string;
    modified: Date;
    size?: number;
}

interface IElementProps {
    className?: string;
    textContent?: string;
    style?: string;
}

interface ExplorerState {
    expandedFolders: Set<string>;
    currentPath: string;
    treeView: HTMLElement;
    listView: HTMLElement;
}

// Pure utility functions
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

// DOM manipulation functions
const createElement = (tag: string, props: IElementProps = {}): HTMLElement => {
    const element = document.createElement(tag);
    if (props.className) element.className = props.className;
    if (props.textContent) element.textContent = props.textContent;
    if (props.style) element.setAttribute('style', props.style);
    return element;
};

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

// API functions
const fetchFolderContents = async (path: string): Promise<ITreeNode[]> => {
    const response = await fetch(`/api/files${path}`);
    return response.json();
};

// State management
const createInitialState = (treeView: HTMLElement, listView: HTMLElement): ExplorerState => ({
    expandedFolders: new Set(['/']) as Set<string>,
    currentPath: '/',
    treeView,
    listView
});

// UI update functions
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

const updateListView = (state: ExplorerState, data: ITreeNode[]): void => {
    const fragment = document.createDocumentFragment();

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

const updateTreeView = (
    state: ExplorerState,
    data: ITreeNode[],
    parentElement: HTMLElement = state.treeView,
    level = 0,
    parentPath = ''
): void => {
    if (!parentElement) return;

    const fragment = document.createDocumentFragment();

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

// Event handlers
const removeExpandedFolder = (state: ExplorerState, path: string): void => {
    for (const expandedPath of state.expandedFolders) {
        if (expandedPath === path || expandedPath.startsWith(path + '/')) {
            state.expandedFolders.delete(expandedPath);
        }
    }
};

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

const expandTreeToPath = async (state: ExplorerState, path: string): Promise<void> => {
    const pathParts = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of pathParts) {
        currentPath = buildPath(part, currentPath);
        await toggleFolderExpansion(state, currentPath, true);
    }
};

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

// Initialize
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
