'use strict';
const path = require('path');
const spawn = require('child_process').spawn;

if (process.argv.length >= 3) {
    const dir = path.dirname(process.argv[1]);
    const filename = path.basename(process.argv[2], '.js') + '.js';
    const script = path.join(dir, filename);
    spawn(process.argv[0], [script].concat(process.argv.slice(3)), { stdio: 'inherit' });
} else {
    console.log('Which app?');
}
