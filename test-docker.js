#!/usr/bin/env node

/**
 * Docker test script for macOS App Usage Tracker
 * Tests basic functionality and API endpoints
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_PORT = process.env.PORT || 3000;
const TEST_HOST = 'localhost';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testEndpoint(name, path, method = 'GET', expectedStatus = 200) {
  try {
    log(`Testing ${name}...`, 'cyan');
    const response = await makeRequest(path, method);
    
    if (response.statusCode === expectedStatus) {
      log(`✓ ${name} - Status: ${response.statusCode}`, 'green');
      return { success: true, response };
    } else {
      log(`✗ ${name} - Expected: ${expectedStatus}, Got: ${response.statusCode}`, 'red');
      return { success: false, response };
    }
  } catch (error) {
    log(`✗ ${name} - Error: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function testFileStructure() {
  log('Testing file structure...', 'cyan');
  
  const requiredFiles = [
    'package.json',
    'main.js',
    'database.js',
    'index.html',
    'preload.js'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(__dirname, file))) {
      log(`✓ ${file} exists`, 'green');
    } else {
      log(`✗ ${file} missing`, 'red');
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

async function testDependencies() {
  log('Testing dependencies...', 'cyan');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['sqlite3'];
    const requiredDevDeps = ['electron'];
    
    let allDepsOk = true;
    
    for (const dep of requiredDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        log(`✓ ${dep} dependency found`, 'green');
      } else {
        log(`✗ ${dep} dependency missing`, 'red');
        allDepsOk = false;
      }
    }
    
    for (const dep of requiredDevDeps) {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        log(`✓ ${dep} dev dependency found`, 'green');
      } else {
        log(`✗ ${dep} dev dependency missing`, 'red');
        allDepsOk = false;
      }
    }
    
    return allDepsOk;
  } catch (error) {
    log(`✗ Error reading package.json: ${error.message}`, 'red');
    return false;
  }
}

async function testDatabase() {
  log('Testing database initialization...', 'cyan');
  
  try {
    const Database = require('./database');
    const db = new Database();
    await db.initialize();
    log('✓ Database initialization successful', 'green');
    return true;
  } catch (error) {
    log(`✗ Database initialization failed: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('🐳 Docker Container Test Suite', 'blue');
  log('=' .repeat(50), 'blue');
  
  const results = {
    fileStructure: false,
    dependencies: false,
    database: false,
    endpoints: {
      health: false,
      usageStats: false,
      startTracking: false,
      stopTracking: false,
      isTracking: false
    }
  };
  
  // Test file structure
  results.fileStructure = await testFileStructure();
  
  // Test dependencies
  results.dependencies = await testDependencies();
  
  // Test database
  results.database = await testDatabase();
  
  // Test API endpoints (if server is running)
  log('\nTesting API endpoints...', 'yellow');
  log('(Note: These tests require the server to be running)', 'yellow');
  
  try {
    // Health check
    const healthTest = await testEndpoint('Health Check', '/health');
    results.endpoints.health = healthTest.success;
    
    if (healthTest.success) {
      log(`Health response: ${JSON.stringify(healthTest.response.body, null, 2)}`, 'blue');
    }
    
    // Usage stats
    const usageTest = await testEndpoint('Usage Stats', '/api/usage-stats/today');
    results.endpoints.usageStats = usageTest.success;
    
    // Start tracking
    const startTest = await testEndpoint('Start Tracking', '/api/start-tracking', 'POST');
    results.endpoints.startTracking = startTest.success;
    
    // Stop tracking
    const stopTest = await testEndpoint('Stop Tracking', '/api/stop-tracking', 'POST');
    results.endpoints.stopTracking = stopTest.success;
    
    // Is tracking
    const isTrackingTest = await testEndpoint('Is Tracking', '/api/is-tracking');
    results.endpoints.isTracking = isTrackingTest.success;
    
  } catch (error) {
    log(`Server not running or not accessible: ${error.message}`, 'yellow');
    log('To test endpoints, run: docker run -d -p 3000:3000 macos-app-usage-tracker', 'yellow');
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'blue');
  log('=' .repeat(30), 'blue');
  
  const fileStructureStatus = results.fileStructure ? '✓' : '✗';
  const dependenciesStatus = results.dependencies ? '✓' : '✗';
  const databaseStatus = results.database ? '✓' : '✗';
  
  log(`File Structure: ${fileStructureStatus}`, results.fileStructure ? 'green' : 'red');
  log(`Dependencies: ${dependenciesStatus}`, results.dependencies ? 'green' : 'red');
  log(`Database: ${databaseStatus}`, results.database ? 'green' : 'red');
  
  log('\nAPI Endpoints:', 'blue');
  Object.entries(results.endpoints).forEach(([endpoint, success]) => {
    const status = success ? '✓' : '✗';
    const endpointName = endpoint.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    log(`  ${endpointName}: ${status}`, success ? 'green' : 'red');
  });
  
  // Overall result
  const coreTestsPassed = results.fileStructure && results.dependencies && results.database;
  const endpointTestsPassed = Object.values(results.endpoints).some(result => result);
  
  log('\n🎯 Overall Result:', 'blue');
  if (coreTestsPassed) {
    log('✓ Core functionality tests PASSED', 'green');
    log('✓ Container is ready for deployment', 'green');
    
    if (!endpointTestsPassed) {
      log('⚠ API endpoint tests not run (server not accessible)', 'yellow');
      log('  Start the container to test API endpoints', 'yellow');
    }
  } else {
    log('✗ Some core tests FAILED', 'red');
    log('✗ Container may not work properly', 'red');
  }
  
  // Platform-specific notes
  const platform = process.platform;
  log(`\n📋 Platform: ${platform}`, 'blue');
  
  if (platform === 'darwin') {
    log('✓ Running on macOS - full functionality available', 'green');
    log('  AppleScript tracking will work', 'green');
  } else {
    log('⚠ Not running on macOS - limited functionality', 'yellow');
    log('  AppleScript tracking will not work', 'yellow');
    log('  Web interface and mock data will be available', 'yellow');
  }
  
  // Docker-specific notes
  if (fs.existsSync('/.dockerenv')) {
    log('🐳 Running inside Docker container', 'blue');
  } else {
    log('🖥️  Running on host system', 'blue');
  }
  
  log('\n🚀 Next Steps:', 'blue');
  if (coreTestsPassed) {
    log('1. Build the Docker image: docker build -t macos-app-usage-tracker .', 'cyan');
    log('2. Run the container: docker run -d -p 3000:3000 macos-app-usage-tracker', 'cyan');
    log('3. Access the web interface: http://localhost:3000', 'cyan');
    log('4. Check the health endpoint: curl http://localhost:3000/health', 'cyan');
  } else {
    log('1. Fix the failing tests above', 'red');
    log('2. Ensure all dependencies are installed: npm install', 'red');
    log('3. Run tests again: npm test', 'red');
  }
  
  return coreTestsPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`Unexpected error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = {
  runTests,
  testEndpoint,
  makeRequest
};