#!/usr/bin/env node
/**
 * Generate Tauri app icons from a source image
 * Usage: node scripts/generate-icons.js [source-image]
 * Default source: data/app.png
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImage = process.argv[2] || 'data/app.png';
const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');

// Check if source exists
if (!fs.existsSync(sourceImage)) {
  console.error(`Error: Source image not found: ${sourceImage}`);
  process.exit(1);
}

console.log(`Generating icons from: ${sourceImage}`);
console.log(`Output directory: ${iconsDir}`);

// Icon sizes needed for Tauri
const pngSizes = [
  { name: '32x32.png', size: 32 },
  { name: '64x64.png', size: 64 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 1024 },
  // Windows Store logos
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

// Check if sips is available (macOS)
const hasSips = process.platform === 'darwin';

if (hasSips) {
  console.log('Using macOS sips for image conversion...\n');
  
  // Generate PNG icons
  for (const icon of pngSizes) {
    const outputPath = path.join(iconsDir, icon.name);
    console.log(`Generating ${icon.name} (${icon.size}x${icon.size})...`);
    try {
      // Copy source first
      fs.copyFileSync(sourceImage, outputPath);
      // Resize using sips
      execSync(`sips -z ${icon.size} ${icon.size} "${outputPath}"`, { stdio: 'pipe' });
      console.log(`  ✓ ${icon.name}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  // Generate ICO file (Windows)
  console.log('\nGenerating icon.ico for Windows...');
  try {
    // Create temp PNGs for ICO
    const icoSizes = [16, 24, 32, 48, 64, 128, 256];
    const tempFiles = [];
    
    for (const size of icoSizes) {
      const tempPath = path.join(iconsDir, `temp_${size}.png`);
      fs.copyFileSync(sourceImage, tempPath);
      execSync(`sips -z ${size} ${size} "${tempPath}"`, { stdio: 'pipe' });
      tempFiles.push(tempPath);
    }
    
    // Use iconutil alternative or just copy the 256 as ico
    // For proper ICO, we'll just note that the user should use tauri icon command
    console.log('  Note: For proper .ico generation, run: npx tauri icon data/app.png');
    
    // Cleanup temp files
    for (const f of tempFiles) {
      fs.unlinkSync(f);
    }
  } catch (err) {
    console.error(`  ✗ ICO generation note: ${err.message}`);
  }

  // Generate ICNS file (macOS)
  console.log('\nGenerating icon.icns for macOS...');
  try {
    const iconsetPath = path.join(iconsDir, 'icon.iconset');
    
    // Create iconset directory
    if (!fs.existsSync(iconsetPath)) {
      fs.mkdirSync(iconsetPath);
    }
    
    // Generate required sizes for iconset
    const icnsSizes = [
      { name: 'icon_16x16.png', size: 16 },
      { name: 'icon_16x16@2x.png', size: 32 },
      { name: 'icon_32x32.png', size: 32 },
      { name: 'icon_32x32@2x.png', size: 64 },
      { name: 'icon_128x128.png', size: 128 },
      { name: 'icon_128x128@2x.png', size: 256 },
      { name: 'icon_256x256.png', size: 256 },
      { name: 'icon_256x256@2x.png', size: 512 },
      { name: 'icon_512x512.png', size: 512 },
      { name: 'icon_512x512@2x.png', size: 1024 },
    ];
    
    for (const icon of icnsSizes) {
      const outputPath = path.join(iconsetPath, icon.name);
      fs.copyFileSync(sourceImage, outputPath);
      execSync(`sips -z ${icon.size} ${icon.size} "${outputPath}"`, { stdio: 'pipe' });
    }
    
    // Convert to icns
    execSync(`iconutil -c icns "${iconsetPath}" -o "${path.join(iconsDir, 'icon.icns')}"`, { stdio: 'pipe' });
    
    // Cleanup iconset
    fs.rmSync(iconsetPath, { recursive: true });
    
    console.log('  ✓ icon.icns');
  } catch (err) {
    console.error(`  ✗ ICNS generation failed: ${err.message}`);
  }

  console.log('\n✅ Icon generation complete!');
  console.log('Note: For Windows .ico file, please run: npx tauri icon data/app.png');
} else {
  console.log('This script requires macOS with sips command.');
  console.log('Please run: npx tauri icon data/app.png');
}
