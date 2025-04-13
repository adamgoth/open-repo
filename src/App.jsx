import React, { useState, useCallback, useMemo } from 'react';
import { Tree } from 'react-arborist';
import path from 'path-browserify'; // Use browser-compatible path module
import { Toaster, toast } from 'react-hot-toast'; // Import Toaster and toast
import { createPrompt } from './services/prompt'; // Import the prompt service


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

  // Return an array containing the root node itself
  return [root]; 
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

  // --- New state for Prompt Generation ---
  const [instruction, setInstruction] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [promptErrors, setPromptErrors] = useState([]); // Array to hold errors {path, error, message}
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  // --- Placeholder Templates ---
  // TODO: Load from config/local storage later
  const promptTemplates = useMemo(() => [
    { value: '', label: 'Select a template...' },
    { value: 'Refactor this code for clarity and efficiency.', label: 'Refactor Code' },
    { value: 'Add comments to explain this code.', label: 'Add Comments' },
    { value: 'Identify potential bugs in this code.', label: 'Identify Bugs' },
    { value: 'Write unit tests for the selected files.', label: 'Write Unit Tests' },
  ], []);

  const handleSelectDirectory = async () => {
    try {
      const directoryPath = await window.electronAPI.openDirectory();
      if (directoryPath) {
        setSelectedDirectory(directoryPath);
        setFileList([]);
        setTreeData([]);
        setSelectedNodes([]); // Reset selected nodes
        setGeneratedPrompt(''); // Reset prompt
        setPromptErrors([]); // Reset errors
        setInstruction(''); // Reset instruction
        setSelectedTemplate(''); // Reset template
        setIsLoading(true);
        console.log('Selected directory from renderer:', directoryPath);
        try {
          const fileEntries = await window.electronAPI.scanDirectory(directoryPath);
          setFileList(fileEntries);
          console.log('Scanned file entries:', fileEntries);
          const newTreeData = buildTreeData(fileEntries, directoryPath);
          console.log('Output of buildTreeData:', JSON.stringify(newTreeData, null, 2));
          setTreeData(newTreeData);
          console.log('Built tree data state updated.'); // Changed log message slightly
        } catch (scanError) {
          console.error('Error scanning directory:', scanError);
          setPromptErrors([{ path: 'N/A', error: 'ScanError', message: 'Failed to scan directory.' }]);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      setPromptErrors([{ path: 'N/A', error: 'SelectDirError', message: 'Failed to open directory dialog.' }]);
    }
  };

  const handleSelect = (nodes) => {
    setSelectedNodes(nodes);
    // Clear previous prompt when selection changes
    setGeneratedPrompt('');
    setPromptErrors([]);
    console.log("Selected Nodes:", nodes.map(node => node.id));
  };

  // --- Helper function to recursively get all file IDs from a node ---
  const getAllFileIds = (node) => {
    let fileIds = [];
    if (!node.isInternal) {
      // It's a file
      fileIds.push(node.id);
    } else if (node.children) {
      // It's a folder, process its children
      node.children.forEach(child => {
        fileIds = fileIds.concat(getAllFileIds(child));
      });
    }
    return fileIds;
  };

  // --- Helper function to recursively get all descendant nodes (files and folders) ---
  const getAllDescendantNodes = (node) => {
    let nodes = [node]; // Start with the node itself
    // Check if the node is internal (a folder) and has children loaded
    // Note: react-arborist might lazy-load children. Ensure children are available.
    // If children might not be loaded, this needs adjustment or rely on tree props.
    if (node.isInternal && node.children) {
      node.children.forEach(child => {
        // Recursively get descendants for each child
        nodes = nodes.concat(getAllDescendantNodes(child));
      });
    }
    return nodes;
  };

  // --- Handlers for Prompt Generation ---
  const handleInstructionChange = (e) => {
    setInstruction(e.target.value);
    setSelectedTemplate(''); // Clear template if custom instruction is typed
    setGeneratedPrompt(''); // Clear prompt when instruction changes
    setPromptErrors([]);
  };

  const handleTemplateChange = (e) => {
    const templateValue = e.target.value;
    setSelectedTemplate(templateValue);
    setInstruction(templateValue); // Set instruction from template
    setGeneratedPrompt(''); // Clear prompt when template changes
    setPromptErrors([]);
  };

  const handleGeneratePrompt = async () => {
    // --- Updated logic to include files from selected folders --- 
    let filesToInclude = [];
    selectedNodes.forEach(node => {
        filesToInclude = filesToInclude.concat(getAllFileIds(node));
    });
    
    // Remove duplicates that might occur if a file and its parent folder are both selected
    const uniqueFilesToInclude = [...new Set(filesToInclude)];

    if (uniqueFilesToInclude.length === 0) {
      toast.error('Please select at least one file or a folder containing files.');
      return;
    }
    // --- End of updated logic ---

    setIsLoadingPrompt(true);
    setGeneratedPrompt('');
    setPromptErrors([]);

    try {
      // Pass the unique list to the service
      const result = await createPrompt(uniqueFilesToInclude, instruction, selectedDirectory);
      setGeneratedPrompt(result.formattedPrompt);
      setPromptErrors(result.errors);
      if (result.errors.length > 0) {
        toast.error(`Generated prompt with ${result.errors.length} error(s). Check error list.`);
      } else {
        toast.success('Prompt generated successfully!');
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast.error('An unexpected error occurred while generating the prompt.');
      setPromptErrors([{ path: 'N/A', error: 'GenerationError', message: error.message }]);
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedPrompt) {
      toast.error('Nothing to copy. Generate a prompt first.');
      return;
    }
    navigator.clipboard.writeText(generatedPrompt)
      .then(() => {
        toast.success('Prompt copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy prompt to clipboard.');
      });
  };

  // --- Render Logic ---
  // Derive initial open state for the root node
  const initialOpenState = useMemo(() => {
    if (selectedDirectory) {
      // The key should be the ID of the root node, which is the directory path
      return { [selectedDirectory]: true };
    }
    return {};
  }, [selectedDirectory]);

  const selectedFiles = useMemo(() => selectedNodes.filter(node => !node.isInternal), [selectedNodes]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Toaster position="top-right" /> {/* Add Toaster component */}
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
                  className="mb-2 p-1 border rounded bg-white dark:bg-gray-700 text-sm w-full flex-shrink-0"
                />
                <div className="flex-grow overflow-auto min-h-0">
                  <Tree
                    key={selectedDirectory} // Force re-mount when directory changes
                    data={treeData}
                    initialOpenState={initialOpenState} // Set initial open state
                    openByDefault={false} // Keep this false, initialOpenState handles the root
                    width="100%" // Use full width of container
                    height={600} // Fixed height initially, adjust as needed
                    indent={24}
                    rowHeight={22}
                    paddingTop={10}
                    paddingBottom={10}
                    searchTerm={searchTerm}
                    disableMultiSelection={false}
                  >
                    {({ node, style, dragHandle }) => (
                      <div
                        style={style} // Apply calculated styles
                        ref={dragHandle} // Attach drag handle
                        className={`flex items-center text-sm ${node.state.isSelected ? 'bg-blue-100 dark:bg-blue-800' : ''} hover:bg-gray-100 dark:hover:bg-gray-700 pr-2 cursor-pointer`}
                      >
                        {/* Checkbox for Selection */}
                        <input
                          type="checkbox"
                          checked={selectedNodes.some(selNode => selNode.id === node.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            const currentlySelected = selectedNodes.some(selNode => selNode.id === node.id);
                            let newSelectedNodes;

                            if (node.isInternal) {
                              // It's a directory
                              const descendants = getAllDescendantNodes(node); // Get node and all descendants
                              const descendantIds = new Set(descendants.map(n => n.id));

                              if (currentlySelected) {
                                // Unchecking a directory: Remove itself and all descendants
                                newSelectedNodes = selectedNodes.filter(selNode => !descendantIds.has(selNode.id));
                              } else {
                                // Checking a directory: Add itself and all descendants (avoid duplicates)
                                const currentSelectedIds = new Set(selectedNodes.map(n => n.id));
                                const nodesToAdd = descendants.filter(d => !currentSelectedIds.has(d.id));
                                newSelectedNodes = [...selectedNodes, ...nodesToAdd];
                              }
                            } else {
                              // It's a file
                              if (currentlySelected) {
                                // Unchecking a file
                                newSelectedNodes = selectedNodes.filter(selNode => selNode.id !== node.id);
                              } else {
                                // Checking a file
                                newSelectedNodes = [...selectedNodes, node];
                              }
                            }
                            setSelectedNodes(newSelectedNodes);
                          }}
                          className="mr-2 cursor-pointer"
                        />
                        {/* Indentation and Toggle Arrow for Folders */}
                        {node.isInternal && (
                          <span
                            className="px-1 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); node.toggle(); }} // Toggle only on arrow click
                          >
                            {node.isOpen ? '▼' : '▶'}
                          </span>
                        )}
                        {/* File/Folder Icon */}
                        <span className="mr-1" onClick={(e) => { e.stopPropagation(); node.isInternal ? node.toggle() : node.selectMulti(e); /* Select file on icon click */ }}>
                          {node.isInternal ? '📁' : '📄'}
                        </span>
                        {/* Node Name - Allow clicking name to select/toggle */}
                        <span onClick={(e) => { e.stopPropagation(); node.isInternal ? node.toggle() : node.selectMulti(e); }}>{node.data.name}</span>
                        {/* Optional: Size Display (can be added back if needed) */}
                        {/* {node.data.size !== undefined && node.data.size !== null && (
                            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{formatBytes(node.data.size)}</span>
                        )} */}
                      </div>
                    )}
                  </Tree>
                </div>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">Select a project folder to view files.</span>
              </div>
            )}
          </div>

          {/* --- Right Pane: Prompt Gen + Selected Files + Copy --- */}
          <div className="flex-1 flex flex-col border border-gray-300 dark:border-gray-600 rounded p-4 gap-4 overflow-hidden">

            {/* --- Top Section: Prompt Generation Controls & Preview --- */}
            <div className="flex flex-col gap-3 border-b border-gray-300 dark:border-gray-600 pb-4 mb-4">
              <h2 className="text-lg font-semibold self-center">Prompt Generation</h2>

              {/* Instruction Input */} 
              <div className="flex flex-col gap-1">
                <label htmlFor="instruction-input" className="text-sm font-medium">Instruction:</label>
                <textarea
                  id="instruction-input"
                  rows={2} // Reduced rows slightly
                  placeholder="Enter instruction or select template..."
                  value={instruction}
                  onChange={handleInstructionChange}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm"
                />
              </div>

              {/* Template Selector */} 
              <div className="flex flex-col gap-1">
                {/* <label htmlFor="template-select" className="text-sm font-medium">Template:</label> */}
                <select
                  id="template-select"
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm"
                  aria-label="Select Prompt Template"
                >
                  {promptTemplates.map(template => (
                    <option key={template.value} value={template.value}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Button */} 
              <button
                onClick={handleGeneratePrompt}
                disabled={isLoadingPrompt || selectedNodes.length === 0}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:text-gray-800 disabled:cursor-not-allowed self-start text-sm dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
              >
                {isLoadingPrompt ? 'Generating...' : 'Generate Prompt'}
              </button>

              {/* Prompt Preview & Errors (conditionally rendered) */} 
              {(isLoadingPrompt || generatedPrompt || promptErrors.length > 0) && (
                 <div className="mt-2 flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded bg-gray-50 dark:bg-gray-800">
                   <h3 className="text-md font-semibold self-center">Preview</h3>
                   {isLoadingPrompt && <p className="text-center text-sm">Loading prompt...</p>}
                   {promptErrors.length > 0 && (
                      <div className="p-2 border border-red-400 bg-red-50 dark:bg-red-900/30 rounded">
                        <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 text-xs">Errors ({promptErrors.length}):</h4>
                        <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400">
                          {promptErrors.map((err, index) => (
                            <li key={index} title={`Error: ${err.error}, Msg: ${err.message}`}>
                              <span className="font-mono">{err.path}</span>: {err.error} {err.message ? `(${err.message.split('\n')[0]})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                   {generatedPrompt && !isLoadingPrompt && (
                      <pre className="flex-1 text-xs whitespace-pre-wrap break-words">
                        {generatedPrompt}
                      </pre>
                    )}
                 </div>
               )}
            </div>

            {/* --- Middle Section: Selected Files List (like image) --- */}
            <div className="flex-grow flex flex-col gap-2 overflow-auto">
               <h3 className="text-md font-semibold mb-1">Selected Files ({selectedNodes.length})</h3>
               {selectedNodes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {[...selectedNodes]
                       .sort((a, b) => a.id.localeCompare(b.id)) // Sort nodes by path
                       .map(node => {
                          // Basic card styling - adjust as needed
                          return (
                            <div
                              key={node.id}
                              className="flex flex-col p-2 border rounded bg-gray-50 dark:bg-gray-800 min-w-[150px] max-w-[200px] text-xs shadow-sm"
                              title={node.id}
                            >
                              <span className="font-semibold truncate mb-1">{node.isInternal ? '📁' : '📄'} {node.data.name}</span>
                              {node.data.size !== undefined && node.data.size !== null ? (
                                <span className="text-gray-500 dark:text-gray-400">{formatBytes(node.data.size)}</span>
                              ) : node.isInternal ? (
                                <span className="text-gray-500 dark:text-gray-400 italic">Folder</span>
                              ) : (
                                 <span className="text-gray-500 dark:text-gray-400 italic">Size N/A</span>
                              )}
                            </div>
                          );
                        })}
                </div>
               ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center mt-4">No files selected.</p>
               )}
            </div>

             {/* --- Bottom Section: Copy Button (like image) --- */}
            <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-600 flex justify-start">
               <button
                  onClick={handleCopyToClipboard}
                  disabled={!generatedPrompt || isLoadingPrompt}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                 </svg>
                  Copy Prompt
                </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
