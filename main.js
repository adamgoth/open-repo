import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Set to true for better security with preload scripts
    },
  });

  // Load the React dev server in development, or the built app in production
  win.loadURL('http://localhost:5173'); // Vite's default port
}

app.whenReady().then(async () => {
  createWindow();

  // Example: Show an open dialog when the app is ready
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      console.log('Selected directory:', result.filePaths[0]);
      // In a real app, you would use this path
    }
  } catch (err) {
    console.error('Failed to show open dialog:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
