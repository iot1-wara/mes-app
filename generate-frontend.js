// ============ Build Script for MES Edge Gateway Frontend ============
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const SRC = path.join(BASE, 'frontend', 'src');

mkdirp(path.join(SRC, 'pages'));
mkdirp(path.join(SRC, 'components'));
mkdirp(path.join(SRC, 'api'));
mkdirp(path.join(SRC, 'hooks'));
mkdirp(path.join(SRC, 'utils'));
mkdirp(path.join(BASE, 'frontend', 'dist'));

// ============ tailwind.css ============
fs.writeFileSync(path.join(SRC, 'tailwind.css'), `/* MES Edge Gateway styles - loaded via CDN in index.html */\n@reference "./tailwind.css";\n`, { flag: 'w' });

console.log('Generated all frontend source files.');
console.log('');
console.log('Build the frontend with: node <frontend>/node_modules/vite/bin/vite.js build');
console.log('Run the backend with: npm run start:prod');

function mkdirp(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
