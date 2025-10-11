#!/usr/bin/env node

/**
 * Feature Manager Script
 * Helps manage feature toggles in the codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURE_TOGGLES_FILE = path.join(__dirname, '..', 'FEATURE_TOGGLES.md');
const SRC_DIR = path.join(__dirname, '..', 'src');

class FeatureManager {
  constructor() {
    this.disabledFeatures = [];
    this.loadDisabledFeatures();
  }

  loadDisabledFeatures() {
    try {
      const content = fs.readFileSync(FEATURE_TOGGLES_FILE, 'utf8');
      // Parse the markdown to extract disabled features
      const lines = content.split('\n');
      let inDisabledSection = false;
      
      for (const line of lines) {
        if (line.includes('## Currently Disabled Features')) {
          inDisabledSection = true;
          continue;
        }
        if (line.startsWith('##') && inDisabledSection) {
          break;
        }
        if (inDisabledSection && line.startsWith('### ')) {
          const featureName = line.replace('### ', '').trim();
          if (featureName !== 'None') {
            this.disabledFeatures.push(featureName);
          }
        }
      }
    } catch (error) {
      console.error('Error loading feature toggles:', error.message);
    }
  }

  findDisabledFeatures() {
    const results = [];
    
    const searchDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          searchDir(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (line.includes('FEATURE_DISABLED:')) {
              const match = line.match(/FEATURE_DISABLED:\s*([^-]+)/);
              if (match) {
                results.push({
                  feature: match[1].trim(),
                  file: path.relative(process.cwd(), filePath),
                  line: index + 1,
                  content: line.trim()
                });
              }
            }
          });
        }
      }
    };
    
    searchDir(SRC_DIR);
    return results;
  }

  listDisabledFeatures() {
    console.log('\n🔍 Searching for disabled features in codebase...\n');
    
    const features = this.findDisabledFeatures();
    
    if (features.length === 0) {
      console.log('✅ No disabled features found in the codebase.');
      return;
    }
    
    console.log(`Found ${features.length} disabled feature(s):\n`);
    
    features.forEach((feature, index) => {
      console.log(`${index + 1}. ${feature.feature}`);
      console.log(`   📁 File: ${feature.file}:${feature.line}`);
      console.log(`   💬 Comment: ${feature.content}`);
      console.log('');
    });
  }

  generateFeatureReport() {
    const features = this.findDisabledFeatures();
    const report = {
      timestamp: new Date().toISOString(),
      totalDisabled: features.length,
      features: features.map(f => ({
        name: f.feature,
        location: `${f.file}:${f.line}`,
        comment: f.content
      }))
    };
    
    const reportPath = path.join(__dirname, '..', 'feature-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Feature report generated: ${reportPath}`);
    return report;
  }

  validateFeatureToggles() {
    console.log('\n🔍 Validating feature toggles...\n');
    
    const codebaseFeatures = this.findDisabledFeatures();
    const documentedFeatures = this.disabledFeatures;
    
    // Check for undocumented disabled features
    const undocumented = codebaseFeatures.filter(cf => 
      !documentedFeatures.some(df => df.includes(cf.feature))
    );
    
    // Check for documented but not found features
    const notFound = documentedFeatures.filter(df => 
      !codebaseFeatures.some(cf => df.includes(cf.feature))
    );
    
    if (undocumented.length > 0) {
      console.log('⚠️  Undocumented disabled features:');
      undocumented.forEach(f => console.log(`   - ${f.feature} (${f.file}:${f.line})`));
      console.log('');
    }
    
    if (notFound.length > 0) {
      console.log('⚠️  Documented but not found in code:');
      notFound.forEach(f => console.log(`   - ${f}`));
      console.log('');
    }
    
    if (undocumented.length === 0 && notFound.length === 0) {
      console.log('✅ All feature toggles are properly documented and synchronized.');
    }
  }
}

// CLI Interface
const command = process.argv[2];
const manager = new FeatureManager();

switch (command) {
  case 'list':
    manager.listDisabledFeatures();
    break;
  case 'report':
    manager.generateFeatureReport();
    break;
  case 'validate':
    manager.validateFeatureToggles();
    break;
  case 'help':
  default:
    console.log(`
Feature Manager - Manage disabled features in the codebase

Usage:
  node scripts/feature-manager.js <command>

Commands:
  list      List all disabled features found in the codebase
  report    Generate a JSON report of disabled features
  validate  Check if documented features match codebase
  help      Show this help message

Examples:
  node scripts/feature-manager.js list
  node scripts/feature-manager.js validate
`);
    break;
}