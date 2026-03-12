const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\Dario\\.gemini\\antigravity\\brain\\069a4321-bd1d-4345-9dea-c69d20e2a6d7\\media__1773282599946.png';
const dest = 'c:\\Users\\Dario\\antigravity\\ejercicios-tl-antigravity\\public\\audchf-estrategia.png';

try {
    fs.copyFileSync(src, dest);
    console.log('File copied successfully');
} catch (err) {
    console.error('Error copying file:', err);
    process.exit(1);
}
