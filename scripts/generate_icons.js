#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Generate icons for Windows installer and cross-platform distribution
 * Converts SVG to ICO, PNG, and ICNS formats
 */

const INPUT_SVG = path.join(__dirname, '../assets/icon.svg');
const ASSETS_DIR = path.join(__dirname, '../assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function generateIcons() {
    console.log('🎨 Generating application icons...');
    
    try {
        // Check if input SVG exists
        if (!fs.existsSync(INPUT_SVG)) {
            throw new Error(`Input SVG not found: ${INPUT_SVG}`);
        }

        // Generate PNG icons for different sizes
        const pngSizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];
        
        console.log('📱 Generating PNG icons...');
        for (const size of pngSizes) {
            const outputPath = path.join(ASSETS_DIR, `icon-${size}x${size}.png`);
            await sharp(INPUT_SVG)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            console.log(`   ✅ Created ${size}x${size} PNG`);
        }

        // Generate main icon.png (256x256 for Linux)
        console.log('🐧 Generating main PNG icon for Linux...');
        await sharp(INPUT_SVG)
            .resize(256, 256)
            .png()
            .toFile(path.join(ASSETS_DIR, 'icon.png'));
        console.log('   ✅ Created icon.png');

        // Generate proper ICO file for Windows
        console.log('🪟 Generating proper ICO icon for Windows...');
        const { generateProperIco } = require('./generate_ico.js');
        await generateProperIco();
        console.log('   ✅ Created proper ICO file');

        // Generate ICNS for macOS (will need additional conversion)
        console.log('🍎 Generating ICNS icon for macOS...');
        await sharp(INPUT_SVG)
            .resize(512, 512)
            .png()
            .toFile(path.join(ASSETS_DIR, 'icon.icns'));
        console.log('   ✅ Created icon.icns (PNG format - will be converted by electron-builder)');

        console.log('\n🎉 Icon generation completed successfully!');
        console.log('\nGenerated files:');
        
        const files = fs.readdirSync(ASSETS_DIR)
            .filter(file => file.startsWith('icon'))
            .sort();
        
        files.forEach(file => {
            const filePath = path.join(ASSETS_DIR, file);
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`   📄 ${file} (${sizeKB} KB)`);
        });

    } catch (error) {
        console.error('❌ Error generating icons:', error.message);
        process.exit(1);
    }
}

// Run icon generation
if (require.main === module) {
    generateIcons();
}

module.exports = { generateIcons };