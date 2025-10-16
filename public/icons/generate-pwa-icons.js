#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Since we can't use sharp in this environment, we'll create placeholder icons
// and copy the main icon to different sizes

const iconsDir = path.join(__dirname, '../icons');
const mainIcon = path.join(iconsDir, 'icon-1024x1024.png');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy main icon to different sizes (in a real app, you'd use sharp to resize)
const sizes = ['192x192', '512x512', '384x384', '256x256', '128x128', '96x96', '72x72', '64x64', '48x48', '32x32'];

sizes.forEach(size => {
  const targetPath = path.join(iconsDir, `icon-${size}.png`);
  if (fs.existsSync(mainIcon) && !fs.existsSync(targetPath)) {
    fs.copyFileSync(mainIcon, targetPath);
    console.log(`Created icon-${size}.png`);
  }
});

// Create favicon.ico (simplified - just copy 32x32)
const faviconPath = path.join(__dirname, '../favicon.ico');
const icon32Path = path.join(iconsDir, 'icon-32x32.png');
if (fs.existsSync(icon32Path) && !fs.existsSync(faviconPath)) {
  fs.copyFileSync(icon32Path, faviconPath);
  console.log('Created favicon.ico');
}

console.log('PWA icons generation complete!');