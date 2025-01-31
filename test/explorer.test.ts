/**
 * @jest-environment jsdom
 */

import { FileExplorer, type ITreeNode } from '../src/main';

describe('FileExplorer', () => {
    let explorer: FileExplorer;
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

        explorer = new FileExplorer();
        
        const treeViewElement = document.getElementById('treeView');
        const listViewElement = document.getElementById('fileList');
        
        if (!treeViewElement || !listViewElement) {
            throw new Error('Required DOM elements not found');
        }

        treeView = treeViewElement;
        listView = listViewElement;
    });

    /**
     * Since I went with a class with private methods, I had to access those methods via array accessors
     * to bypass the private modifier. Had I thought about that before I went with a class, I would have
     * probably avoided the class based approach. ¯\_(ツ)_/¯ Live and learn.
     * 
     * Given more time I would test for additional edge cases, such as null or undefined paths, empty paths, etc.
     */

    describe('Path Handling', () => {
        test('buildPath correctly joins paths', () => {
            expect(explorer['buildPath']('file.txt', '/')).toBe('/file.txt');
            expect(explorer['buildPath']('folder', '/parent')).toBe('/parent/folder');
            expect(explorer['buildPath']('deep', '/parent/child')).toBe('/parent/child/deep');
        });

        test('getParentPath returns correct parent directory', () => {
            expect(explorer['getParentPath']('/')).toBe('/');
            expect(explorer['getParentPath']('/file.txt')).toBe('/');
            expect(explorer['getParentPath']('/folder/file.txt')).toBe('/folder');
            expect(explorer['getParentPath']('/deep/folder/file.txt')).toBe('/deep/folder');
        });
    });

    describe('Size Formatting', () => {
        test('formatSize handles different size ranges', () => {
            expect(explorer['formatSize'](0)).toBe('0B');
            expect(explorer['formatSize'](500)).toBe('500B');
            expect(explorer['formatSize'](1024)).toBe('1.0KB');
            expect(explorer['formatSize'](1024 * 1024)).toBe('1.0MB');
            expect(explorer['formatSize'](1024 * 1024 * 1024)).toBe('1.0GB');
            expect(explorer['formatSize'](1024 * 1024 * 1024 * 2.5)).toBe('2.5GB');
        });
    });

    describe('Folder State Management', () => {
        test('toggleFolderExpansion updates expanded folders set', async () => {
            await explorer['toggleFolderExpansion']('/folder');
            expect(explorer['expandedFolders'].has('/folder')).toBe(true);

            await explorer['toggleFolderExpansion']('/folder');
            expect(explorer['expandedFolders'].has('/folder')).toBe(false);
        });

        test('removeExpandedFolder removes parent and all children', () => {
            // Add some folders to expanded set
            explorer['expandedFolders'].add('/parent');
            explorer['expandedFolders'].add('/parent/child1');
            explorer['expandedFolders'].add('/parent/child2');
            explorer['expandedFolders'].add('/other');

            explorer['removeExpandedFolder']('/parent');

            expect(explorer['expandedFolders'].has('/parent')).toBe(false);
            expect(explorer['expandedFolders'].has('/parent/child1')).toBe(false);
            expect(explorer['expandedFolders'].has('/parent/child2')).toBe(false);
            expect(explorer['expandedFolders'].has('/other')).toBe(true);
        });
    });

    describe('DOM Element Creation', () => {
        test('createElement creates element with correct properties', () => {
            const div = explorer['createElement']('div', {
                className: 'test-class',
                textContent: 'Test Content',
                style: 'color: red'
            });

            expect(div.tagName).toBe('DIV');
            expect(div.className).toBe('test-class');
            expect(div.textContent).toBe('Test Content');
            expect(div.getAttribute('style')).toBe('color: red');
        });

        test('createIcon returns correct icon type', () => {
            const folderIcon = explorer['createIcon']('folder');
            const fileIcon = explorer['createIcon']('file');

            expect(folderIcon.className).toBe('folder-icon');
            expect(fileIcon.className).toBe('file-icon');
        });
    });
});
