// Build NestJS backend using node directly (avoids npm Execution Policy on Windows)
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MES_DIR = __dirname;
const NODE_MODULES = path.join(MES_DIR, 'node_modules');

// Check if @nestjs/cli exists
const nestBin = path.join(NODE_MODULES, '.bin', 'nest.cmd'); // Windows .cmd instead of .sh
const nestCli = path.join(NODE_MODULES, '@nestjs', 'cli', 'node_modules', '.bin', 'nest.js');

console.log('Building NestJS backend...');

// Use the nest CLI directly via node if available
if (fs.existsSync(nestBin) || fs.existsSync(nestCli)) {
  try {
    if (fs.existsSync(path.join(NODE_MODULES, '.bin', 'nest.cmd'))) {
      execSync('node node_modules/@nestjs/cli/node_modules/.bin/nest.js build', { 
        cwd: MES_DIR, 
        stdio: 'inherit' 
      });
    } else {
      execSync('npm run build --prefix .', { 
        cwd: MES_DIR, 
        env: Object.assign({}, process.env, { NODE_OPTIONS: '--no-warnings' }) 
      });
    }
  } catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
  }
} else {
  // Try with npx equivalent
  execSync('node node_modules/@nestjs/cli/bin/nest.js build', { 
    cwd: MES_DIR, 
    stdio: 'inherit',
    shell: true
  });
}

console.log('Backend built successfully!');
