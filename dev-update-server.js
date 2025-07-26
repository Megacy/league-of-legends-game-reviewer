/**
 * Simple local update server for testing electron-updater
 * Run this to test update functionality in development
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const UPDATE_SERVER_URL = `http://localhost:${PORT}`;

// Mock update info
const mockUpdateInfo = {
  version: "1.0.1",
  releaseDate: new Date().toISOString(),
  releaseNotes: "Test update with bug fixes and improvements:\n\n• Fixed timeline offset issue\n• Added auto-updater functionality\n• Improved UI/UX"
};

// Mock latest.yml for macOS
const mockLatestMac = `version: ${mockUpdateInfo.version}
files:
  - url: Movlex-League-Recorder-${mockUpdateInfo.version}-arm64-mac.zip
    sha512: test-sha512-hash
    size: 123456789
path: Movlex-League-Recorder-${mockUpdateInfo.version}-arm64-mac.zip
sha512: test-sha512-hash
releaseDate: '${mockUpdateInfo.releaseDate}'`;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/latest-mac.yml') {
    res.writeHead(200, { 'Content-Type': 'text/yaml' });
    res.end(mockLatestMac);
  } else if (req.url === '/update-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockUpdateInfo));
  } else if (req.url.includes('Movlex-League-Recorder') && req.url.endsWith('.zip')) {
    // Serve a dummy file for testing
    res.writeHead(200, { 'Content-Type': 'application/zip' });
    res.end('dummy-update-file');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🔄 Update server running at ${UPDATE_SERVER_URL}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   • ${UPDATE_SERVER_URL}/latest-mac.yml`);
  console.log(`   • ${UPDATE_SERVER_URL}/update-info`);
  console.log(`\n💡 To test with your app, set update server in electron-main.js:`);
  console.log(`   autoUpdater.setFeedURL('${UPDATE_SERVER_URL}');`);
});

module.exports = { UPDATE_SERVER_URL, mockUpdateInfo };
