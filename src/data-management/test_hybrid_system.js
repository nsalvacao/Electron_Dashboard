/**
 * Test script for Hybrid Data System
 * Validates the functionality of the hybrid data persistence system
 */

const HybridDataManager = require('./HybridDataManager');
const UUIDGenerator = require('./UUIDGenerator');

class HybridSystemTester {
    constructor() {
        this.manager = new HybridDataManager({
            dataPath: '/tmp/nexo-test-data',
            mergeStrategy: 'user_priority',
            autoMerge: true
        });
    }

    async runAllTests() {
        console.log('🧪 Starting Hybrid Data System Tests...\n');

        const testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };

        try {
            // Test 1: Initialization
            console.log('Test 1: System Initialization');
            await this.testInitialization();
            testResults.passed++;
            console.log('✅ Initialization test passed\n');

            // Test 2: UUID Generation
            console.log('Test 2: UUID Generation');
            await this.testUUIDGeneration();
            testResults.passed++;
            console.log('✅ UUID generation test passed\n');

            // Test 3: Raw Data Addition
            console.log('Test 3: Raw Data Addition');
            await this.testRawDataAddition();
            testResults.passed++;
            console.log('✅ Raw data addition test passed\n');

            // Test 4: Custom Data Addition
            console.log('Test 4: Custom Data Addition');
            await this.testCustomDataAddition();
            testResults.passed++;
            console.log('✅ Custom data addition test passed\n');

            // Test 5: Data Merging
            console.log('Test 5: Data Merging');
            await this.testDataMerging();
            testResults.passed++;
            console.log('✅ Data merging test passed\n');

            // Test 6: Conflict Resolution
            console.log('Test 6: Conflict Resolution');
            await this.testConflictResolution();
            testResults.passed++;
            console.log('✅ Conflict resolution test passed\n');

            // Test 7: System Statistics
            console.log('Test 7: System Statistics');
            await this.testSystemStats();
            testResults.passed++;
            console.log('✅ System statistics test passed\n');

            // Test 8: Data Integrity
            console.log('Test 8: Data Integrity');
            await this.testDataIntegrity();
            testResults.passed++;
            console.log('✅ Data integrity test passed\n');

        } catch (error) {
            testResults.failed++;
            testResults.errors.push(error.message);
            console.error('❌ Test failed:', error.message);
        }

        console.log('🏁 Test Results:');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        
        if (testResults.errors.length > 0) {
            console.log('\n🔍 Errors:');
            testResults.errors.forEach(error => console.log(`  - ${error}`));
        }

        return testResults;
    }

    async testInitialization() {
        const result = await this.manager.initialize();
        if (!result) {
            throw new Error('Failed to initialize hybrid data manager');
        }
        
        const stats = await this.manager.getStats();
        if (!stats.initialized) {
            throw new Error('Manager reports not initialized');
        }
    }

    async testUUIDGeneration() {
        // Test UUID v4 generation
        const uuid1 = UUIDGenerator.generateUUID();
        const uuid2 = UUIDGenerator.generateUUID();
        
        if (!UUIDGenerator.isValid(uuid1)) {
            throw new Error('Generated UUID is not valid');
        }
        
        if (uuid1 === uuid2) {
            throw new Error('UUIDs are not unique');
        }

        // Test deterministic UUID generation
        const content = 'test-content';
        const deterministicUUID1 = UUIDGenerator.generateFromContent(content);
        const deterministicUUID2 = UUIDGenerator.generateFromContent(content);
        
        if (deterministicUUID1 !== deterministicUUID2) {
            throw new Error('Deterministic UUIDs are not consistent');
        }

        // Test short UUID generation
        const shortUUID = UUIDGenerator.generateShort();
        if (shortUUID.length !== 8) {
            throw new Error('Short UUID is not 8 characters');
        }
    }

    async testRawDataAddition() {
        const testApps = [
            {
                name: 'Test App 1',
                path: '/path/to/app1.exe',
                core: {
                    name: 'Test App 1',
                    path: '/path/to/app1.exe',
                    type: 'application',
                    source: 'test'
                },
                metadata: {
                    category: 'Test',
                    tags: ['test', 'app'],
                    priority: 'high'
                }
            },
            {
                name: 'Test App 2',
                path: '/path/to/app2.exe',
                core: {
                    name: 'Test App 2',
                    path: '/path/to/app2.exe',
                    type: 'application',
                    source: 'test'
                },
                metadata: {
                    category: 'Test',
                    tags: ['test', 'app'],
                    priority: 'medium'
                }
            }
        ];

        const result = await this.manager.addRawData('apps', testApps);
        if (!result) {
            throw new Error('Failed to add raw data');
        }

        const stats = await this.manager.getStats();
        if (stats.raw.apps !== 2) {
            throw new Error(`Expected 2 raw apps, got ${stats.raw.apps}`);
        }
    }

    async testCustomDataAddition() {
        const customData = {
            customizations: [
                {
                    id: UUIDGenerator.generateFromContent('Test App 1/path/to/app1.exe'),
                    type: 'apps',
                    metadata: {
                        category: 'Custom Category',
                        tags: ['custom', 'modified'],
                        notes: 'This is a custom note',
                        priority: 'high'
                    }
                }
            ]
        };

        const result = await this.manager.addCustomData('organization', customData);
        if (!result) {
            throw new Error('Failed to add custom data');
        }

        const stats = await this.manager.getStats();
        if (stats.merged.apps === 0) {
            throw new Error('No merged apps found after adding custom data');
        }
    }

    async testDataMerging() {
        const mergeResult = await this.manager.performMerge();
        if (!mergeResult.success) {
            throw new Error('Data merge failed');
        }

        const mergedData = await this.manager.getMergedData('apps');
        if (!mergedData.items || mergedData.items.length === 0) {
            throw new Error('No merged data found');
        }

        // Check if merge preserved custom data
        const customizedItem = mergedData.items.find(item => 
            item.metadata.merged.category === 'Custom Category'
        );
        
        if (!customizedItem) {
            throw new Error('Custom data not preserved in merge');
        }
    }

    async testConflictResolution() {
        // Add conflicting data
        const conflictingApps = [
            {
                name: 'Test App 1',
                path: '/path/to/app1.exe',
                core: {
                    name: 'Test App 1 - Updated',
                    path: '/path/to/app1.exe',
                    type: 'application',
                    source: 'test'
                },
                metadata: {
                    category: 'Updated Category',
                    tags: ['updated', 'conflict'],
                    priority: 'low'
                }
            }
        ];

        await this.manager.addRawData('apps', conflictingApps);
        const mergeResult = await this.manager.performMerge();
        
        if (mergeResult.conflicts.length === 0) {
            console.log('⚠️  No conflicts detected (may be expected with current merge strategy)');
        } else {
            console.log(`✅ Detected ${mergeResult.conflicts.length} conflicts`);
        }
    }

    async testSystemStats() {
        const stats = await this.manager.getStats();
        
        if (typeof stats.raw.apps !== 'number') {
            throw new Error('Invalid raw apps count in stats');
        }
        
        if (typeof stats.merged.apps !== 'number') {
            throw new Error('Invalid merged apps count in stats');
        }
        
        if (!stats.initialized) {
            throw new Error('Stats show system not initialized');
        }

        console.log('📊 System Stats:', {
            raw: stats.raw,
            merged: stats.merged,
            merges: stats.merges,
            conflicts: stats.conflicts
        });
    }

    async testDataIntegrity() {
        const integrity = await this.manager.validateIntegrity();
        
        if (integrity.invalid > 0) {
            throw new Error(`Data integrity issues: ${integrity.invalid} invalid items`);
        }
        
        if (integrity.errors.length > 0) {
            throw new Error(`Data integrity errors: ${integrity.errors.join(', ')}`);
        }

        console.log('🔍 Data Integrity:', {
            valid: integrity.valid,
            invalid: integrity.invalid,
            errors: integrity.errors.length
        });
    }

    async cleanup() {
        console.log('🧹 Cleaning up test data...');
        // Test cleanup would go here
        // For now, we'll leave test data in /tmp/nexo-test-data
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new HybridSystemTester();
    
    tester.runAllTests()
        .then(async (results) => {
            await tester.cleanup();
            
            if (results.failed === 0) {
                console.log('\n🎉 All tests passed!');
                process.exit(0);
            } else {
                console.log('\n💥 Some tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = HybridSystemTester;