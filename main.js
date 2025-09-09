const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const runAppleScript = require('run-applescript');
const Database = require('./database');

class AppUsageTracker {
  constructor() {
    this.mainWindow = null;
    this.db = new Database();
    this.currentApp = null;
    this.currentAppStartTime = null;
    this.trackingInterval = null;
    this.isTracking = false;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset',
      show: false
    });

    this.mainWindow.loadFile('index.html');
    
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  async getCurrentApp() {
    try {
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          return frontApp
        end tell
      `;

      const result = await runAppleScript(script);
      return result.trim();
    } catch (error) {
      throw error;
    }
  }

  async trackCurrentApp() {
    try {
      const appName = await this.getCurrentApp();
      const now = new Date();

      if (this.currentApp && this.currentApp !== appName) {
        // Log the previous app usage
        const usageTime = Math.floor((now - this.currentAppStartTime) / 1000);
        if (usageTime > 0) {
          await this.db.logUsage(this.currentApp, usageTime);
          this.sendUsageUpdate();
        }
      }

      if (this.currentApp !== appName) {
        this.currentApp = appName;
        this.currentAppStartTime = now;
        console.log(`Switched to: ${appName}`);
      }
    } catch (error) {
      console.error('Error tracking current app:', error);
    }
  }

  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.trackCurrentApp(); // Initial track
    
    // Track every 5 seconds
    this.trackingInterval = setInterval(() => {
      this.trackCurrentApp();
    }, 5000);
    
    console.log('Started tracking application usage');
  }

  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    // Log final usage for current app
    if (this.currentApp && this.currentAppStartTime) {
      const now = new Date();
      const usageTime = Math.floor((now - this.currentAppStartTime) / 1000);
      if (usageTime > 0) {
        this.db.logUsage(this.currentApp, usageTime);
      }
    }
    
    console.log('Stopped tracking application usage');
  }

  sendUsageUpdate() {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('usage-updated');
    }
  }

  setupIPC() {
    ipcMain.handle('get-usage-stats', async (event, period = 'today') => {
      return await this.db.getUsageStats(period);
    });

    ipcMain.handle('start-tracking', () => {
      this.startTracking();
      return { success: true, message: 'Tracking started' };
    });

    ipcMain.handle('stop-tracking', () => {
      this.stopTracking();
      return { success: true, message: 'Tracking stopped' };
    });

    ipcMain.handle('is-tracking', () => {
      return this.isTracking;
    });

    ipcMain.handle('clear-data', async () => {
      await this.db.clearAllData();
      this.sendUsageUpdate();
      return { success: true, message: 'All data cleared' };
    });
  }

  async initialize() {
    await this.db.initialize();
    this.setupIPC();
    this.createWindow();
  }
}

// App event handlers
const tracker = new AppUsageTracker();

app.whenReady().then(() => {
  tracker.initialize();
});

app.on('window-all-closed', () => {
  tracker.stopTracking();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    tracker.createWindow();
  }
});

app.on('before-quit', () => {
  tracker.stopTracking();
});

// Handle potential permission issues
app.on('ready', () => {
  // Request accessibility permissions on macOS
  if (process.platform === 'darwin') {
    console.log('Note: This app requires accessibility permissions to track active applications.');
    console.log('Go to System Preferences > Security & Privacy > Privacy > Accessibility');
    console.log('And add this application to the allowed list.');
  }
});