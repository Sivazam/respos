import sharp from 'sharp';
import { Utensils } from 'lucide-react';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Get current directory path (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create SVG from Lucide icon
const svg = Utensils.toSvg({
  color: '#15803d', // Green color
  size: 512 // Max size
});

// Ensure icons directory exists
const iconDir = join(__dirname, 'icons');
await fs.mkdir(iconDir, { recursive: true });

// Generate PNG icons for each size
await Promise.all(sizes.map(size => {
  return sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(iconDir, `icon-${size}x${size}.png`))
    .catch(err => console.error(`Error generating ${size}x${size} icon:`, err));
}));