/**
 * Simplified UI Components Test
 * Tests core functionality without DOM dependencies
 */

const path = require('path');
const HybridDataManager = require('../data-management/HybridDataManager');

class SimpleUITester {
    constructor() {
        this.dataManager = new HybridDataManager({
            dataPath: '/tmp/nexo-ui-simple-test'
        });
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runTests() {
        console.log('🧪 Starting Simple UI Components Tests...\n');

        try {
            // Initialize data manager
            await this.dataManager.initialize();

            // Test 1: Component Module Loading
            console.log('Test 1: Component Module Loading');
            await this.testModuleLoading();
            this.testResults.passed++;
            console.log('✅ Module loading test passed\n');

            // Test 2: Data Integration
            console.log('Test 2: Data Integration');
            await this.testDataIntegration();
            this.testResults.passed++;
            console.log('✅ Data integration test passed\n');

            // Test 3: Core Functionality
            console.log('Test 3: Core Functionality');
            await this.testCoreFunctionality();
            this.testResults.passed++;
            console.log('✅ Core functionality test passed\n');

            // Test 4: Component Architecture
            console.log('Test 4: Component Architecture');
            await this.testComponentArchitecture();
            this.testResults.passed++;
            console.log('✅ Component architecture test passed\n');

            // Test 5: Integration Points
            console.log('Test 5: Integration Points');
            await this.testIntegrationPoints();
            this.testResults.passed++;
            console.log('✅ Integration points test passed\n');

        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push(error.message);
            console.error('❌ Test failed:', error.message);
        }

        console.log('🏁 Simple UI Components Test Results:');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🔍 Errors:');
            this.testResults.errors.forEach(error => console.log(`  - ${error}`));
        }

        return this.testResults;
    }

    async testModuleLoading() {
        // Test that all modules can be loaded
        const modules = [
            './VisualFeedback',
            './CategoryManager',
            './TagManager',
            './DragDropHandler',
            './UserPreferences',
            './CustomizationPanel',
            './index'
        ];

        for (const module of modules) {
            try {
                const Component = require(module);
                if (typeof Component !== 'function' && typeof Component !== 'object') {
                    throw new Error(`Module ${module} did not export a valid component`);
                }
            } catch (error) {
                throw new Error(`Failed to load module ${module}: ${error.message}`);
            }
        }

        // Test index module exports
        const componentIndex = require('./index');
        const expectedComponents = [
            'CategoryManager',
            'TagManager', 
            'DragDropHandler',
            'VisualFeedback',
            'UserPreferences',
            'CustomizationPanel'
        ];

        for (const component of expectedComponents) {
            if (!componentIndex[component]) {
                throw new Error(`Component ${component} not exported from index`);
            }
        }
    }

    async testDataIntegration() {
        // Test data structure compatibility
        const testData = {
            apps: [
                {
                    id: 'test-app-1',
                    core: {
                        name: 'Test App',
                        path: '/path/to/app',
                        type: 'application'
                    },
                    metadata: {
                        merged: {
                            category: 'Test Category',
                            tags: ['test', 'app']
                        }
                    }
                }
            ],
            bookmarks: [
                {
                    id: 'test-bookmark-1',
                    core: {
                        name: 'Test Bookmark',
                        url: 'https://example.com',
                        type: 'bookmark'
                    },
                    metadata: {
                        merged: {
                            category: 'Test Category',
                            tags: ['test', 'bookmark']
                        }
                    }
                }
            ]
        };

        // Add test data
        await this.dataManager.addRawData('apps', testData.apps);
        await this.dataManager.addRawData('bookmarks', testData.bookmarks);

        // Verify data was stored correctly
        const stats = await this.dataManager.getStats();
        if (stats.raw.apps !== 1 || stats.raw.bookmarks !== 1) {
            throw new Error('Data integration failed - incorrect item counts');
        }

        // Test merge functionality
        const mergeResult = await this.dataManager.performMerge();
        if (!mergeResult.success) {
            throw new Error('Data integration failed - merge operation failed');
        }
    }

    async testCoreFunctionality() {
        // Test core component functions without DOM
        const VisualFeedback = require('./VisualFeedback');
        const CategoryManager = require('./CategoryManager');
        const TagManager = require('./TagManager');
        const UserPreferences = require('./UserPreferences');

        // Test VisualFeedback constructor
        const feedback = new VisualFeedback();
        if (typeof feedback.showSuccess !== 'function') {
            throw new Error('VisualFeedback missing showSuccess method');
        }

        // Test CategoryManager constructor
        const categoryManager = new CategoryManager(this.dataManager, feedback);
        if (typeof categoryManager.addCategory !== 'function') {
            throw new Error('CategoryManager missing addCategory method');
        }

        // Test TagManager constructor
        const tagManager = new TagManager(this.dataManager, feedback);
        if (typeof tagManager.addTag !== 'function') {
            throw new Error('TagManager missing addTag method');
        }

        // Test UserPreferences constructor
        const userPreferences = new UserPreferences(this.dataManager, feedback);
        if (typeof userPreferences.get !== 'function') {
            throw new Error('UserPreferences missing get method');
        }

        // Test method signatures
        const methods = {
            feedback: ['showSuccess', 'showError', 'showWarning', 'showInfo', 'showProgress', 'showLoading'],
            categoryManager: ['addCategory', 'updateCategory', 'deleteCategory', 'getCategories'],
            tagManager: ['addTag', 'updateTag', 'deleteTag', 'getTags'],
            userPreferences: ['get', 'set', 'getAll', 'isReady']
        };

        const components = { feedback, categoryManager, tagManager, userPreferences };

        for (const [componentName, methodList] of Object.entries(methods)) {
            const component = components[componentName];
            for (const method of methodList) {
                if (typeof component[method] !== 'function') {
                    throw new Error(`${componentName} missing ${method} method`);
                }
            }
        }
    }

    async testComponentArchitecture() {
        // Test component architecture and dependencies
        const ComponentClasses = require('./index');
        
        // Test that components can be instantiated
        const feedback = new ComponentClasses.VisualFeedback();
        const categoryManager = new ComponentClasses.CategoryManager(this.dataManager, feedback);
        const tagManager = new ComponentClasses.TagManager(this.dataManager, feedback);
        const userPreferences = new ComponentClasses.UserPreferences(this.dataManager, feedback);

        // Test component properties
        if (!categoryManager.dataManager) {
            throw new Error('CategoryManager missing dataManager dependency');
        }
        if (!categoryManager.feedback) {
            throw new Error('CategoryManager missing feedback dependency');
        }

        if (!tagManager.dataManager) {
            throw new Error('TagManager missing dataManager dependency');
        }
        if (!tagManager.feedback) {
            throw new Error('TagManager missing feedback dependency');
        }

        if (!userPreferences.dataManager) {
            throw new Error('UserPreferences missing dataManager dependency');
        }
        if (!userPreferences.feedback) {
            throw new Error('UserPreferences missing feedback dependency');
        }

        // Test component state initialization
        if (categoryManager.isInitialized !== false) {
            throw new Error('CategoryManager should start uninitialized');
        }
        if (tagManager.isInitialized !== false) {
            throw new Error('TagManager should start uninitialized');
        }
        if (userPreferences.isInitialized !== false) {
            throw new Error('UserPreferences should start uninitialized');
        }
    }

    async testIntegrationPoints() {
        // Test integration points between components and data manager
        const stats = await this.dataManager.getStats();
        
        // Test that stats are properly structured
        if (typeof stats.raw !== 'object' || 
            typeof stats.merged !== 'object' || 
            typeof stats.initialized !== 'boolean') {
            throw new Error('Data manager stats structure invalid');
        }

        // Test that merged data is accessible
        const mergedData = await this.dataManager.getAllMergedData();
        if (!mergedData.apps || !mergedData.bookmarks) {
            throw new Error('Merged data structure invalid');
        }

        // Test backup functionality
        const backupResult = await this.dataManager.createBackup();
        if (!backupResult) {
            throw new Error('Backup functionality failed');
        }

        // Test validation
        const validation = await this.dataManager.validateIntegrity();
        if (!validation || typeof validation.valid !== 'number') {
            throw new Error('Data validation failed');
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up test data...');
        
        try {
            // Clean up test data
            await this.dataManager.adapter.delete('raw/apps_raw');
            await this.dataManager.adapter.delete('raw/bookmarks_raw');
            await this.dataManager.adapter.delete('merged/apps_final');
            await this.dataManager.adapter.delete('merged/bookmarks_final');
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SimpleUITester();
    
    tester.runTests()
        .then(async (results) => {
            await tester.cleanup();
            
            if (results.failed === 0) {
                console.log('\n🎉 All Simple UI Components tests passed!');
                process.exit(0);
            } else {
                console.log('\n💥 Some Simple UI Components tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = SimpleUITester;