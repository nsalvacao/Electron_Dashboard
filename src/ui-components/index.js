/**
 * UI Components Module for Nexo Dashboard
 * Main entry point for all UI components
 */

const CategoryManager = require('./CategoryManager');
const TagManager = require('./TagManager');
const DragDropHandler = require('./DragDropHandler');
const VisualFeedback = require('./VisualFeedback');
const UserPreferences = require('./UserPreferences');
const CustomizationPanel = require('./CustomizationPanel');

module.exports = {
    CategoryManager,
    TagManager,
    DragDropHandler,
    VisualFeedback,
    UserPreferences,
    CustomizationPanel
};