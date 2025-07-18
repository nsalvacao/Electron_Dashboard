/**
 * Category Manager for Nexo Dashboard
 * Handles visual management of categories with CRUD operations
 */

class CategoryManager {
    constructor(hybridDataManager, visualFeedback) {
        this.dataManager = hybridDataManager;
        this.feedback = visualFeedback;
        this.categories = new Map();
        this.selectedCategory = null;
        this.isInitialized = false;
    }

    /**
     * Initialize category manager
     */
    async initialize() {
        try {
            await this.loadCategories();
            this.setupEventListeners();
            this.renderCategoryList();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize CategoryManager:', error);
            this.feedback.showError('Failed to initialize category management');
            return false;
        }
    }

    /**
     * Load categories from data manager
     */
    async loadCategories() {
        try {
            const customData = await this.dataManager.adapter.load('custom/categories_custom') || { categories: [] };
            const mergedApps = await this.dataManager.getMergedData('apps');
            const mergedBookmarks = await this.dataManager.getMergedData('bookmarks');

            // Extract unique categories from merged data
            const allCategories = new Set();
            
            // Add categories from custom data
            customData.categories.forEach(cat => allCategories.add(cat.name));
            
            // Add categories from merged data
            [...mergedApps.items, ...mergedBookmarks.items].forEach(item => {
                if (item.metadata?.merged?.category) {
                    allCategories.add(item.metadata.merged.category);
                }
            });

            // Update internal categories map
            this.categories.clear();
            allCategories.forEach(categoryName => {
                const customCategory = customData.categories.find(c => c.name === categoryName);
                this.categories.set(categoryName, {
                    name: categoryName,
                    color: customCategory?.color || this.generateCategoryColor(categoryName),
                    icon: customCategory?.icon || 'folder',
                    description: customCategory?.description || '',
                    itemCount: this.getCategoryItemCount(categoryName, mergedApps.items, mergedBookmarks.items),
                    isCustom: !!customCategory,
                    createdAt: customCategory?.createdAt || new Date().toISOString()
                });
            });

        } catch (error) {
            console.error('Failed to load categories:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for category management
     */
    setupEventListeners() {
        // Add category button
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showAddCategoryModal());
        }

        // Edit category buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-category-btn')) {
                const categoryName = e.target.dataset.category;
                this.showEditCategoryModal(categoryName);
            }
        });

        // Delete category buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-category-btn')) {
                const categoryName = e.target.dataset.category;
                this.showDeleteCategoryConfirmation(categoryName);
            }
        });

        // Category modal form submission
        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategoryFormSubmit(e));
        }

        // Search categories
        const categorySearch = document.getElementById('category-search');
        if (categorySearch) {
            categorySearch.addEventListener('input', (e) => this.filterCategories(e.target.value));
        }
    }

    /**
     * Render category list in the UI
     */
    renderCategoryList() {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        const sortedCategories = Array.from(this.categories.values())
            .sort((a, b) => b.itemCount - a.itemCount);

        categoryList.innerHTML = sortedCategories.map(category => `
            <div class="category-item" data-category="${category.name}">
                <div class="category-header">
                    <div class="category-info">
                        <span class="category-color" style="background-color: ${category.color}"></span>
                        <i class="category-icon fas fa-${category.icon}"></i>
                        <span class="category-name">${category.name}</span>
                        <span class="category-count">${category.itemCount} items</span>
                    </div>
                    <div class="category-actions">
                        <button class="btn btn-sm btn-outline-primary edit-category-btn" 
                                data-category="${category.name}" 
                                title="Edit category">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-category-btn" 
                                data-category="${category.name}" 
                                title="Delete category"
                                ${category.itemCount > 0 ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${category.description ? `<div class="category-description">${category.description}</div>` : ''}
            </div>
        `).join('');
    }

    /**
     * Show add category modal
     */
    showAddCategoryModal() {
        const modal = document.getElementById('category-modal');
        const modalTitle = document.getElementById('category-modal-title');
        const form = document.getElementById('category-form');
        
        if (!modal || !modalTitle || !form) return;

        modalTitle.textContent = 'Add New Category';
        form.reset();
        form.dataset.mode = 'add';
        delete form.dataset.categoryName;

        // Set default values
        document.getElementById('category-color').value = this.generateRandomColor();
        document.getElementById('category-icon').value = 'folder';

        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /**
     * Show edit category modal
     */
    showEditCategoryModal(categoryName) {
        const category = this.categories.get(categoryName);
        if (!category) return;

        const modal = document.getElementById('category-modal');
        const modalTitle = document.getElementById('category-modal-title');
        const form = document.getElementById('category-form');
        
        if (!modal || !modalTitle || !form) return;

        modalTitle.textContent = 'Edit Category';
        form.dataset.mode = 'edit';
        form.dataset.categoryName = categoryName;

        // Populate form with category data
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-color').value = category.color;
        document.getElementById('category-icon').value = category.icon;
        document.getElementById('category-description').value = category.description;

        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /**
     * Handle category form submission
     */
    async handleCategoryFormSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const mode = form.dataset.mode;
        const originalName = form.dataset.categoryName;

        const formData = new FormData(form);
        const categoryData = {
            name: formData.get('category-name').trim(),
            color: formData.get('category-color'),
            icon: formData.get('category-icon'),
            description: formData.get('category-description').trim()
        };

        try {
            if (mode === 'add') {
                await this.addCategory(categoryData);
            } else if (mode === 'edit') {
                await this.updateCategory(originalName, categoryData);
            }

            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('category-modal'));
            modal.hide();

            // Refresh category list
            await this.loadCategories();
            this.renderCategoryList();

        } catch (error) {
            console.error('Failed to save category:', error);
            this.feedback.showError('Failed to save category');
        }
    }

    /**
     * Add new category
     */
    async addCategory(categoryData) {
        if (this.categories.has(categoryData.name)) {
            throw new Error('Category already exists');
        }

        const customData = await this.dataManager.adapter.load('custom/categories_custom') || { categories: [] };
        
        const newCategory = {
            ...categoryData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        customData.categories.push(newCategory);
        customData.lastUpdate = new Date().toISOString();

        await this.dataManager.adapter.save('custom/categories_custom', customData);
        this.feedback.showSuccess(`Category "${categoryData.name}" created successfully`);
    }

    /**
     * Update existing category
     */
    async updateCategory(originalName, categoryData) {
        const customData = await this.dataManager.adapter.load('custom/categories_custom') || { categories: [] };
        
        const categoryIndex = customData.categories.findIndex(c => c.name === originalName);
        if (categoryIndex === -1) {
            // Create new custom category if it doesn't exist
            const newCategory = {
                ...categoryData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            customData.categories.push(newCategory);
        } else {
            // Update existing category
            customData.categories[categoryIndex] = {
                ...customData.categories[categoryIndex],
                ...categoryData,
                updatedAt: new Date().toISOString()
            };
        }

        // If name changed, update all items with the old category name
        if (originalName !== categoryData.name) {
            await this.updateItemsWithCategoryName(originalName, categoryData.name);
        }

        customData.lastUpdate = new Date().toISOString();
        await this.dataManager.adapter.save('custom/categories_custom', customData);
        this.feedback.showSuccess(`Category "${categoryData.name}" updated successfully`);
    }

    /**
     * Show delete category confirmation
     */
    showDeleteCategoryConfirmation(categoryName) {
        const category = this.categories.get(categoryName);
        if (!category) return;

        if (category.itemCount > 0) {
            this.feedback.showWarning(`Cannot delete category "${categoryName}" because it contains ${category.itemCount} items`);
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete the category "${categoryName}"?`);
        if (confirmed) {
            this.deleteCategory(categoryName);
        }
    }

    /**
     * Delete category
     */
    async deleteCategory(categoryName) {
        try {
            const customData = await this.dataManager.adapter.load('custom/categories_custom') || { categories: [] };
            
            const categoryIndex = customData.categories.findIndex(c => c.name === categoryName);
            if (categoryIndex !== -1) {
                customData.categories.splice(categoryIndex, 1);
                customData.lastUpdate = new Date().toISOString();
                await this.dataManager.adapter.save('custom/categories_custom', customData);
            }

            await this.loadCategories();
            this.renderCategoryList();
            this.feedback.showSuccess(`Category "${categoryName}" deleted successfully`);

        } catch (error) {
            console.error('Failed to delete category:', error);
            this.feedback.showError('Failed to delete category');
        }
    }

    /**
     * Filter categories by search term
     */
    filterCategories(searchTerm) {
        const categoryItems = document.querySelectorAll('.category-item');
        const term = searchTerm.toLowerCase();

        categoryItems.forEach(item => {
            const categoryName = item.dataset.category.toLowerCase();
            const description = item.querySelector('.category-description')?.textContent.toLowerCase() || '';
            
            if (categoryName.includes(term) || description.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Get category item count
     */
    getCategoryItemCount(categoryName, apps, bookmarks) {
        let count = 0;
        [...apps, ...bookmarks].forEach(item => {
            if (item.metadata?.merged?.category === categoryName) {
                count++;
            }
        });
        return count;
    }

    /**
     * Generate category color based on name
     */
    generateCategoryColor(categoryName) {
        const colors = [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
            '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#6f42c1'
        ];
        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
            hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Generate random color
     */
    generateRandomColor() {
        const colors = [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
            '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#6f42c1'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Update items with new category name
     */
    async updateItemsWithCategoryName(oldName, newName) {
        try {
            const organizationData = await this.dataManager.adapter.load('custom/organization_custom') || { customizations: [] };
            
            // Update category name in customizations
            organizationData.customizations.forEach(item => {
                if (item.metadata?.category === oldName) {
                    item.metadata.category = newName;
                }
            });

            organizationData.lastUpdate = new Date().toISOString();
            await this.dataManager.adapter.save('custom/organization_custom', organizationData);

            // Trigger merge to update final data
            await this.dataManager.performMerge();

        } catch (error) {
            console.error('Failed to update items with new category name:', error);
            throw error;
        }
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Array.from(this.categories.values());
    }

    /**
     * Get category by name
     */
    getCategory(name) {
        return this.categories.get(name);
    }

    /**
     * Refresh category data
     */
    async refresh() {
        await this.loadCategories();
        this.renderCategoryList();
    }
}

module.exports = CategoryManager;