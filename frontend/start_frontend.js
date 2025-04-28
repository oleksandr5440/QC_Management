// Simple frontend server starter
const { exec } = require('child_process');
const path = require('path');

// Start React development server
console.log('Starting React development server...');
const frontendProcess = exec('npm start', {
  cwd: path.resolve(__dirname),
  env: { ...process.env, PORT: 3000, BROWSER: 'none' }
});

frontendProcess.stdout.on('data', (data) => {
  console.log(`Frontend: ${data}`);
});

frontendProcess.stderr.on('data', (data) => {
  console.error(`Frontend Error: ${data}`);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  frontendProcess.kill('SIGINT');
  process.exit(0);
});