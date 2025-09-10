#!/usr/bin/env node

/**
 * Docker startup script for macOS App Usage Tracker
 * 
 * Since this application requires macOS-specific features (AppleScript),
 * this script provides helpful information and alternative modes for Docker environments.
 */

const os = require('os');
const path = require('path');
const { exec } = require('child_process');

console.log('🐳 macOS App Usage Tracker - Docker Mode');
console.log('=' .repeat(50));

// Check if running in Docker
const isDocker = process.env.DOCKER_ENV || 
                 process.env.NODE_ENV === 'docker' ||
                 require('fs').existsSync('/.dockerenv');

// Check platform
const platform = os.platform();

console.log(`Platform: ${platform}`);
console.log(`Docker Environment: ${isDocker ? 'Yes' : 'No'}`);
console.log(`Node.js Version: ${process.version}`);

if (platform !== 'darwin') {
  console.log('\n⚠️  WARNING: macOS-specific features not available');
  console.log('This application uses AppleScript to track active applications,');
  console.log('which is only available on macOS.');
  console.log('\nRunning in limited mode...');
  
  // Start in headless mode for demonstration/testing
  startHeadlessMode();
} else if (isDocker) {
  console.log('\n📦 Running in Docker on macOS');
  console.log('Note: GUI applications in Docker require additional setup.');
  
  // Check for X11 forwarding
  if (process.env.DISPLAY) {
    console.log('X11 Display found, attempting to start GUI...');
    startElectronApp();
  } else {
    console.log('No X11 display found, starting headless mode...');
    startHeadlessMode();
  }
} else {
  console.log('\n🚀 Starting normal Electron application...');
  startElectronApp();
}

function startElectronApp() {
  console.log('Starting Electron application...');
  
  // Import and start the main application
  try {
    require('./main.js');
  } catch (error) {
    console.error('Failed to start Electron app:', error.message);
    console.log('Falling back to headless mode...');
    startHeadlessMode();
  }
}

function startHeadlessMode() {
  console.log('\n🌐 Starting web server mode...');
  console.log('The application will be available at: http://localhost:3000');
  
  // Start express server instead
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const Database = require('./database');
  
  const app = express();
  const port = process.env.PORT || 3000;
  
  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.static('.'));
  
  // Initialize database
  const db = new Database();
  db.initialize().then(() => {
    console.log('Database initialized');
  });
  
  // Mock data for demonstration in non-macOS environments
  const mockUsageData = [
    { app_name: 'Visual Studio Code', total_time: 7200, session_count: 12 },
    { app_name: 'Chrome', total_time: 5400, session_count: 8 },
    { app_name: 'Terminal', total_time: 3600, session_count: 15 },
    { app_name: 'Slack', total_time: 2700, session_count: 6 },
    { app_name: 'Spotify', total_time: 1800, session_count: 4 }
  ];
  
  // API routes
  app.get('/api/usage-stats/:period?', async (req, res) => {
    const period = req.params.period || 'today';
    
    try {
      if (os.platform() === 'darwin') {
        // Use real data on macOS
        const stats = await db.getUsageStats(period);
        res.json(stats);
      } else {
        // Use mock data on other platforms
        console.log(`Serving mock data for period: ${period}`);
        res.json(mockUsageData);
      }
    } catch (error) {
      console.error('Error getting usage stats:', error);
      res.status(500).json({ error: 'Failed to get usage stats' });
    }
  });
  
  app.post('/api/start-tracking', (req, res) => {
    if (os.platform() === 'darwin') {
      res.json({ success: true, message: 'Tracking started (macOS mode)' });
    } else {
      res.json({ 
        success: false, 
        message: 'Tracking not available on this platform',
        note: 'AppleScript tracking requires macOS'
      });
    }
  });
  
  app.post('/api/stop-tracking', (req, res) => {
    res.json({ success: true, message: 'Tracking stopped' });
  });
  
  app.get('/api/is-tracking', (req, res) => {
    res.json(os.platform() === 'darwin');
  });
  
  app.post('/api/clear-data', async (req, res) => {
    try {
      await db.clearAllData();
      res.json({ success: true, message: 'Data cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear data' });
    }
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      platform: os.platform(),
      docker: isDocker,
      timestamp: new Date().toISOString()
    });
  });
  
  // Serve the main page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  
  // Start server
  app.listen(port, () => {
    console.log(`\n✅ Server running on http://localhost:${port}`);
    console.log('📊 Usage tracker web interface available');
    
    if (os.platform() !== 'darwin') {
      console.log('\n💡 Note: This is a demonstration mode with mock data');
      console.log('   Real tracking requires macOS and accessibility permissions');
    }
    
    console.log('\n🔗 API Endpoints:');
    console.log(`   GET  /api/usage-stats/:period - Get usage statistics`);
    console.log(`   POST /api/start-tracking      - Start tracking`);
    console.log(`   POST /api/stop-tracking       - Stop tracking`);
    console.log(`   GET  /api/is-tracking         - Check tracking status`);
    console.log(`   POST /api/clear-data          - Clear all data`);
    console.log(`   GET  /health                  - Health check`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });
}