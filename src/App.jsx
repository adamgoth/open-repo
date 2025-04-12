import React, { useState, useCallback, useMemo } from 'react';
import { Tree } from 'react-arborist';
import path from 'path-browserify'; // Use browser-compatible path module

// Import react-arborist default styles - REMOVED explicit CSS import
// import 'react-arborist/dist/style.css'; // Original path
// import 'react-arborist/dist/react-arborist.css'; // Attempted corrected path

// --- Data Transformation Utility ---
function buildTreeData(fileEntries, basePath) { // Input is now array of { path, size }
  if (!fileEntries || fileEntries.length === 0 || !basePath) return [];

  const root = { id: basePath, name: path.basename(basePath), children: [] };
  const map = { [basePath]: root };

  // Sort entries by path
  const sortedEntries = [...fileEntries].sort((a, b) => a.path.localeCompare(b.path));

  sortedEntries.forEach(entry => {
    const { path: filePath, size } = entry; // Destructure path and size
    const relativePath = path.relative(basePath, filePath);
    const parts = relativePath.split(path.sep);
    let currentLevel = root;
    let currentPath = basePath;

    parts.forEach((part, index) => {
      currentPath = path.join(currentPath, part);
      const isLastPart = index === parts.length - 1;

      if (!map[currentPath]) {
        const newNode = {
          id: currentPath,
          name: part,
          data: {} // Add data object to store metadata
        };
        if (!isLastPart) {
          newNode.children = [];
        } else {
          // If it's the last part, it's a file, store its size
          newNode.data.size = size;
        }

        map[currentPath] = newNode;
        const parentPath = path.dirname(currentPath);
        if (map[parentPath] && map[parentPath].children) {
           map[parentPath].children.push(newNode);
        } else {
           console.warn("Parent not found for", currentPath);
        }
      }
      if (!isLastPart) {
         currentLevel = map[currentPath];
      } else {
         // Ensure size is added even if node already existed (shouldn't happen with sort?)
         if (map[currentPath] && map[currentPath].data) {
             map[currentPath].data.size = size;
         }
      }
    });
  });

  return root.children;
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function App() {
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [treeData, setTreeData] = useState([]); // State for hierarchical tree data
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // State for search term
  const [selectedNodes, setSelectedNodes] = useState([]); // State for selected nodes

  const handleSelectDirectory = async () => {
    try {
      const directoryPath = await window.electronAPI.openDirectory();
      if (directoryPath) {
        setSelectedDirectory(directoryPath);
        setFileList([]);
        setTreeData([]); // Clear previous tree data
        setIsLoading(true);
        console.log('Selected directory from renderer:', directoryPath);
        try {
          const fileEntries = await window.electronAPI.scanDirectory(directoryPath);
          // fileList now stores {path, size} objects
          setFileList(fileEntries);
          console.log('Scanned file entries:', fileEntries);
          // Transform flat list to tree structure
          const newTreeData = buildTreeData(fileEntries, directoryPath);
          setTreeData(newTreeData);
          console.log('Built tree data:', newTreeData);
        } catch (scanError) {
          console.error('Error scanning directory:', scanError);
          // TODO: Show user-friendly error
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      // TODO: Show user-friendly error message
    }
  };

  // Callback for when tree selection changes
  const handleSelect = (nodes) => {
    setSelectedNodes(nodes);
    console.log("Selected Nodes:", nodes.map(node => node.id)); // Log selected IDs
    // TODO: Use selected nodes data later (e.g., for prompt generation)
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Open Repo</h1>
          <button
            onClick={handleSelectDirectory}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Select Project Folder
          </button>
        </div>
        <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          {/* Placeholder for Settings Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      {selectedDirectory && (
        <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
          Selected Path: <span className="font-mono">{selectedDirectory}</span>
        </div>
      )}

      {isLoading && (
        <div className="mb-2 p-2 text-center">
          Loading files...
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow flex flex-col p-4 gap-4">
        {selectedDirectory && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
            Selected Path: <span className="font-mono">{selectedDirectory}</span>
          </div>
        )}
        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
          {/* File Browser Area */}
          <div className="flex-1 flex flex-col border border-gray-300 dark:border-gray-600 rounded p-2 min-w-0">
            {selectedDirectory ? (
              <>
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2 p-1 border rounded bg-white dark:bg-gray-700 text-sm w-full"
                />
                <div className="flex-grow overflow-auto">
                  <Tree
                    initialData={treeData}
                    openByDefault={false} // Start with folders collapsed
                    width="100%" // Use full width of container
                    height={600} // Fixed height initially, adjust as needed
                    indent={24}
                    rowHeight={22}
                    paddingTop={10}
                    paddingBottom={10}
                    searchTerm={searchTerm}
                    onSelect={handleSelect} // Pass the selection handler
                  >
                    {/* Default Node renderer usually includes checkbox when onSelect is provided */}
                  </Tree>
                </div>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">Select a project folder to view files.</span>
              </div>
            )}
          </div>

          {/* Prompt Preview Placeholder */}
          <div className="flex-1 border border-dashed border-gray-400 dark:border-gray-600 rounded p-4 flex flex-col items-start justify-start overflow-auto">
             <h2 className="text-lg font-semibold mb-2 self-center">Preview</h2>
             {selectedNodes.length > 0 ? (
                <div className="text-sm w-full">
                    <p className="mb-2">Selected {selectedNodes.length} item(s):</p>
                    <ul className="list-none p-0">
                        {selectedNodes.map(node => (
                            <li key={node.id} className="flex justify-between items-center text-xs mb-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title={node.id}>
                              <span className="font-mono truncate mr-2">{node.data.name}</span>
                              {/* Display size only if it's a file (has size data) */} 
                              {node.data.size !== undefined && node.data.size !== null && (
                                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatBytes(node.data.size)}</span>
                              )}
                              {/* Indicate folder if no size */} 
                              {(node.data.size === undefined || node.data.size === null) && node.isInternal && (
                                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">Folder</span>
                              )}
                            </li>
                        ))}
                    </ul>
                </div>
             ) : (
                <span className="text-gray-500 dark:text-gray-400 self-center">Select files/folders to preview.</span>
             )}
           </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
        <button
          disabled
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 cursor-not-allowed"
        >
          Copy to Clipboard
        </button>
      </footer>
    </div>
  );
}

export default App;
