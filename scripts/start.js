'use strict';

const path = require('node:path');

const root = path.resolve(__dirname, '..');
const previewIndex = path.join(root, 'next-preview', 'index.html');
const viteConfig = path.join(root, 'next-app', 'vite.config.ts');

async function start() {
  // Render pull-request previews can inherit an older base-service build
  // command and may already contain a stale next-preview/index.html. Checking
  // only whether the file exists can therefore leave an older UI in place.
  // Always build from the checked-out PR source before serving a PR preview.
  // This is deliberately limited to PR previews; production keeps its normal
  // startup path and never performs a frontend build at runtime.
  if (process.env.IS_PULL_REQUEST === 'true') {
    console.log('PR preview: building the next-generation UI from the current pull-request source.');
    const { build } = require('vite');
    await build({ configFile: viteConfig });
    if (!require('node:fs').existsSync(previewIndex)) {
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
