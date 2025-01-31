/**
 * @jest-environment jsdom
 */

import { buildPath, getParentPath, formatSize, createFileExplorer } from '../src/main';

describe('File Explorer', () => {
    let explorer: ReturnType<typeof createFileExplorer>;
    let state: ReturnType<typeof createFileExplorer>['state'];
    let treeView: HTMLElement;
    let listView: HTMLElement;

    beforeEach(() => {
        // Set up DOM elements
        document.body.innerHTML = `
            <div id="treeView"></div>
            <div id="fileList"></div>
        `;
        
        // Mock fetch
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve([])
            })
        ) as jest.Mock;

        explorer = createFileExplorer('treeView', 'fileList');
        state = explorer.state;
        
        const treeViewElement = document.getElementById('treeView');
        const listViewElement = document.getElementById('fileList');
        
        if (!treeViewElement || !listViewElement) {
            throw new Error('Required DOM elements not found');
        }

        treeView = treeViewElement;
        listView = listViewElement;
    });

    describe('Pure Functions', () => {
        describe('Path Handling', () => {
            test('buildPath correctly joins paths', () => {
                expect(buildPath('file.txt', '/')).toBe('/file.txt');
                expect(buildPath('folder', '/parent')).toBe('/parent/folder');
                expect(buildPath('deep', '/parent/child')).toBe('/parent/child/deep');
            });

            test('getParentPath returns correct parent directory', () => {
                expect(getParentPath('/')).toBe('/');
                expect(getParentPath('/file.txt')).toBe('/');
                expect(getParentPath('/folder/file.txt')).toBe('/folder');
                expect(getParentPath('/deep/folder/file.txt')).toBe('/deep/folder');
            });

            test('handles edge cases', () => {
                expect(getParentPath('')).toBe('/');
                expect(buildPath('', '/')).toBe('/');
                expect(getParentPath('//')).toBe('/');
            });
        });

        describe('Size Formatting', () => {
            test('formatSize handles different size ranges', () => {
                expect(formatSize(0)).toBe('0B');
                expect(formatSize(500)).toBe('500B');
                expect(formatSize(1024)).toBe('1.0KB');
                expect(formatSize(1024 * 1024)).toBe('1.0MB');
                expect(formatSize(1024 * 1024 * 1024)).toBe('1.0GB');
                expect(formatSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5GB');
            });
        });
    });

    describe('State Management', () => {
        test('initial state is correctly set', () => {
            expect(state.currentPath).toBe('/');
            expect(state.expandedFolders.has('/')).toBe(true);
            expect(state.treeView).toBe(treeView);
            expect(state.listView).toBe(listView);
        });

        test('state is immutable between explorer instances', () => {
            const explorer1 = createFileExplorer('treeView', 'fileList');
            const explorer2 = createFileExplorer('treeView', 'fileList');

            explorer1.state.currentPath = '/test';
            expect(explorer2.state.currentPath).toBe('/');
        });
    });

    describe('DOM Element Creation', () => {
        test('creates tree view with root folder', async () => {
            await explorer.init();
            
            const rootFolder = treeView.querySelector('.root-folder');
            expect(rootFolder).toBeTruthy();
            expect(rootFolder?.classList.contains('open')).toBe(true);
            
            const rootIcon = rootFolder?.querySelector('.folder-icon');
            expect(rootIcon).toBeTruthy();
            expect(rootIcon?.classList.contains('open')).toBe(true);
        });

        test('list view shows parent navigation when not at root', async () => {
            // Mock fetch for a specific path
            (global.fetch as jest.Mock).mockImplementationOnce(() =>
                Promise.resolve({
                    json: () => Promise.resolve([
                        { type: 'file', name: 'test.txt', modified: new Date(), size: 100 }
                    ])
                })
            );

            state.currentPath = '/folder';
            await explorer.init();

            const parentRow = listView.querySelector('.list-item');
            const parentCell = parentRow?.querySelector('td');
            expect(parentCell?.textContent).toContain('...');
        });
    });

    describe('Error Handling', () => {
        test('handles missing DOM elements', () => {
            document.body.innerHTML = '';
            expect(() => createFileExplorer('treeView', 'fileList')).toThrow('Required DOM elements not found');
        });

        test('handles failed API requests', async () => {
            (global.fetch as jest.Mock).mockImplementationOnce(() =>
                Promise.reject(new Error('Network error'))
            );

            const explorer = createFileExplorer('treeView', 'fileList');
            await expect(explorer.init()).rejects.toThrow('Network error');
        });
    });
});
