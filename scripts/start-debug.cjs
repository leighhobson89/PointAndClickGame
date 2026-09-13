#!/usr/bin/env node

// Start the local server with the development-only debug and test controls
// enabled. A separate script avoids a cross-platform environment-variable
// dependency in package.json and keeps `npm start` a plain release run.
//
// The tools still need an explicit request from the page, so open
// http://127.0.0.1:<port>/index.html?debug=1 to see the DEBUG panel.

process.env.GAME_DEBUG_TOOLS = '1';

require('../server.js');

console.log('Debug tools enabled. Append ?debug=1 to the page URL to open the DEBUG panel.');
