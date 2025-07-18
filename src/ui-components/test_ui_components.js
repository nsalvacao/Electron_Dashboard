/**
 * Test script for UI Components
 * Validates the functionality of all interactive customization components
 */

const path = require('path');
const HybridDataManager = require('../data-management/HybridDataManager');
const {
    VisualFeedback,
    CategoryManager,
    TagManager,
    DragDropHandler,
    UserPreferences,
    CustomizationPanel
} = require('./index');

class UIComponentsTester {
    constructor() {
        this.dataManager = new HybridDataManager({
            dataPath: '/tmp/nexo-ui-test-data'
        });
        this.components = {};
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runAllTests() {
        console.log('🧪 Starting UI Components Tests...\n');

        try {
            // Initialize data manager
            await this.dataManager.initialize();
            
            // Create mock DOM environment
            this.setupMockDOM();

            // Test 1: Visual Feedback System
            console.log('Test 1: Visual Feedback System');
            await this.testVisualFeedback();
            console.log('✅ Visual Feedback test passed\n');

            // Test 2: Category Manager
            console.log('Test 2: Category Manager');
            await this.testCategoryManager();
            console.log('✅ Category Manager test passed\n');

            // Test 3: Tag Manager
            console.log('Test 3: Tag Manager');
            await this.testTagManager();
            console.log('✅ Tag Manager test passed\n');

            // Test 4: User Preferences
            console.log('Test 4: User Preferences');
            await this.testUserPreferences();
            console.log('✅ User Preferences test passed\n');

            // Test 5: Drag Drop Handler
            console.log('Test 5: Drag Drop Handler');
            await this.testDragDropHandler();
            console.log('✅ Drag Drop Handler test passed\n');

            // Test 6: Customization Panel Integration
            console.log('Test 6: Customization Panel Integration');
            await this.testCustomizationPanel();
            console.log('✅ Customization Panel test passed\n');

            // Test 7: Component Interaction
            console.log('Test 7: Component Interaction');
            await this.testComponentInteraction();
            console.log('✅ Component Interaction test passed\n');

            // Test 8: Performance Testing
            console.log('Test 8: Performance Testing');
            await this.testPerformance();
            console.log('✅ Performance test passed\n');

        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push(error.message);
            console.error('❌ Test failed:', error.message);
        }

        console.log('🏁 UI Components Test Results:');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🔍 Errors:');
            this.testResults.errors.forEach(error => console.log(`  - ${error}`));
        }

        return this.testResults;
    }

    setupMockDOM() {
        // Mock basic DOM elements and methods
        global.document = {
            createElement: (tag) => ({
                tagName: tag,
                className: '',
                innerHTML: '',
                style: {},
                dataset: {},
                classList: {
                    add: () => {},
                    remove: () => {},
                    contains: () => false,
                    toggle: () => {}
                },
                addEventListener: () => {},
                removeEventListener: () => {},
                appendChild: () => {},
                removeChild: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                remove: () => {}
            }),
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: () => {},
            body: {
                appendChild: () => {},
                removeChild: () => {},
                classList: {
                    add: () => {},
                    remove: () => {},
                    contains: () => false,
                    toggle: () => {}
                }
            }
        };

        global.window = {
            matchMedia: () => ({ matches: false }),
            scrollY: 0,
            scrollX: 0
        };

        // Mock bootstrap modal
        global.bootstrap = {
            Modal: class {
                constructor() {}
                show() {}
                hide() {}
                static getInstance() {
                    return { hide: () => {} };
                }
            }
        };

        // Mock MutationObserver
        global.MutationObserver = class {
            constructor(callback) {
                this.callback = callback;
            }
            observe() {}
            disconnect() {}
        };

        // Mock Node types
        global.Node = {
            ELEMENT_NODE: 1
        };
    }

    async testVisualFeedback() {
        const feedback = new VisualFeedback();
        
        // Test initialization
        const initResult = await feedback.initialize();
        if (!initResult) {
            throw new Error('VisualFeedback initialization failed');
        }

        // Test notifications
        const notificationId = feedback.showSuccess('Test notification');
        if (typeof notificationId !== 'number') {
            throw new Error('Notification ID should be a number');
        }

        // Test progress
        const progressId = feedback.showProgress('test-progress', {
            title: 'Test Progress',
            progress: 50
        });
        if (typeof progressId !== 'string') {
            throw new Error('Progress ID should be a string');
        }

        // Test loading
        const loadingId = feedback.showLoading('test-loading', {
            text: 'Test Loading'
        });
        if (typeof loadingId !== 'string') {
            throw new Error('Loading ID should be a string');
        }

        // Test cleanup
        feedback.hideNotification(notificationId);
        feedback.hideProgress(progressId);
        feedback.hideLoading(loadingId);

        this.components.visualFeedback = feedback;
        this.testResults.passed++;
    }

    async testCategoryManager() {
        const categoryManager = new CategoryManager(this.dataManager, this.components.visualFeedback);
        
        // Test initialization
        const initResult = await categoryManager.initialize();
        if (!initResult) {
            throw new Error('CategoryManager initialization failed');
        }

        // Test category operations
        await categoryManager.addCategory({
            name: 'Test Category',
            color: '#007bff',
            icon: 'folder',
            description: 'Test category description'
        });

        // Reload categories after adding
        await categoryManager.loadCategories();

        const categories = categoryManager.getCategories();
        if (!Array.isArray(categories)) {
            throw new Error('Categories should be an array');
        }

        // Test category retrieval
        const testCategory = categoryManager.getCategory('Test Category');
        if (!testCategory || testCategory.name !== 'Test Category') {
            console.log('Available categories:', categories.map(c => c.name));
            throw new Error('Category retrieval failed');
        }

        this.components.categoryManager = categoryManager;
        this.testResults.passed++;
    }

    async testTagManager() {
        const tagManager = new TagManager(this.dataManager, this.components.visualFeedback);
        
        // Test initialization
        const initResult = await tagManager.initialize();
        if (!initResult) {
            throw new Error('TagManager initialization failed');
        }

        // Test tag operations
        await tagManager.addTag({
            name: 'test-tag',
            color: '#28a745',
            category: 'Test',
            description: 'Test tag description'
        });

        // Reload tags after adding
        await tagManager.loadTags();

        const tags = tagManager.getTags();
        if (!Array.isArray(tags)) {
            throw new Error('Tags should be an array');
        }

        // Test tag retrieval
        const testTag = tagManager.getTag('test-tag');
        if (!testTag || testTag.name !== 'test-tag') {
            console.log('Available tags:', tags.map(t => t.name));
            throw new Error('Tag retrieval failed');
        }

        this.components.tagManager = tagManager;
        this.testResults.passed++;
    }

    async testUserPreferences() {
        const userPreferences = new UserPreferences(this.dataManager, this.components.visualFeedback);
        
        // Test initialization
        const initResult = await userPreferences.initialize();
        if (!initResult) {
            throw new Error('UserPreferences initialization failed');
        }

        // Test preference operations
        await userPreferences.set('theme', 'dark');
        const theme = userPreferences.get('theme');
        if (theme !== 'dark') {
            throw new Error('Preference setting/getting failed');
        }

        // Test preference validation
        const allPreferences = userPreferences.getAll();
        if (!(allPreferences instanceof Map)) {
            throw new Error('All preferences should be a Map');
        }

        // Test readiness
        if (!userPreferences.isReady()) {
            throw new Error('UserPreferences should be ready after initialization');
        }

        this.components.userPreferences = userPreferences;
        this.testResults.passed++;
    }

    async testDragDropHandler() {
        const dragDropHandler = new DragDropHandler(this.dataManager, this.components.visualFeedback);
        
        // Test initialization
        const initResult = await dragDropHandler.initialize();
        if (!initResult) {
            throw new Error('DragDropHandler initialization failed');
        }

        // Test operation history
        const history = dragDropHandler.getOperationHistory();
        if (!Array.isArray(history)) {
            throw new Error('Operation history should be an array');
        }

        // Test enable/disable
        dragDropHandler.setEnabled(false);
        dragDropHandler.setEnabled(true);

        // Test history management
        dragDropHandler.clearOperationHistory();
        const clearedHistory = dragDropHandler.getOperationHistory();
        if (clearedHistory.length !== 0) {
            throw new Error('Operation history should be empty after clearing');
        }

        this.components.dragDropHandler = dragDropHandler;
        this.testResults.passed++;
    }

    async testCustomizationPanel() {
        const customizationPanel = new CustomizationPanel(this.dataManager);
        
        // Test initialization
        const initResult = await customizationPanel.initialize();
        if (!initResult) {
            throw new Error('CustomizationPanel initialization failed');
        }

        // Test readiness
        if (!customizationPanel.isReady()) {
            throw new Error('CustomizationPanel should be ready after initialization');
        }

        // Test selected items
        const selectedItems = customizationPanel.getSelectedItems();
        if (!Array.isArray(selectedItems)) {
            throw new Error('Selected items should be an array');
        }

        // Test visibility methods
        customizationPanel.show();
        customizationPanel.hide();

        this.components.customizationPanel = customizationPanel;
        this.testResults.passed++;
    }

    async testComponentInteraction() {
        // Test that all components are properly initialized
        const requiredComponents = [
            'visualFeedback',
            'categoryManager',
            'tagManager',
            'userPreferences',
            'dragDropHandler',
            'customizationPanel'
        ];

        for (const component of requiredComponents) {
            if (!this.components[component]) {
                throw new Error(`Component ${component} not initialized`);
            }
        }

        // Test component interdependencies
        const categoryManager = this.components.categoryManager;
        const tagManager = this.components.tagManager;
        const userPreferences = this.components.userPreferences;

        // Test data consistency
        await categoryManager.refresh();
        await tagManager.refresh();
        
        const categories = categoryManager.getCategories();
        const tags = tagManager.getTags();
        const preferences = userPreferences.getAll();

        if (!Array.isArray(categories) || !Array.isArray(tags) || !(preferences instanceof Map)) {
            throw new Error('Component data consistency check failed');
        }

        this.testResults.passed++;
    }

    async testPerformance() {
        const startTime = Date.now();
        
        // Test multiple operations
        const operations = [];
        
        // Add multiple categories
        for (let i = 0; i < 10; i++) {
            operations.push(
                this.components.categoryManager.addCategory({
                    name: `Test Category ${i}`,
                    color: '#007bff',
                    icon: 'folder',
                    description: `Test category ${i} description`
                })
            );
        }

        // Add multiple tags
        for (let i = 0; i < 20; i++) {
            operations.push(
                this.components.tagManager.addTag({
                    name: `test-tag-${i}`,
                    color: '#28a745',
                    category: 'Test',
                    description: `Test tag ${i} description`
                })
            );
        }

        // Set multiple preferences
        for (let i = 0; i < 5; i++) {
            operations.push(
                this.components.userPreferences.set(`test-pref-${i}`, `value-${i}`)
            );
        }

        // Execute all operations
        await Promise.all(operations);
        
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Performance should be reasonable (under 5 seconds for all operations)
        if (duration > 5000) {
            throw new Error(`Performance test failed: took ${duration}ms`);
        }

        console.log(`📊 Performance: ${operations.length} operations completed in ${duration}ms`);
        
        this.testResults.passed++;
    }

    async cleanup() {
        console.log('🧹 Cleaning up test data...');
        
        // Clear test data
        try {
            await this.dataManager.adapter.delete('custom/categories_custom');
            await this.dataManager.adapter.delete('custom/tags_custom');
            await this.dataManager.adapter.delete('custom/user_preferences');
            await this.dataManager.adapter.delete('custom/organization_custom');
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new UIComponentsTester();
    
    tester.runAllTests()
        .then(async (results) => {
            await tester.cleanup();
            
            if (results.failed === 0) {
                console.log('\n🎉 All UI Components tests passed!');
                process.exit(0);
            } else {
                console.log('\n💥 Some UI Components tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = UIComponentsTester;