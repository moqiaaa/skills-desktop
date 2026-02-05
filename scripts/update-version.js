#!/usr/bin/env node
/**
 * Update version across all project files
 * Usage: node scripts/update-version.js <version>
 * Example: node scripts/update-version.js 1.4.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Get version from command line
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node scripts/update-version.js <version>');
  console.error('Example: node scripts/update-version.js 1.4.0');
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Error: Invalid version format. Use semver format: X.Y.Z');
  process.exit(1);
}

console.log(`\n📦 Updating version to ${newVersion}\n`);

// Files to update
const updates = [
  {
    file: 'package.json',
    pattern: /"version":\s*"[^"]*"/,
    replacement: `"version": "${newVersion}"`,
  },
  {
    file: 'src-tauri/tauri.conf.json',
    pattern: /"version":\s*"[^"]*"/,
    replacement: `"version": "${newVersion}"`,
  },
  {
    file: 'src-tauri/Cargo.toml',
    pattern: /^version\s*=\s*"[^"]*"/m,
    replacement: `version = "${newVersion}"`,
  },
  {
    file: 'src/pages/Settings.tsx',
    pattern: /<span className="font-mono font-semibold">v[^<]*<\/span>/,
    replacement: `<span className="font-mono font-semibold">v${newVersion}</span>`,
  },
  {
    file: 'src-tauri/src/lib.rs',
    pattern: /\.header\("User-Agent",\s*"SkillsDesktop\/[^"]*"\)/,
    replacement: `.header("User-Agent", "SkillsDesktop/${newVersion}")`,
  },
];

let successCount = 0;
let failCount = 0;

for (const update of updates) {
  const filePath = path.join(rootDir, update.file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  ${update.file} - File not found, skipping`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    if (update.pattern.test(content)) {
      content = content.replace(update.pattern, update.replacement);
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ ${update.file}`);
        successCount++;
      } else {
        console.log(`  ⏭️  ${update.file} - Already at version ${newVersion}`);
      }
    } else {
      console.log(`  ⚠️  ${update.file} - Pattern not found`);
      failCount++;
    }
  } catch (err) {
    console.error(`  ❌ ${update.file} - Error: ${err.message}`);
    failCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${successCount} files`);
if (failCount > 0) {
  console.log(`   Failed: ${failCount} files`);
}

console.log(`\n🔍 Current versions:\n`);

// Verify and display current versions
const versionChecks = [
  { file: 'package.json', pattern: /"version":\s*"([^"]*)"/ },
  { file: 'src-tauri/tauri.conf.json', pattern: /"version":\s*"([^"]*)"/ },
  { file: 'src-tauri/Cargo.toml', pattern: /^version\s*=\s*"([^"]*)"/m },
  { file: 'src/pages/Settings.tsx', pattern: />v([^<]*)<\/span>/ },
  { file: 'src-tauri/src/lib.rs', pattern: /SkillsDesktop\/([^"]*)"/ },
];

for (const check of versionChecks) {
  const filePath = path.join(rootDir, check.file);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(check.pattern);
      if (match) {
        const version = match[1];
        const status = version === newVersion ? '✅' : '⚠️';
        console.log(`   ${status} ${check.file}: ${version}`);
      }
    }
  } catch (err) {
    // Ignore errors
  }
}

console.log('\n✨ Done!\n');
