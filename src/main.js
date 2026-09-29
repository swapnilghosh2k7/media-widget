const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 350,
    height: 120,
    type: 'toolbar',
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false, // Start hidden
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Make it accessible across workspaces
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

const { spawn } = require('child_process');
const psProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', '-']);

// Initialize the native C# keybd_event API in PowerShell to avoid Num Lock bugs associated with WScript.Shell SendKeys
const initCommand = `
$signature = @'
[DllImport("user32.dll")]
public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
'@
try {
    Add-Type -MemberDefinition $signature -Name "Keyboard" -Namespace "Win32" -ErrorAction SilentlyContinue
} catch {}
`;
psProcess.stdin.write(initCommand + '\n');

// Media Controls using Native Windows PowerShell commands (simulates media keys)
ipcMain.on('media-control', (event, action) => {
  let vkCode = 0;
  switch (action) {
    case 'play-pause':
      vkCode = 0xB3; // VK_MEDIA_PLAY_PAUSE
      break;
    case 'next':
      vkCode = 0xB0; // VK_MEDIA_NEXT_TRACK
      break;
    case 'prev':
      vkCode = 0xB1; // VK_MEDIA_PREV_TRACK
      break;
    case 'mute':
      vkCode = 0xAD; // VK_VOLUME_MUTE
      break;
  }
  
  if (vkCode) {
    const psCommand = `[Win32.Keyboard]::keybd_event(${vkCode}, 0, 0, 0); [Win32.Keyboard]::keybd_event(${vkCode}, 0, 2, 0);`;
    psProcess.stdin.write(psCommand + '\n');
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

function getAppPath(relativePath) {
  const base = __dirname.includes('app.asar')
    ? __dirname.replace('app.asar', 'app.asar.unpacked')
    : __dirname;
  return path.join(base, '..', relativePath);
}

const { fork } = require('child_process');
const fs = require('fs');

let mediaServerProcess;

function startMediaServer() {
  const localNodePath = getAppPath('bin/node.exe');
  const nodePath = fs.existsSync(localNodePath)
    ? localNodePath
    : (fs.existsSync('C:\\Program Files\\nodejs\\node.exe') 
       ? 'C:\\Program Files\\nodejs\\node.exe' 
       : 'node');

  const scriptPath = getAppPath('src/media-server.js');

  mediaServerProcess = fork(scriptPath, [], {
    execPath: nodePath,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });

  // Handle IPC messages from background Node.js process
  let hideTimeout = null;
  mediaServerProcess.on('message', (mediaData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-update', mediaData);
      
      console.log('Received status:', mediaData.status, 'Window Visible:', mainWindow.isVisible());
      
      // Auto show/hide logic
      if (mediaData.status === 4 || mediaData.status === 5) {
        // Playing or Paused
        const isSpotify = mediaData.appId && mediaData.appId.toLowerCase().includes('spotify');
        
        if (!mainWindow.isVisible() && isSpotify) {
          mainWindow.showInactive();
        }
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      } else if (mediaData.status === 3 || mediaData.status === 'Stopped') {
        // Stopped (no active sessions)
        // Wait 3 seconds before hiding to prevent flickering when skipping tracks
        if (mainWindow.isVisible() && !hideTimeout) {
          hideTimeout = setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.hide();
            }
            hideTimeout = null;
          }, 3000);
        }
      }
    }
  });

  mediaServerProcess.on('error', (err) => {
    console.error('Failed to start media server:', err);
  });
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  console.log("Electron app is starting...");
  createWindow();
  
  // Start pure Node.js background process to fetch media data without Electron ABI mismatch
  startMediaServer();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (mediaServerProcess) {
    mediaServerProcess.kill();
  }
  if (psProcess) {
    psProcess.kill();
  }
});
