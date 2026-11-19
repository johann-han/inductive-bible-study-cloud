'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const previewIndex = path.join(root, 'next-preview', 'index.html');
const viteConfig = path.join(root, 'next-app', 'vite.config.ts');

async function start() {
  // Render service previews copy the base service's build command when first
  // created. If that older command did not build the new UI, compile it here.
  // This is deliberately limited to PR previews; production keeps its normal
  // startup path and never performs a frontend build at runtime.
  if (process.env.IS_PULL_REQUEST === 'true' && !fs.existsSync(previewIndex)) {
    console.log('PR preview: frontend build output is missing; building the isolated UI now.');
    const { build } = require('vite');
    await build({ configFile: viteConfig });
    if (!fs.existsSync(previewIndex)) {
      throw new Error('The next-generation preview build completed without producing next-preview/index.html.');
    }
    console.log('PR preview: next-generation frontend is ready.');
  }

  require(path.join(root, 'server.js'));
}

start().catch((error) => {
  console.error('IBS startup failed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
