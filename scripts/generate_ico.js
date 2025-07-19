#!/usr/bin/env node

const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

/**
 * Generate proper ICO file for Windows installer
 */

const INPUT_SVG = path.join(__dirname, '../assets/icon.svg');
const OUTPUT_ICO = path.join(__dirname, '../assets/icon.ico');

async function generateProperIco() {
    console.log('🪟 Generating proper ICO file for Windows...');
    
    try {
        // Generate multiple PNG sizes for ICO
        const sizes = [16, 24, 32, 48, 64, 96, 128, 256];
        const pngs = [];
        
        for (const size of sizes) {
            console.log(`   📏 Creating ${size}x${size} PNG...`);
            const buffer = await sharp(INPUT_SVG)
                .resize(size, size, { 
                    kernel: sharp.kernel.lanczos3,
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer();
            pngs.push(buffer);
        }
        
        console.log('   🔄 Converting to ICO format...');
        const ico = await toIco(pngs);
        
        console.log('   💾 Writing ICO file...');
        fs.writeFileSync(OUTPUT_ICO, ico);
        
        const stats = fs.statSync(OUTPUT_ICO);
        const sizeKB = Math.round(stats.size / 1024);
        
        console.log(`   ✅ ICO file generated: icon.ico (${sizeKB} KB)`);
        console.log('   🎉 ICO generation completed successfully!');
        
    } catch (error) {
        console.error('❌ Error generating ICO:', error.message);
        process.exit(1);
    }
}

// Run ICO generation
if (require.main === module) {
    generateProperIco();
}

module.exports = { generateProperIco };