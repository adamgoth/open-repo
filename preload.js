const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan:directory', dirPath),
  readFileContent: (filePath) =>
    ipcRenderer.invoke('file:readContent', filePath),
});
