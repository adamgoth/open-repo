import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import url from 'url'; // Add url import
import fs from 'fs/promises'; // Import Node.js fs promises API
import ignore from 'ignore'; // Import the ignore package

// Calculate __dirname equivalent for ES modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- main.js started ---');
console.log('__dirname:', __dirname);
// Remove the problematic early logging of potentially undefined globals
// console.log('process.env:', JSON.stringify(process.env, null, 2)); // Optional: Keep or remove process.env log as needed
// console.log('MAIN_WINDOW_VITE_DEV_SERVER_URL:', typeof MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_DEV_SERVER_URL);
// console.log('MAIN_WINDOW_VITE_NAME:', typeof MAIN_WINDOW_VITE_NAME, MAIN_WINDOW_VITE_NAME);

const DEFAULT_IGNORES = ['.git', 'node_modules/**'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Recursive function to scan directory, now with filtering and size
async function scanDirectoryRecursive(dirPath, basePath, ig, allFiles = []) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      // Use Buffer.from() to handle potential non-UTF8 characters in paths
      const relativePath = path.relative(
        basePath,
        Buffer.from(fullPath).toString(),
      );

      // Check if the path should be ignored
      // Add a check for directory paths as well to prevent recursing into ignored dirs
      const isDirectory = entry.isDirectory();
      if (ig.ignores(isDirectory ? relativePath + '/' : relativePath)) {
        continue; // Skip ignored files/directories
      }

      if (isDirectory) {
        await scanDirectoryRecursive(fullPath, basePath, ig, allFiles);
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath);
          allFiles.push({ path: fullPath, size: stats.size }); // Push object with path and size
        } catch (statError) {
          console.warn(
            `Could not get stats for file ${fullPath}: ${statError.message}`,
          );
          // Optionally push file with size 0 or null if stat fails
          allFiles.push({ path: fullPath, size: null });
        }
      }
    }
  } catch (error) {
    // Ignore errors like permission denied for specific subdirectories
    console.warn(`Could not read directory ${dirPath}: ${error.message}`);
  }
  return allFiles;
}

// Handle the scan directory request - now sets up ignore rules
async function handleScanDirectory(event, dirPath) {
  if (!dirPath) {
    return [];
  }
  console.log(`Scanning directory requested: ${dirPath}`);

  const ig = ignore();
  ig.add(DEFAULT_IGNORES); // Add default ignore patterns

  // Try reading .gitignore
  try {
    const gitignoreContent = await fs.readFile(
      path.join(dirPath, '.gitignore'),
      'utf8',
    );
    ig.add(gitignoreContent);
    console.log('Loaded .gitignore rules.');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not read .gitignore:', error.message);
    }
    // If .gitignore doesn't exist, just continue
  }

  // Try reading repo_ignore (custom)
  try {
    const repoIgnoreContent = await fs.readFile(
      path.join(dirPath, 'repo_ignore'),
      'utf8',
    );
    ig.add(repoIgnoreContent);
    console.log('Loaded repo_ignore rules.');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not read repo_ignore:', error.message);
    }
    // If repo_ignore doesn't exist, just continue
  }

  try {
    // Start scanning, passing the base path and ignore instance
    const files = await scanDirectoryRecursive(dirPath, dirPath, ig);
    console.log(
      `Found ${files.length} file entries (with size) after filtering.`,
    );
    return files;
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return [];
  }
}

// IPC handler to read file content
async function handleReadFileContent(event, filePath) {
  console.log(`Received request to read file: ${filePath}`);
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      console.warn(`File too large: ${filePath} (${stats.size} bytes)`);
      // Return a specific structure for large files
      return { error: 'FileTooLarge', size: stats.size, path: filePath };
    }
    if (!stats.isFile()) {
      console.warn(`Not a file: ${filePath}`);
      return { error: 'NotAFile', path: filePath };
    }

    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`Successfully read file: ${filePath}`);
    return { content: content, path: filePath }; // Return content successfully
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    if (error.code === 'ENOENT') {
      return { error: 'NotFound', message: error.message, path: filePath };
    } else if (error.code === 'EACCES') {
      return {
        error: 'PermissionDenied',
        message: error.message,
        path: filePath,
      };
    } else {
      return { error: 'ReadError', message: error.message, path: filePath };
    }
  }
}

function createWindow() {
  console.log('--- createWindow called ---');
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // __dirname is the path to the current executing script (main.js)
      // path.join connects it with the path to preload.js
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Keep false for security
      contextIsolation: true, // Set to true for secure IPC
    },
  });

  // Load the Vite dev server URL in development or the production file path
  if (!app.isPackaged) {
    // Development mode (running with electron-forge start)
    console.log('Loading DEV URL: http://localhost:5173');
    win.loadURL('http://localhost:5173'); // Default Vite port
    // Optional: Open DevTools automatically in development
    // win.webContents.openDevTools();
  } else {
    // Production mode (running from packaged app)
    const indexPath = path.join(
      __dirname,
      '../renderer/main_window/index.html',
    );
    console.log(`Loading PROD file: ${indexPath}`);
    win.loadFile(indexPath);
  }
}

// Handle the dialog open request from the renderer process
async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!canceled && filePaths.length > 0) {
    return filePaths[0]; // Return the selected path
  }
  return null; // Return null if canceled or no path selected
}

app.whenReady().then(async () => {
  // Set up IPC handlers
  ipcMain.handle('dialog:openDirectory', handleFileOpen);
  ipcMain.handle('scan:directory', handleScanDirectory);
  ipcMain.handle('file:readContent', handleReadFileContent); // Add the new handler

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
