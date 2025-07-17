#!/usr/bin/env node

/**
 * Cross-Platform Portability Validation Script
 * Validates that all Nexo Dashboard scripts work correctly across platforms
 * Part of Phase 0.6: Portability & Path Resolution
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

class PortabilityValidator {
    constructor() {
        this.platform = os.platform();
        this.projectRoot = this.findProjectRoot();
        this.results = {
            platform: this.platform,
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        
        console.log(`\n🔍 Nexo Dashboard Portability Validation`);
        console.log(`Platform: ${this.platform}`);
        console.log(`Project Root: ${this.projectRoot}`);
        console.log(`=`.repeat(50));
    }

    findProjectRoot() {
        // Check environment variable first
        if (process.env.NEXO_DASHBOARD_PATH) {
            return process.env.NEXO_DASHBOARD_PATH;
        }

        // Search upward from current directory
        let currentDir = path.dirname(__dirname); // Start from parent of scripts dir
        while (currentDir !== path.dirname(currentDir)) {
            if (fs.existsSync(path.join(currentDir, 'package.json')) ||
                fs.existsSync(path.join(currentDir, 'ROADMAP.md'))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }

        // Fallback to parent directory
        return path.dirname(__dirname);
    }

    async addTest(name, status, details = '', warning = false) {
        const test = {
            name,
            status,
            details,
            warning,
            timestamp: new Date().toISOString()
        };

        this.results.tests.push(test);
        
        if (status === 'PASS') {
            this.results.summary.passed++;
            console.log(`✅ ${name}`);
        } else if (status === 'FAIL') {
            this.results.summary.failed++;
            console.log(`❌ ${name}`);
            if (details) console.log(`   ${details}`);
        } else if (status === 'WARN') {
            this.results.summary.warnings++;
            console.log(`⚠️  ${name}`);
            if (details) console.log(`   ${details}`);
        }
    }

    async testPathResolver() {
        console.log(`\n📁 Testing PathResolver...`);
        
        try {
            const PathResolver = require('../utils/path-resolver.js');
            const resolver = PathResolver.getInstance();
            
            // Test basic path resolution
            const paths = ['root', 'data', 'assets', 'logs', 'icons', 'backup'];
            for (const pathType of paths) {
                const resolvedPath = resolver.getPath(pathType);
                if (resolvedPath && path.isAbsolute(resolvedPath)) {
                    await this.addTest(`PathResolver.getPath('${pathType}')`, 'PASS');
                } else {
                    await this.addTest(`PathResolver.getPath('${pathType}')`, 'FAIL', 
                        `Expected absolute path, got: ${resolvedPath}`);
                }
            }

            // Test directory creation
            const testPaths = Object.values(resolver.paths);
            for (const testPath of testPaths) {
                try {
                    await fsPromises.access(testPath);
                    await this.addTest(`Directory exists: ${path.basename(testPath)}`, 'PASS');
                } catch (error) {
                    await this.addTest(`Directory exists: ${path.basename(testPath)}`, 'FAIL', 
                        `Directory not found: ${testPath}`);
                }
            }

            // Test file path methods
            const testFile = resolver.getDataFile('test.json');
            if (testFile.includes('data') && testFile.endsWith('test.json')) {
                await this.addTest('PathResolver.getDataFile()', 'PASS');
            } else {
                await this.addTest('PathResolver.getDataFile()', 'FAIL', 
                    `Unexpected path format: ${testFile}`);
            }

        } catch (error) {
            await this.addTest('PathResolver Import', 'FAIL', error.message);
        }
    }

    async testConfigFile() {
        console.log(`\n⚙️  Testing config.json...`);
        
        const configPath = path.join(this.projectRoot, 'config.json');
        try {
            await fsPromises.access(configPath);
            await this.addTest('config.json exists', 'PASS');
            
            const configContent = await fsPromises.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            
            const requiredKeys = ['dataPath', 'assetsPath', 'logsPath', 'iconsPath', 'backupPath'];
            for (const key of requiredKeys) {
                if (config[key]) {
                    await this.addTest(`config.json has ${key}`, 'PASS');
                } else {
                    await this.addTest(`config.json has ${key}`, 'FAIL', `Missing key: ${key}`);
                }
            }

            if (config.platform && config.platform[this.platform]) {
                await this.addTest('Platform-specific config present', 'PASS');
            } else {
                await this.addTest('Platform-specific config present', 'WARN', 
                    `No platform config for ${this.platform}`);
            }

        } catch (error) {
            await this.addTest('config.json validation', 'FAIL', error.message);
        }
    }

    async testScriptCompatibility() {
        console.log(`\n🔧 Testing script compatibility...`);
        
        const scriptsDir = path.join(this.projectRoot, 'scripts');
        
        // Test PowerShell script (Windows only)
        const psScript = path.join(scriptsDir, 'scan_startmenu.ps1');
        try {
            await fsPromises.access(psScript);
            await this.addTest('scan_startmenu.ps1 exists', 'PASS');
            
            const psContent = await fsPromises.readFile(psScript, 'utf-8');
            if (psContent.includes('path-helper.ps1')) {
                await this.addTest('scan_startmenu.ps1 uses path-helper', 'PASS');
            } else {
                await this.addTest('scan_startmenu.ps1 uses path-helper', 'FAIL', 
                    'Script does not import path-helper.ps1');
            }

            if (psContent.includes('C:\\GitHub\\Nexo_Dashboard')) {
                await this.addTest('scan_startmenu.ps1 has no hardcoded paths', 'FAIL', 
                    'Found hardcoded path: C:\\GitHub\\Nexo_Dashboard');
            } else {
                await this.addTest('scan_startmenu.ps1 has no hardcoded paths', 'PASS');
            }

        } catch (error) {
            await this.addTest('scan_startmenu.ps1 validation', 'FAIL', error.message);
        }

        // Test Python scripts
        const pythonScripts = ['extract_icons.py', 'extract_bookmarks.py'];
        for (const script of pythonScripts) {
            const scriptPath = path.join(scriptsDir, script);
            try {
                await fsPromises.access(scriptPath);
                await this.addTest(`${script} exists`, 'PASS');
                
                const content = await fsPromises.readFile(scriptPath, 'utf-8');
                if (content.includes('from path_resolver import PathResolver')) {
                    await this.addTest(`${script} uses PathResolver`, 'PASS');
                } else {
                    await this.addTest(`${script} uses PathResolver`, 'FAIL', 
                        'Script does not import PathResolver');
                }

                if (content.includes('C:/GitHub/Nexo_Dashboard') || 
                    content.includes('C:\\GitHub\\Nexo_Dashboard')) {
                    await this.addTest(`${script} has no hardcoded paths`, 'FAIL', 
                        'Found hardcoded path references');
                } else {
                    await this.addTest(`${script} has no hardcoded paths`, 'PASS');
                }

            } catch (error) {
                await this.addTest(`${script} validation`, 'FAIL', error.message);
            }
        }

        // Test JavaScript scripts
        const jsScript = path.join(scriptsDir, 'backup_system.js');
        try {
            await fsPromises.access(jsScript);
            await this.addTest('backup_system.js exists', 'PASS');
            
            const jsContent = await fsPromises.readFile(jsScript, 'utf-8');
            if (jsContent.includes('path-resolver.js')) {
                await this.addTest('backup_system.js uses PathResolver', 'PASS');
            } else {
                await this.addTest('backup_system.js uses PathResolver', 'FAIL', 
                    'Script does not import PathResolver');
            }

            if (jsContent.includes("path.join('C:', 'GitHub', 'Nexo_Dashboard')")) {
                await this.addTest('backup_system.js has no hardcoded paths', 'FAIL', 
                    'Found hardcoded path construction');
            } else {
                await this.addTest('backup_system.js has no hardcoded paths', 'PASS');
            }

        } catch (error) {
            await this.addTest('backup_system.js validation', 'FAIL', error.message);
        }
    }

    async testEnvironmentVariables() {
        console.log(`\n🌍 Testing environment variables...`);
        
        if (process.env.NEXO_DASHBOARD_PATH) {
            await this.addTest('NEXO_DASHBOARD_PATH set', 'PASS', 
                `Value: ${process.env.NEXO_DASHBOARD_PATH}`);
        } else {
            await this.addTest('NEXO_DASHBOARD_PATH set', 'WARN', 
                'Environment variable not set, using auto-detection');
        }

        // Test that path resolver works without env var
        delete process.env.NEXO_DASHBOARD_PATH;
        try {
            const PathResolver = require('../utils/path-resolver.js');
            const resolver = new PathResolver();
            const root = resolver.getPath('root');
            if (root) {
                await this.addTest('Auto-detection fallback works', 'PASS');
            } else {
                await this.addTest('Auto-detection fallback works', 'FAIL', 
                    'Failed to auto-detect project root');
            }
        } catch (error) {
            await this.addTest('Auto-detection fallback works', 'FAIL', error.message);
        }
    }

    async testPlatformSpecificFeatures() {
        console.log(`\n🖥️  Testing platform-specific features...`);
        
        if (this.platform === 'win32') {
            await this.addTest('Platform is Windows', 'PASS', 'All features should work');
            
            // Test PowerShell availability
            try {
                execSync('powershell -Command "Get-Host"', { stdio: 'ignore' });
                await this.addTest('PowerShell available', 'PASS');
            } catch (error) {
                await this.addTest('PowerShell available', 'FAIL', 
                    'PowerShell not found or not working');
            }
        } else {
            await this.addTest('Platform is non-Windows', 'WARN', 
                'Some features may be limited (PowerShell, win32 APIs)');
        }

        if (this.platform === 'linux') {
            await this.addTest('Platform is Linux', 'PASS', 'Basic features should work');
        }

        if (this.platform === 'darwin') {
            await this.addTest('Platform is macOS', 'PASS', 'Basic features should work');
        }
    }

    async generateReport() {
        console.log(`\n📊 Validation Summary`);
        console.log(`=`.repeat(30));
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
        
        const total = this.results.summary.passed + this.results.summary.failed + this.results.summary.warnings;
        const successRate = total > 0 ? (this.results.summary.passed / total * 100).toFixed(1) : 0;
        console.log(`📈 Success Rate: ${successRate}%`);

        // Save detailed report
        const reportPath = path.join(this.projectRoot, '0_Electron_Docs_Reference', 'Dev_Logs', 
            `nexo_portability_validation_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        
        try {
            await fsPromises.mkdir(path.dirname(reportPath), { recursive: true });
            await fsPromises.writeFile(reportPath, JSON.stringify(this.results, null, 2));
            console.log(`\n📄 Report saved to: ${reportPath}`);
        } catch (error) {
            console.error(`Failed to save report: ${error.message}`);
        }

        // Return overall status
        if (this.results.summary.failed > 0) {
            console.log(`\n🔴 VALIDATION FAILED - ${this.results.summary.failed} critical issues found`);
            return false;
        } else if (this.results.summary.warnings > 0) {
            console.log(`\n🟡 VALIDATION PASSED WITH WARNINGS - ${this.results.summary.warnings} warnings`);
            return true;
        } else {
            console.log(`\n🟢 VALIDATION PASSED - All tests successful`);
            return true;
        }
    }

    async runValidation() {
        try {
            await this.testPathResolver();
            await this.testConfigFile();
            await this.testScriptCompatibility();
            await this.testEnvironmentVariables();
            await this.testPlatformSpecificFeatures();
            
            return await this.generateReport();
        } catch (error) {
            console.error(`\n❌ Validation failed with error: ${error.message}`);
            return false;
        }
    }
}

// Run validation if script is executed directly
if (require.main === module) {
    const validator = new PortabilityValidator();
    validator.runValidation().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = PortabilityValidator;