/**
 * Nexo Dashboard Data Management Module
 * Main entry point for the hybrid data persistence system
 */

const HybridDataManager = require('./HybridDataManager');
const DataMerger = require('./DataMerger');
const ConflictResolver = require('./ConflictResolver');
const UUIDGenerator = require('./UUIDGenerator');
const DataStore = require('./DataStore');
const JSONAdapter = require('./JSONAdapter');

module.exports = {
    HybridDataManager,
    DataMerger,
    ConflictResolver,
    UUIDGenerator,
    DataStore,
    JSONAdapter
};