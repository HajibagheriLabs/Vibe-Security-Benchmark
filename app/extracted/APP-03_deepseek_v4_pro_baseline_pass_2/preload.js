const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => {
    const validChannels = [
      'dialog:openFile',
      'dialog:saveFile',
      'app:getVersion',
      'app:getInfo',
      'fs:readFile',
      'fs:writeFile',
      'settings:get',
      'settings:set',
      'data:fetch',
      'data:submit'
    ];

    if (!validChannels.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }

    return ipcRenderer.invoke(channel, ...args);
  }
});