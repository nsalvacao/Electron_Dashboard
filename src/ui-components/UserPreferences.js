/**
 * User Preferences Manager for Nexo Dashboard
 * Handles user settings and preferences with persistence
 */

class UserPreferences {
    constructor(hybridDataManager, visualFeedback) {
        this.dataManager = hybridDataManager;
        this.feedback = visualFeedback;
        this.preferences = new Map();
        this.defaultPreferences = this.getDefaultPreferences();
        this.isInitialized = false;
        this.changeListeners = new Map();
    }

    /**
     * Initialize user preferences
     */
    async initialize() {
        try {
            await this.loadPreferences();
            this.setupEventListeners();
            this.renderPreferencesPanel();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize UserPreferences:', error);
            this.feedback.showError('Failed to initialize user preferences');
            return false;
        }
    }

    /**
     * Get default preferences
     */
    getDefaultPreferences() {
        return {
            // UI Preferences
            theme: 'auto',
            layout: 'grid',
            itemsPerPage: 20,
            showItemDetails: true,
            showThumbnails: true,
            compactMode: false,
            
            // Data Preferences
            mergeStrategy: 'user_priority',
            autoMerge: true,
            conflictResolution: 'auto',
            backupBeforeMerge: true,
            
            // Behavior Preferences
            autoRefresh: true,
            refreshInterval: 30, // minutes
            showNotifications: true,
            soundEnabled: false,
            
            // Search & Filter Preferences
            searchDelay: 300, // milliseconds
            fuzzySearch: true,
            searchInDescription: true,
            caseSensitiveSearch: false,
            
            // Performance Preferences
            lazyLoading: true,
            cacheSize: 100,
            animationsEnabled: true,
            
            // Privacy Preferences
            analyticsEnabled: false,
            crashReporting: false,
            
            // Accessibility Preferences
            highContrast: false,
            largeText: false,
            reduceMotion: false,
            screenReaderMode: false,
            
            // Advanced Preferences
            debugMode: false,
            experimentalFeatures: false,
            developerMode: false
        };
    }

    /**
     * Load preferences from data manager
     */
    async loadPreferences() {
        try {
            const savedPreferences = await this.dataManager.adapter.load('custom/user_preferences') || {};
            
            // Merge with defaults
            this.preferences.clear();
            for (const [key, defaultValue] of Object.entries(this.defaultPreferences)) {
                const value = savedPreferences[key] !== undefined ? savedPreferences[key] : defaultValue;
                this.preferences.set(key, value);
            }
            
            // Apply preferences to the system
            this.applyPreferences();
            
        } catch (error) {
            console.error('Failed to load preferences:', error);
            // Use defaults if loading fails
            this.preferences = new Map(Object.entries(this.defaultPreferences));
        }
    }

    /**
     * Save preferences to data manager
     */
    async savePreferences() {
        try {
            const preferencesObject = Object.fromEntries(this.preferences);
            preferencesObject.lastUpdate = new Date().toISOString();
            
            await this.dataManager.adapter.save('custom/user_preferences', preferencesObject);
            this.applyPreferences();
            
            this.feedback.showSuccess('Preferences saved successfully');
            
        } catch (error) {
            console.error('Failed to save preferences:', error);
            this.feedback.showError('Failed to save preferences');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showPreferencesPanel());
        }

        // Preferences form
        const preferencesForm = document.getElementById('preferences-form');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', (e) => this.handlePreferencesSubmit(e));
        }

        // Real-time preference changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('preference-input')) {
                this.handlePreferenceChange(e.target);
            }
        });

        // Reset preferences button
        const resetBtn = document.getElementById('reset-preferences-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.showResetConfirmation());
        }

        // Import/Export preferences
        const exportBtn = document.getElementById('export-preferences-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPreferences());
        }

        const importBtn = document.getElementById('import-preferences-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importPreferences());
        }
    }

    /**
     * Render preferences panel
     */
    renderPreferencesPanel() {
        const panel = document.getElementById('preferences-panel');
        if (!panel) return;

        const preferencesGroups = this.getPreferencesGroups();
        
        panel.innerHTML = `
            <div class="preferences-header">
                <h3>User Preferences</h3>
                <button type="button" class="btn btn-outline-secondary" id="reset-preferences-btn">
                    <i class="fas fa-undo"></i> Reset to Defaults
                </button>
            </div>
            <div class="preferences-content">
                <form id="preferences-form">
                    ${preferencesGroups.map(group => `
                        <div class="preference-group">
                            <h4 class="preference-group-title">
                                <i class="fas fa-${group.icon}"></i>
                                ${group.title}
                            </h4>
                            <div class="preference-group-content">
                                ${group.preferences.map(pref => this.renderPreferenceItem(pref)).join('')}
                            </div>
                        </div>
                    `).join('')}
                    <div class="preferences-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Preferences
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="export-preferences-btn">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="import-preferences-btn">
                            <i class="fas fa-upload"></i> Import
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Get preferences groups
     */
    getPreferencesGroups() {
        return [
            {
                title: 'Appearance',
                icon: 'paint-brush',
                preferences: [
                    { key: 'theme', label: 'Theme', type: 'select', options: ['auto', 'light', 'dark'] },
                    { key: 'layout', label: 'Layout', type: 'select', options: ['grid', 'list', 'compact'] },
                    { key: 'itemsPerPage', label: 'Items per Page', type: 'number', min: 5, max: 100 },
                    { key: 'showItemDetails', label: 'Show Item Details', type: 'checkbox' },
                    { key: 'showThumbnails', label: 'Show Thumbnails', type: 'checkbox' },
                    { key: 'compactMode', label: 'Compact Mode', type: 'checkbox' },
                    { key: 'animationsEnabled', label: 'Enable Animations', type: 'checkbox' }
                ]
            },
            {
                title: 'Data Management',
                icon: 'database',
                preferences: [
                    { key: 'mergeStrategy', label: 'Merge Strategy', type: 'select', options: ['user_priority', 'auto_priority', 'smart_merge', 'hybrid'] },
                    { key: 'autoMerge', label: 'Auto Merge', type: 'checkbox' },
                    { key: 'conflictResolution', label: 'Conflict Resolution', type: 'select', options: ['auto', 'manual', 'intelligent'] },
                    { key: 'backupBeforeMerge', label: 'Backup Before Merge', type: 'checkbox' }
                ]
            },
            {
                title: 'Behavior',
                icon: 'cog',
                preferences: [
                    { key: 'autoRefresh', label: 'Auto Refresh', type: 'checkbox' },
                    { key: 'refreshInterval', label: 'Refresh Interval (minutes)', type: 'number', min: 5, max: 120 },
                    { key: 'showNotifications', label: 'Show Notifications', type: 'checkbox' },
                    { key: 'soundEnabled', label: 'Sound Enabled', type: 'checkbox' }
                ]
            },
            {
                title: 'Search & Filter',
                icon: 'search',
                preferences: [
                    { key: 'searchDelay', label: 'Search Delay (ms)', type: 'number', min: 100, max: 1000 },
                    { key: 'fuzzySearch', label: 'Fuzzy Search', type: 'checkbox' },
                    { key: 'searchInDescription', label: 'Search in Description', type: 'checkbox' },
                    { key: 'caseSensitiveSearch', label: 'Case Sensitive Search', type: 'checkbox' }
                ]
            },
            {
                title: 'Performance',
                icon: 'tachometer-alt',
                preferences: [
                    { key: 'lazyLoading', label: 'Lazy Loading', type: 'checkbox' },
                    { key: 'cacheSize', label: 'Cache Size', type: 'number', min: 10, max: 1000 }
                ]
            },
            {
                title: 'Accessibility',
                icon: 'universal-access',
                preferences: [
                    { key: 'highContrast', label: 'High Contrast', type: 'checkbox' },
                    { key: 'largeText', label: 'Large Text', type: 'checkbox' },
                    { key: 'reduceMotion', label: 'Reduce Motion', type: 'checkbox' },
                    { key: 'screenReaderMode', label: 'Screen Reader Mode', type: 'checkbox' }
                ]
            },
            {
                title: 'Advanced',
                icon: 'wrench',
                preferences: [
                    { key: 'debugMode', label: 'Debug Mode', type: 'checkbox' },
                    { key: 'experimentalFeatures', label: 'Experimental Features', type: 'checkbox' },
                    { key: 'developerMode', label: 'Developer Mode', type: 'checkbox' }
                ]
            }
        ];
    }

    /**
     * Render preference item
     */
    renderPreferenceItem(pref) {
        const value = this.preferences.get(pref.key);
        const id = `pref-${pref.key}`;

        switch (pref.type) {
            case 'checkbox':
                return `
                    <div class="preference-item">
                        <label for="${id}" class="preference-label">
                            <input type="checkbox" id="${id}" name="${pref.key}" 
                                   class="preference-input" ${value ? 'checked' : ''}>
                            ${pref.label}
                        </label>
                    </div>
                `;
            
            case 'select':
                return `
                    <div class="preference-item">
                        <label for="${id}" class="preference-label">${pref.label}</label>
                        <select id="${id}" name="${pref.key}" class="preference-input form-select">
                            ${pref.options.map(option => `
                                <option value="${option}" ${value === option ? 'selected' : ''}>
                                    ${option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            
            case 'number':
                return `
                    <div class="preference-item">
                        <label for="${id}" class="preference-label">${pref.label}</label>
                        <input type="number" id="${id}" name="${pref.key}" 
                               class="preference-input form-control" 
                               value="${value}" min="${pref.min || 0}" max="${pref.max || 100}">
                    </div>
                `;
            
            case 'text':
                return `
                    <div class="preference-item">
                        <label for="${id}" class="preference-label">${pref.label}</label>
                        <input type="text" id="${id}" name="${pref.key}" 
                               class="preference-input form-control" value="${value}">
                    </div>
                `;
            
            case 'range':
                return `
                    <div class="preference-item">
                        <label for="${id}" class="preference-label">
                            ${pref.label} <span class="range-value">${value}</span>
                        </label>
                        <input type="range" id="${id}" name="${pref.key}" 
                               class="preference-input form-range" 
                               value="${value}" min="${pref.min || 0}" max="${pref.max || 100}">
                    </div>
                `;
            
            default:
                return '';
        }
    }

    /**
     * Handle preference change
     */
    handlePreferenceChange(input) {
        const key = input.name;
        let value;

        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'number' || input.type === 'range') {
            value = parseInt(input.value);
        } else {
            value = input.value;
        }

        this.preferences.set(key, value);
        
        // Update range value display
        if (input.type === 'range') {
            const rangeValue = input.parentElement.querySelector('.range-value');
            if (rangeValue) {
                rangeValue.textContent = value;
            }
        }

        // Trigger change listeners
        this.notifyChangeListeners(key, value);
        
        // Auto-save for certain preferences
        if (this.shouldAutoSave(key)) {
            this.savePreferences();
        }
    }

    /**
     * Handle preferences form submit
     */
    async handlePreferencesSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        
        // Update all preferences
        for (const [key, value] of formData.entries()) {
            let processedValue;
            
            if (this.preferences.has(key)) {
                const currentValue = this.preferences.get(key);
                
                if (typeof currentValue === 'boolean') {
                    processedValue = value === 'on';
                } else if (typeof currentValue === 'number') {
                    processedValue = parseInt(value);
                } else {
                    processedValue = value;
                }
                
                this.preferences.set(key, processedValue);
            }
        }

        // Handle checkboxes that aren't checked (not included in FormData)
        for (const [key, defaultValue] of Object.entries(this.defaultPreferences)) {
            if (typeof defaultValue === 'boolean' && !formData.has(key)) {
                this.preferences.set(key, false);
            }
        }

        await this.savePreferences();
    }

    /**
     * Show preferences panel
     */
    showPreferencesPanel() {
        const modal = document.getElementById('preferences-modal');
        if (modal) {
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
        }
    }

    /**
     * Show reset confirmation
     */
    async showResetConfirmation() {
        const confirmed = await this.feedback.showConfirmation(
            'Are you sure you want to reset all preferences to their default values?',
            { confirmText: 'Reset', cancelText: 'Cancel' }
        );

        if (confirmed) {
            await this.resetPreferences();
        }
    }

    /**
     * Reset preferences to defaults
     */
    async resetPreferences() {
        try {
            this.preferences = new Map(Object.entries(this.defaultPreferences));
            await this.savePreferences();
            this.renderPreferencesPanel();
            this.feedback.showSuccess('Preferences reset to defaults');
        } catch (error) {
            console.error('Failed to reset preferences:', error);
            this.feedback.showError('Failed to reset preferences');
        }
    }

    /**
     * Export preferences
     */
    exportPreferences() {
        try {
            const preferencesObject = Object.fromEntries(this.preferences);
            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                preferences: preferencesObject
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `nexo-preferences-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.feedback.showSuccess('Preferences exported successfully');
        } catch (error) {
            console.error('Failed to export preferences:', error);
            this.feedback.showError('Failed to export preferences');
        }
    }

    /**
     * Import preferences
     */
    importPreferences() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                if (!file) return;

                const text = await file.text();
                const importData = JSON.parse(text);

                if (importData.preferences) {
                    // Validate and import preferences
                    for (const [key, value] of Object.entries(importData.preferences)) {
                        if (this.defaultPreferences.hasOwnProperty(key)) {
                            this.preferences.set(key, value);
                        }
                    }

                    await this.savePreferences();
                    this.renderPreferencesPanel();
                    this.feedback.showSuccess('Preferences imported successfully');
                } else {
                    this.feedback.showError('Invalid preferences file format');
                }
            } catch (error) {
                console.error('Failed to import preferences:', error);
                this.feedback.showError('Failed to import preferences');
            }
        };
        input.click();
    }

    /**
     * Apply preferences to the system
     */
    applyPreferences() {
        // Apply theme
        this.applyTheme();
        
        // Apply layout
        this.applyLayout();
        
        // Apply accessibility settings
        this.applyAccessibilitySettings();
        
        // Apply performance settings
        this.applyPerformanceSettings();
        
        // Update data manager settings
        this.updateDataManagerSettings();
    }

    /**
     * Apply theme preference
     */
    applyTheme() {
        const theme = this.preferences.get('theme');
        const body = document.body;
        
        body.classList.remove('theme-light', 'theme-dark');
        
        if (theme === 'light') {
            body.classList.add('theme-light');
        } else if (theme === 'dark') {
            body.classList.add('theme-dark');
        } else {
            // Auto theme based on system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                body.classList.add('theme-dark');
            } else {
                body.classList.add('theme-light');
            }
        }
    }

    /**
     * Apply layout preference
     */
    applyLayout() {
        const layout = this.preferences.get('layout');
        const itemsContainer = document.querySelector('.items-container');
        
        if (itemsContainer) {
            itemsContainer.classList.remove('layout-grid', 'layout-list', 'layout-compact');
            itemsContainer.classList.add(`layout-${layout}`);
        }
    }

    /**
     * Apply accessibility settings
     */
    applyAccessibilitySettings() {
        const body = document.body;
        
        body.classList.toggle('high-contrast', this.preferences.get('highContrast'));
        body.classList.toggle('large-text', this.preferences.get('largeText'));
        body.classList.toggle('reduce-motion', this.preferences.get('reduceMotion'));
        body.classList.toggle('screen-reader-mode', this.preferences.get('screenReaderMode'));
    }

    /**
     * Apply performance settings
     */
    applyPerformanceSettings() {
        const body = document.body;
        
        body.classList.toggle('animations-disabled', !this.preferences.get('animationsEnabled'));
        body.classList.toggle('lazy-loading', this.preferences.get('lazyLoading'));
    }

    /**
     * Update data manager settings
     */
    updateDataManagerSettings() {
        if (this.dataManager) {
            this.dataManager.config.mergeStrategy = this.preferences.get('mergeStrategy');
            this.dataManager.config.autoMerge = this.preferences.get('autoMerge');
            this.dataManager.config.conflictResolution = this.preferences.get('conflictResolution');
            this.dataManager.config.backupBeforeMerge = this.preferences.get('backupBeforeMerge');
        }
    }

    /**
     * Check if preference should auto-save
     */
    shouldAutoSave(key) {
        const autoSavePreferences = ['theme', 'layout', 'highContrast', 'largeText', 'reduceMotion'];
        return autoSavePreferences.includes(key);
    }

    /**
     * Add change listener
     */
    addChangeListener(key, callback) {
        if (!this.changeListeners.has(key)) {
            this.changeListeners.set(key, []);
        }
        this.changeListeners.get(key).push(callback);
    }

    /**
     * Remove change listener
     */
    removeChangeListener(key, callback) {
        if (this.changeListeners.has(key)) {
            const listeners = this.changeListeners.get(key);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Notify change listeners
     */
    notifyChangeListeners(key, value) {
        if (this.changeListeners.has(key)) {
            this.changeListeners.get(key).forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error('Error in preference change listener:', error);
                }
            });
        }
    }

    /**
     * Get preference value
     */
    get(key) {
        return this.preferences.get(key);
    }

    /**
     * Set preference value
     */
    async set(key, value) {
        this.preferences.set(key, value);
        this.notifyChangeListeners(key, value);
        
        if (this.shouldAutoSave(key)) {
            await this.savePreferences();
        }
    }

    /**
     * Get all preferences
     */
    getAll() {
        return new Map(this.preferences);
    }

    /**
     * Check if preferences are initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

module.exports = UserPreferences;