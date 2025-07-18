/**
 * Customization Panel for Nexo Dashboard
 * Main interface for organizing and customizing data
 */

class CustomizationPanel {
    constructor(hybridDataManager) {
        this.dataManager = hybridDataManager;
        this.visualFeedback = null;
        this.categoryManager = null;
        this.tagManager = null;
        this.dragDropHandler = null;
        this.userPreferences = null;
        this.isInitialized = false;
        this.currentView = 'overview';
        this.selectedItems = new Set();
    }

    /**
     * Initialize customization panel
     */
    async initialize() {
        try {
            // Initialize components
            await this.initializeComponents();
            
            // Setup UI
            this.createCustomizationPanel();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            // Load initial data
            await this.loadData();
            
            this.isInitialized = true;
            this.visualFeedback.showSuccess('Customization panel initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize CustomizationPanel:', error);
            if (this.visualFeedback) {
                this.visualFeedback.showError('Failed to initialize customization panel');
            }
            return false;
        }
    }

    /**
     * Initialize components
     */
    async initializeComponents() {
        // Import components
        const VisualFeedback = require('./VisualFeedback');
        const CategoryManager = require('./CategoryManager');
        const TagManager = require('./TagManager');
        const DragDropHandler = require('./DragDropHandler');
        const UserPreferences = require('./UserPreferences');

        // Initialize visual feedback first
        this.visualFeedback = new VisualFeedback();
        await this.visualFeedback.initialize();

        // Initialize other components
        this.categoryManager = new CategoryManager(this.dataManager, this.visualFeedback);
        this.tagManager = new TagManager(this.dataManager, this.visualFeedback);
        this.dragDropHandler = new DragDropHandler(this.dataManager, this.visualFeedback);
        this.userPreferences = new UserPreferences(this.dataManager, this.visualFeedback);

        // Initialize all components
        await Promise.all([
            this.categoryManager.initialize(),
            this.tagManager.initialize(),
            this.dragDropHandler.initialize(),
            this.userPreferences.initialize()
        ]);
    }

    /**
     * Create customization panel UI
     */
    createCustomizationPanel() {
        const existingPanel = document.getElementById('customization-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'customization-panel';
        panel.className = 'customization-panel';
        panel.innerHTML = `
            <div class="customization-header">
                <div class="customization-title">
                    <h2><i class="fas fa-cog"></i> Customization Panel</h2>
                    <button class="btn btn-outline-secondary btn-sm" id="toggle-customization-panel">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="customization-toolbar">
                    <div class="btn-group" role="group">
                        <button class="btn btn-outline-primary active" data-view="overview">
                            <i class="fas fa-home"></i> Overview
                        </button>
                        <button class="btn btn-outline-primary" data-view="categories">
                            <i class="fas fa-folder"></i> Categories
                        </button>
                        <button class="btn btn-outline-primary" data-view="tags">
                            <i class="fas fa-tag"></i> Tags
                        </button>
                        <button class="btn btn-outline-primary" data-view="organization">
                            <i class="fas fa-sort"></i> Organization
                        </button>
                        <button class="btn btn-outline-primary" data-view="preferences">
                            <i class="fas fa-sliders-h"></i> Preferences
                        </button>
                    </div>
                    <div class="customization-actions">
                        <button class="btn btn-outline-success" id="save-customizations">
                            <i class="fas fa-save"></i> Save
                        </button>
                        <button class="btn btn-outline-warning" id="reset-customizations">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    </div>
                </div>
            </div>
            <div class="customization-content">
                <div class="customization-view" id="overview-view">
                    ${this.renderOverviewView()}
                </div>
                <div class="customization-view" id="categories-view" style="display: none;">
                    ${this.renderCategoriesView()}
                </div>
                <div class="customization-view" id="tags-view" style="display: none;">
                    ${this.renderTagsView()}
                </div>
                <div class="customization-view" id="organization-view" style="display: none;">
                    ${this.renderOrganizationView()}
                </div>
                <div class="customization-view" id="preferences-view" style="display: none;">
                    ${this.renderPreferencesView()}
                </div>
            </div>
        `;

        document.body.appendChild(panel);
    }

    /**
     * Render overview view
     */
    renderOverviewView() {
        return `
            <div class="overview-container">
                <div class="overview-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-desktop"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="apps-count">0</h3>
                            <p>Applications</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-bookmark"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="bookmarks-count">0</h3>
                            <p>Bookmarks</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-folder"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="categories-count">0</h3>
                            <p>Categories</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-tag"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="tags-count">0</h3>
                            <p>Tags</p>
                        </div>
                    </div>
                </div>
                <div class="overview-actions">
                    <div class="action-group">
                        <h4>Quick Actions</h4>
                        <div class="action-buttons">
                            <button class="btn btn-primary" id="quick-categorize">
                                <i class="fas fa-magic"></i> Auto-Categorize
                            </button>
                            <button class="btn btn-secondary" id="quick-cleanup">
                                <i class="fas fa-broom"></i> Clean Duplicates
                            </button>
                            <button class="btn btn-info" id="quick-organize">
                                <i class="fas fa-sort-alpha-up"></i> Organize
                            </button>
                        </div>
                    </div>
                    <div class="action-group">
                        <h4>Recent Changes</h4>
                        <div class="recent-changes" id="recent-changes">
                            <p class="text-muted">No recent changes</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render categories view
     */
    renderCategoriesView() {
        return `
            <div class="categories-container">
                <div class="categories-header">
                    <div class="categories-controls">
                        <input type="text" class="form-control" id="category-search" placeholder="Search categories...">
                        <button class="btn btn-primary" id="add-category-btn">
                            <i class="fas fa-plus"></i> Add Category
                        </button>
                    </div>
                </div>
                <div class="categories-content">
                    <div class="category-list" id="category-list">
                        <!-- Categories will be rendered here -->
                    </div>
                </div>
            </div>
            
            <!-- Category Modal -->
            <div class="modal fade" id="category-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="category-modal-title">Add Category</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="category-form">
                                <div class="mb-3">
                                    <label for="category-name" class="form-label">Category Name</label>
                                    <input type="text" class="form-control" id="category-name" name="category-name" required>
                                </div>
                                <div class="mb-3">
                                    <label for="category-color" class="form-label">Color</label>
                                    <input type="color" class="form-control form-control-color" id="category-color" name="category-color">
                                </div>
                                <div class="mb-3">
                                    <label for="category-icon" class="form-label">Icon</label>
                                    <select class="form-select" id="category-icon" name="category-icon">
                                        <option value="folder">Folder</option>
                                        <option value="desktop">Desktop</option>
                                        <option value="gamepad">Games</option>
                                        <option value="code">Development</option>
                                        <option value="palette">Graphics</option>
                                        <option value="music">Music</option>
                                        <option value="video">Video</option>
                                        <option value="book">Education</option>
                                        <option value="briefcase">Business</option>
                                        <option value="wrench">Utilities</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="category-description" class="form-label">Description</label>
                                    <textarea class="form-control" id="category-description" name="category-description" rows="3"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary" form="category-form">Save Category</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render tags view
     */
    renderTagsView() {
        return `
            <div class="tags-container">
                <div class="tags-header">
                    <div class="tags-controls">
                        <input type="text" class="form-control" id="tag-search" placeholder="Search tags...">
                        <button class="btn btn-primary" id="add-tag-btn">
                            <i class="fas fa-plus"></i> Add Tag
                        </button>
                    </div>
                    <div class="bulk-tag-actions" id="bulk-tag-actions" style="display: none;">
                        <button class="btn btn-danger" id="bulk-delete-tags-btn">
                            <i class="fas fa-trash"></i> Delete Selected
                        </button>
                    </div>
                </div>
                <div class="tags-content">
                    <div class="tag-list" id="tag-list">
                        <!-- Tags will be rendered here -->
                    </div>
                </div>
            </div>
            
            <!-- Tag Modal -->
            <div class="modal fade" id="tag-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="tag-modal-title">Add Tag</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="tag-form">
                                <div class="mb-3">
                                    <label for="tag-name" class="form-label">Tag Name</label>
                                    <input type="text" class="form-control" id="tag-name" name="tag-name" required>
                                </div>
                                <div class="mb-3">
                                    <label for="tag-color" class="form-label">Color</label>
                                    <input type="color" class="form-control form-control-color" id="tag-color" name="tag-color">
                                </div>
                                <div class="mb-3">
                                    <label for="tag-category" class="form-label">Category</label>
                                    <select class="form-select" id="tag-category" name="tag-category">
                                        <option value="General">General</option>
                                        <option value="Priority">Priority</option>
                                        <option value="Status">Status</option>
                                        <option value="Type">Type</option>
                                        <option value="Custom">Custom</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="tag-description" class="form-label">Description</label>
                                    <textarea class="form-control" id="tag-description" name="tag-description" rows="3"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary" form="tag-form">Save Tag</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render organization view
     */
    renderOrganizationView() {
        return `
            <div class="organization-container">
                <div class="organization-header">
                    <div class="organization-controls">
                        <div class="btn-group" role="group">
                            <button class="btn btn-outline-primary active" data-org-view="items">
                                <i class="fas fa-list"></i> Items
                            </button>
                            <button class="btn btn-outline-primary" data-org-view="categories">
                                <i class="fas fa-folder"></i> By Category
                            </button>
                            <button class="btn btn-outline-primary" data-org-view="tags">
                                <i class="fas fa-tag"></i> By Tags
                            </button>
                        </div>
                        <div class="organization-actions">
                            <button class="btn btn-success" id="apply-bulk-changes">
                                <i class="fas fa-check"></i> Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
                <div class="organization-content">
                    <div class="organization-sidebar">
                        <div class="quick-assign">
                            <h5>Quick Assign</h5>
                            <div class="assign-category">
                                <label>Category:</label>
                                <select class="form-select form-select-sm" id="quick-category-select">
                                    <option value="">Select category...</option>
                                </select>
                            </div>
                            <div class="assign-tags">
                                <label>Tags:</label>
                                <div class="tag-input-container">
                                    <input type="text" class="form-control form-control-sm" id="tag-input" placeholder="Add tags...">
                                    <div class="tag-suggestions" id="tag-suggestions"></div>
                                </div>
                                <div class="selected-tags" id="selected-tags"></div>
                            </div>
                        </div>
                        <div class="batch-operations">
                            <h5>Batch Operations</h5>
                            <div class="batch-actions">
                                <button class="btn btn-sm btn-outline-primary" id="select-all-items">
                                    <i class="fas fa-check-square"></i> Select All
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" id="clear-selection">
                                    <i class="fas fa-square"></i> Clear Selection
                                </button>
                                <button class="btn btn-sm btn-outline-warning" id="bulk-categorize">
                                    <i class="fas fa-folder"></i> Categorize
                                </button>
                                <button class="btn btn-sm btn-outline-info" id="bulk-tag">
                                    <i class="fas fa-tag"></i> Tag
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="organization-main">
                        <div class="organization-items" id="organization-items">
                            <!-- Items will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render preferences view
     */
    renderPreferencesView() {
        return `
            <div class="preferences-container">
                <div class="preferences-panel" id="preferences-panel">
                    <!-- Preferences will be rendered here by UserPreferences -->
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Panel toggle
        const toggleBtn = document.getElementById('toggle-customization-panel');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.togglePanel());
        }

        // View switching
        document.addEventListener('click', (e) => {
            if (e.target.dataset.view) {
                this.switchView(e.target.dataset.view);
            }
        });

        // Save/Reset buttons
        const saveBtn = document.getElementById('save-customizations');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCustomizations());
        }

        const resetBtn = document.getElementById('reset-customizations');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetCustomizations());
        }

        // Quick actions
        const quickCategorize = document.getElementById('quick-categorize');
        if (quickCategorize) {
            quickCategorize.addEventListener('click', () => this.quickCategorize());
        }

        const quickCleanup = document.getElementById('quick-cleanup');
        if (quickCleanup) {
            quickCleanup.addEventListener('click', () => this.quickCleanup());
        }

        const quickOrganize = document.getElementById('quick-organize');
        if (quickOrganize) {
            quickOrganize.addEventListener('click', () => this.quickOrganize());
        }

        // Organization view switching
        document.addEventListener('click', (e) => {
            if (e.target.dataset.orgView) {
                this.switchOrganizationView(e.target.dataset.orgView);
            }
        });

        // Bulk operations
        const selectAllBtn = document.getElementById('select-all-items');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllItems());
        }

        const clearSelectionBtn = document.getElementById('clear-selection');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        }

        // Drag and drop refresh
        document.addEventListener('dragDropRefresh', () => this.refreshData());
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveCustomizations();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.resetCustomizations();
                        break;
                    case 'a':
                        if (this.currentView === 'organization') {
                            e.preventDefault();
                            this.selectAllItems();
                        }
                        break;
                    case 'd':
                        if (this.currentView === 'organization') {
                            e.preventDefault();
                            this.clearSelection();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Load data
     */
    async loadData() {
        try {
            await this.updateOverviewStats();
            await this.loadOrganizationItems();
            await this.loadRecentChanges();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.visualFeedback.showError('Failed to load data');
        }
    }

    /**
     * Update overview statistics
     */
    async updateOverviewStats() {
        try {
            const stats = await this.dataManager.getStats();
            
            document.getElementById('apps-count').textContent = stats.merged.apps;
            document.getElementById('bookmarks-count').textContent = stats.merged.bookmarks;
            
            const categories = this.categoryManager.getCategories();
            document.getElementById('categories-count').textContent = categories.length;
            
            const tags = this.tagManager.getTags();
            document.getElementById('tags-count').textContent = tags.length;
            
        } catch (error) {
            console.error('Failed to update overview stats:', error);
        }
    }

    /**
     * Load organization items
     */
    async loadOrganizationItems() {
        try {
            const mergedData = await this.dataManager.getAllMergedData();
            const items = [...mergedData.apps.items, ...mergedData.bookmarks.items];
            
            const container = document.getElementById('organization-items');
            if (container) {
                container.innerHTML = items.map(item => this.renderOrganizationItem(item)).join('');
            }
        } catch (error) {
            console.error('Failed to load organization items:', error);
        }
    }

    /**
     * Render organization item
     */
    renderOrganizationItem(item) {
        const isSelected = this.selectedItems.has(item.id);
        const category = item.metadata?.merged?.category || 'Uncategorized';
        const tags = item.metadata?.merged?.tags || [];
        
        return `
            <div class="organization-item ${isSelected ? 'selected' : ''}" 
                 data-item-id="${item.id}" 
                 data-item-type="${item.core.type}">
                <div class="item-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''}>
                </div>
                <div class="item-content">
                    <div class="item-header">
                        <span class="item-name">${item.core.name}</span>
                        <span class="item-type">${item.core.type}</span>
                    </div>
                    <div class="item-meta">
                        <span class="item-category">
                            <i class="fas fa-folder"></i> ${category}
                        </span>
                        <div class="item-tags">
                            ${tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load recent changes
     */
    async loadRecentChanges() {
        try {
            const mergeHistory = await this.dataManager.adapter.load('sync/merge_history') || { merges: [] };
            const recentChanges = mergeHistory.merges.slice(-5);
            
            const container = document.getElementById('recent-changes');
            if (container) {
                if (recentChanges.length === 0) {
                    container.innerHTML = '<p class="text-muted">No recent changes</p>';
                } else {
                    container.innerHTML = recentChanges.map(change => `
                        <div class="recent-change">
                            <i class="fas fa-${change.success ? 'check' : 'times'} text-${change.success ? 'success' : 'danger'}"></i>
                            <span class="change-description">
                                Merged ${change.types.join(', ')} 
                                ${change.conflicts > 0 ? `(${change.conflicts} conflicts)` : ''}
                            </span>
                            <span class="change-time">${new Date(change.timestamp).toLocaleString()}</span>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Failed to load recent changes:', error);
        }
    }

    /**
     * Toggle panel visibility
     */
    togglePanel() {
        const panel = document.getElementById('customization-panel');
        const toggleBtn = document.getElementById('toggle-customization-panel');
        
        if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            toggleBtn.querySelector('i').className = 'fas fa-chevron-down';
        } else {
            panel.classList.add('collapsed');
            toggleBtn.querySelector('i').className = 'fas fa-chevron-up';
        }
    }

    /**
     * Switch view
     */
    switchView(viewName) {
        this.currentView = viewName;
        
        // Update active button
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        // Show/hide views
        document.querySelectorAll('.customization-view').forEach(view => {
            view.style.display = 'none';
        });
        document.getElementById(`${viewName}-view`).style.display = 'block';
        
        // Load view-specific data
        this.loadViewData(viewName);
    }

    /**
     * Load view-specific data
     */
    async loadViewData(viewName) {
        switch (viewName) {
            case 'overview':
                await this.updateOverviewStats();
                await this.loadRecentChanges();
                break;
            case 'categories':
                await this.categoryManager.refresh();
                break;
            case 'tags':
                await this.tagManager.refresh();
                break;
            case 'organization':
                await this.loadOrganizationItems();
                break;
            case 'preferences':
                // Preferences are handled by UserPreferences component
                break;
        }
    }

    /**
     * Switch organization view
     */
    switchOrganizationView(orgView) {
        // Update active button
        document.querySelectorAll('[data-org-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-org-view="${orgView}"]`).classList.add('active');
        
        // Load organization view data
        this.loadOrganizationViewData(orgView);
    }

    /**
     * Load organization view data
     */
    async loadOrganizationViewData(orgView) {
        try {
            const mergedData = await this.dataManager.getAllMergedData();
            const items = [...mergedData.apps.items, ...mergedData.bookmarks.items];
            
            let organizedItems = items;
            
            switch (orgView) {
                case 'categories':
                    organizedItems = this.organizeByCategory(items);
                    break;
                case 'tags':
                    organizedItems = this.organizeByTags(items);
                    break;
                default:
                    organizedItems = items;
            }
            
            const container = document.getElementById('organization-items');
            if (container) {
                container.innerHTML = organizedItems.map(item => this.renderOrganizationItem(item)).join('');
            }
        } catch (error) {
            console.error('Failed to load organization view data:', error);
        }
    }

    /**
     * Organize items by category
     */
    organizeByCategory(items) {
        const categories = {};
        
        items.forEach(item => {
            const category = item.metadata?.merged?.category || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(item);
        });
        
        return Object.values(categories).flat();
    }

    /**
     * Organize items by tags
     */
    organizeByTags(items) {
        return items.sort((a, b) => {
            const tagsA = a.metadata?.merged?.tags || [];
            const tagsB = b.metadata?.merged?.tags || [];
            return tagsB.length - tagsA.length;
        });
    }

    /**
     * Select all items
     */
    selectAllItems() {
        const items = document.querySelectorAll('.organization-item');
        items.forEach(item => {
            this.selectedItems.add(item.dataset.itemId);
            item.classList.add('selected');
            item.querySelector('input[type="checkbox"]').checked = true;
        });
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedItems.clear();
        const items = document.querySelectorAll('.organization-item');
        items.forEach(item => {
            item.classList.remove('selected');
            item.querySelector('input[type="checkbox"]').checked = false;
        });
    }

    /**
     * Quick categorize
     */
    async quickCategorize() {
        this.visualFeedback.showInfo('Auto-categorization feature coming soon!');
    }

    /**
     * Quick cleanup
     */
    async quickCleanup() {
        this.visualFeedback.showInfo('Duplicate cleanup feature coming soon!');
    }

    /**
     * Quick organize
     */
    async quickOrganize() {
        this.visualFeedback.showInfo('Auto-organization feature coming soon!');
    }

    /**
     * Save customizations
     */
    async saveCustomizations() {
        try {
            const loadingId = this.visualFeedback.showLoading('save-customizations', {
                text: 'Saving customizations...',
                overlay: true
            });
            
            const mergeResult = await this.dataManager.performMerge();
            
            this.visualFeedback.hideLoading(loadingId);
            
            if (mergeResult.success) {
                this.visualFeedback.showSuccess('Customizations saved successfully');
                await this.refreshData();
            } else {
                this.visualFeedback.showError('Failed to save customizations');
            }
        } catch (error) {
            console.error('Failed to save customizations:', error);
            this.visualFeedback.showError('Failed to save customizations');
        }
    }

    /**
     * Reset customizations
     */
    async resetCustomizations() {
        const confirmed = await this.visualFeedback.showConfirmation(
            'Are you sure you want to reset all customizations? This action cannot be undone.'
        );
        
        if (confirmed) {
            this.visualFeedback.showInfo('Reset customizations feature coming soon!');
        }
    }

    /**
     * Refresh data
     */
    async refreshData() {
        await this.loadData();
        
        // Refresh individual components
        if (this.categoryManager) {
            await this.categoryManager.refresh();
        }
        if (this.tagManager) {
            await this.tagManager.refresh();
        }
        if (this.dragDropHandler) {
            await this.dragDropHandler.refreshDropZones();
        }
    }

    /**
     * Get selected items
     */
    getSelectedItems() {
        return Array.from(this.selectedItems);
    }

    /**
     * Show/hide customization panel
     */
    show() {
        const panel = document.getElementById('customization-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }

    hide() {
        const panel = document.getElementById('customization-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * Check if panel is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

module.exports = CustomizationPanel;