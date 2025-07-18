/**
 * Tag Manager for Nexo Dashboard
 * Handles visual management of tags with CRUD operations
 */

class TagManager {
    constructor(hybridDataManager, visualFeedback) {
        this.dataManager = hybridDataManager;
        this.feedback = visualFeedback;
        this.tags = new Map();
        this.selectedTags = new Set();
        this.isInitialized = false;
    }

    /**
     * Initialize tag manager
     */
    async initialize() {
        try {
            await this.loadTags();
            this.setupEventListeners();
            this.renderTagList();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize TagManager:', error);
            this.feedback.showError('Failed to initialize tag management');
            return false;
        }
    }

    /**
     * Load tags from data manager
     */
    async loadTags() {
        try {
            const customData = await this.dataManager.adapter.load('custom/tags_custom') || { tags: [] };
            const mergedApps = await this.dataManager.getMergedData('apps');
            const mergedBookmarks = await this.dataManager.getMergedData('bookmarks');

            // Extract unique tags from merged data
            const allTags = new Set();
            
            // Add tags from custom data
            customData.tags.forEach(tag => allTags.add(tag.name));
            
            // Add tags from merged data
            [...mergedApps.items, ...mergedBookmarks.items].forEach(item => {
                if (item.metadata?.merged?.tags) {
                    item.metadata.merged.tags.forEach(tag => allTags.add(tag));
                }
            });

            // Update internal tags map
            this.tags.clear();
            allTags.forEach(tagName => {
                const customTag = customData.tags.find(t => t.name === tagName);
                this.tags.set(tagName, {
                    name: tagName,
                    color: customTag?.color || this.generateTagColor(tagName),
                    description: customTag?.description || '',
                    itemCount: this.getTagItemCount(tagName, mergedApps.items, mergedBookmarks.items),
                    isCustom: !!customTag,
                    createdAt: customTag?.createdAt || new Date().toISOString(),
                    category: customTag?.category || 'General'
                });
            });

        } catch (error) {
            console.error('Failed to load tags:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for tag management
     */
    setupEventListeners() {
        // Add tag button
        const addTagBtn = document.getElementById('add-tag-btn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.showAddTagModal());
        }

        // Edit tag buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-tag-btn')) {
                const tagName = e.target.dataset.tag;
                this.showEditTagModal(tagName);
            }
        });

        // Delete tag buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-tag-btn')) {
                const tagName = e.target.dataset.tag;
                this.showDeleteTagConfirmation(tagName);
            }
        });

        // Tag selection (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-item')) {
                this.toggleTagSelection(e.target.dataset.tag);
            }
        });

        // Tag modal form submission
        const tagForm = document.getElementById('tag-form');
        if (tagForm) {
            tagForm.addEventListener('submit', (e) => this.handleTagFormSubmit(e));
        }

        // Search tags
        const tagSearch = document.getElementById('tag-search');
        if (tagSearch) {
            tagSearch.addEventListener('input', (e) => this.filterTags(e.target.value));
        }

        // Bulk operations
        const bulkDeleteBtn = document.getElementById('bulk-delete-tags-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this.showBulkDeleteConfirmation());
        }

        // Tag input with autocomplete
        const tagInput = document.getElementById('tag-input');
        if (tagInput) {
            tagInput.addEventListener('input', (e) => this.showTagSuggestions(e.target.value));
            tagInput.addEventListener('keydown', (e) => this.handleTagInputKeydown(e));
        }
    }

    /**
     * Render tag list in the UI
     */
    renderTagList() {
        const tagList = document.getElementById('tag-list');
        if (!tagList) return;

        const sortedTags = Array.from(this.tags.values())
            .sort((a, b) => b.itemCount - a.itemCount);

        tagList.innerHTML = sortedTags.map(tag => `
            <div class="tag-item ${this.selectedTags.has(tag.name) ? 'selected' : ''}" 
                 data-tag="${tag.name}">
                <div class="tag-header">
                    <div class="tag-info">
                        <span class="tag-badge" style="background-color: ${tag.color}">
                            ${tag.name}
                        </span>
                        <span class="tag-count">${tag.itemCount} items</span>
                        <span class="tag-category">${tag.category}</span>
                    </div>
                    <div class="tag-actions">
                        <button class="btn btn-sm btn-outline-primary edit-tag-btn" 
                                data-tag="${tag.name}" 
                                title="Edit tag">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-tag-btn" 
                                data-tag="${tag.name}" 
                                title="Delete tag">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${tag.description ? `<div class="tag-description">${tag.description}</div>` : ''}
            </div>
        `).join('');

        // Update bulk actions visibility
        this.updateBulkActionsVisibility();
    }

    /**
     * Show add tag modal
     */
    showAddTagModal() {
        const modal = document.getElementById('tag-modal');
        const modalTitle = document.getElementById('tag-modal-title');
        const form = document.getElementById('tag-form');
        
        if (!modal || !modalTitle || !form) return;

        modalTitle.textContent = 'Add New Tag';
        form.reset();
        form.dataset.mode = 'add';
        delete form.dataset.tagName;

        // Set default values
        document.getElementById('tag-color').value = this.generateRandomColor();
        document.getElementById('tag-category').value = 'General';

        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /**
     * Show edit tag modal
     */
    showEditTagModal(tagName) {
        const tag = this.tags.get(tagName);
        if (!tag) return;

        const modal = document.getElementById('tag-modal');
        const modalTitle = document.getElementById('tag-modal-title');
        const form = document.getElementById('tag-form');
        
        if (!modal || !modalTitle || !form) return;

        modalTitle.textContent = 'Edit Tag';
        form.dataset.mode = 'edit';
        form.dataset.tagName = tagName;

        // Populate form with tag data
        document.getElementById('tag-name').value = tag.name;
        document.getElementById('tag-color').value = tag.color;
        document.getElementById('tag-category').value = tag.category;
        document.getElementById('tag-description').value = tag.description;

        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /**
     * Handle tag form submission
     */
    async handleTagFormSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const mode = form.dataset.mode;
        const originalName = form.dataset.tagName;

        const formData = new FormData(form);
        const tagData = {
            name: formData.get('tag-name').trim(),
            color: formData.get('tag-color'),
            category: formData.get('tag-category'),
            description: formData.get('tag-description').trim()
        };

        try {
            if (mode === 'add') {
                await this.addTag(tagData);
            } else if (mode === 'edit') {
                await this.updateTag(originalName, tagData);
            }

            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('tag-modal'));
            modal.hide();

            // Refresh tag list
            await this.loadTags();
            this.renderTagList();

        } catch (error) {
            console.error('Failed to save tag:', error);
            this.feedback.showError('Failed to save tag');
        }
    }

    /**
     * Add new tag
     */
    async addTag(tagData) {
        if (this.tags.has(tagData.name)) {
            throw new Error('Tag already exists');
        }

        const customData = await this.dataManager.adapter.load('custom/tags_custom') || { tags: [] };
        
        const newTag = {
            ...tagData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        customData.tags.push(newTag);
        customData.lastUpdate = new Date().toISOString();

        await this.dataManager.adapter.save('custom/tags_custom', customData);
        this.feedback.showSuccess(`Tag "${tagData.name}" created successfully`);
    }

    /**
     * Update existing tag
     */
    async updateTag(originalName, tagData) {
        const customData = await this.dataManager.adapter.load('custom/tags_custom') || { tags: [] };
        
        const tagIndex = customData.tags.findIndex(t => t.name === originalName);
        if (tagIndex === -1) {
            // Create new custom tag if it doesn't exist
            const newTag = {
                ...tagData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            customData.tags.push(newTag);
        } else {
            // Update existing tag
            customData.tags[tagIndex] = {
                ...customData.tags[tagIndex],
                ...tagData,
                updatedAt: new Date().toISOString()
            };
        }

        // If name changed, update all items with the old tag name
        if (originalName !== tagData.name) {
            await this.updateItemsWithTagName(originalName, tagData.name);
        }

        customData.lastUpdate = new Date().toISOString();
        await this.dataManager.adapter.save('custom/tags_custom', customData);
        this.feedback.showSuccess(`Tag "${tagData.name}" updated successfully`);
    }

    /**
     * Show delete tag confirmation
     */
    showDeleteTagConfirmation(tagName) {
        const tag = this.tags.get(tagName);
        if (!tag) return;

        const confirmed = confirm(
            `Are you sure you want to delete the tag "${tagName}"?\n` +
            `This will remove it from ${tag.itemCount} items.`
        );
        
        if (confirmed) {
            this.deleteTag(tagName);
        }
    }

    /**
     * Delete tag
     */
    async deleteTag(tagName) {
        try {
            const customData = await this.dataManager.adapter.load('custom/tags_custom') || { tags: [] };
            
            const tagIndex = customData.tags.findIndex(t => t.name === tagName);
            if (tagIndex !== -1) {
                customData.tags.splice(tagIndex, 1);
            }

            // Remove tag from all items
            await this.removeTagFromAllItems(tagName);

            customData.lastUpdate = new Date().toISOString();
            await this.dataManager.adapter.save('custom/tags_custom', customData);

            await this.loadTags();
            this.renderTagList();
            this.feedback.showSuccess(`Tag "${tagName}" deleted successfully`);

        } catch (error) {
            console.error('Failed to delete tag:', error);
            this.feedback.showError('Failed to delete tag');
        }
    }

    /**
     * Toggle tag selection
     */
    toggleTagSelection(tagName) {
        if (this.selectedTags.has(tagName)) {
            this.selectedTags.delete(tagName);
        } else {
            this.selectedTags.add(tagName);
        }
        
        this.renderTagList();
    }

    /**
     * Show bulk delete confirmation
     */
    showBulkDeleteConfirmation() {
        if (this.selectedTags.size === 0) {
            this.feedback.showWarning('No tags selected for deletion');
            return;
        }

        const confirmed = confirm(
            `Are you sure you want to delete ${this.selectedTags.size} selected tags?\n` +
            `This action cannot be undone.`
        );
        
        if (confirmed) {
            this.bulkDeleteTags();
        }
    }

    /**
     * Bulk delete selected tags
     */
    async bulkDeleteTags() {
        try {
            const promises = Array.from(this.selectedTags).map(tagName => this.deleteTag(tagName));
            await Promise.all(promises);
            
            this.selectedTags.clear();
            this.feedback.showSuccess('Selected tags deleted successfully');
        } catch (error) {
            console.error('Failed to bulk delete tags:', error);
            this.feedback.showError('Failed to delete some tags');
        }
    }

    /**
     * Filter tags by search term
     */
    filterTags(searchTerm) {
        const tagItems = document.querySelectorAll('.tag-item');
        const term = searchTerm.toLowerCase();

        tagItems.forEach(item => {
            const tagName = item.dataset.tag.toLowerCase();
            const description = item.querySelector('.tag-description')?.textContent.toLowerCase() || '';
            const category = item.querySelector('.tag-category')?.textContent.toLowerCase() || '';
            
            if (tagName.includes(term) || description.includes(term) || category.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Show tag suggestions for autocomplete
     */
    showTagSuggestions(inputValue) {
        const suggestionsContainer = document.getElementById('tag-suggestions');
        if (!suggestionsContainer) return;

        const term = inputValue.toLowerCase();
        const suggestions = Array.from(this.tags.keys())
            .filter(tagName => tagName.toLowerCase().includes(term))
            .slice(0, 5);

        if (suggestions.length === 0 || !term) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        suggestionsContainer.innerHTML = suggestions.map(tagName => `
            <div class="tag-suggestion" data-tag="${tagName}">
                <span class="tag-badge" style="background-color: ${this.tags.get(tagName).color}">
                    ${tagName}
                </span>
                <span class="tag-count">${this.tags.get(tagName).itemCount} items</span>
            </div>
        `).join('');

        suggestionsContainer.style.display = 'block';

        // Add click handlers for suggestions
        suggestionsContainer.querySelectorAll('.tag-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const tagName = suggestion.dataset.tag;
                this.selectTagSuggestion(tagName);
            });
        });
    }

    /**
     * Handle tag input keydown
     */
    handleTagInputKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tagName = event.target.value.trim();
            if (tagName) {
                this.addTagToInput(tagName);
                event.target.value = '';
                this.hideSuggestions();
            }
        } else if (event.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    /**
     * Select tag suggestion
     */
    selectTagSuggestion(tagName) {
        const tagInput = document.getElementById('tag-input');
        if (tagInput) {
            this.addTagToInput(tagName);
            tagInput.value = '';
            this.hideSuggestions();
        }
    }

    /**
     * Add tag to input area
     */
    addTagToInput(tagName) {
        const selectedTagsContainer = document.getElementById('selected-tags');
        if (!selectedTagsContainer) return;

        // Check if tag already selected
        if (selectedTagsContainer.querySelector(`[data-tag="${tagName}"]`)) {
            return;
        }

        const tag = this.tags.get(tagName);
        const tagElement = document.createElement('span');
        tagElement.className = 'selected-tag';
        tagElement.dataset.tag = tagName;
        tagElement.innerHTML = `
            <span class="tag-badge" style="background-color: ${tag ? tag.color : '#6c757d'}">
                ${tagName}
            </span>
            <button type="button" class="btn-close" aria-label="Remove tag"></button>
        `;

        // Add remove handler
        tagElement.querySelector('.btn-close').addEventListener('click', () => {
            tagElement.remove();
        });

        selectedTagsContainer.appendChild(tagElement);
    }

    /**
     * Hide suggestions
     */
    hideSuggestions() {
        const suggestionsContainer = document.getElementById('tag-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    /**
     * Update bulk actions visibility
     */
    updateBulkActionsVisibility() {
        const bulkActions = document.getElementById('bulk-tag-actions');
        if (bulkActions) {
            bulkActions.style.display = this.selectedTags.size > 0 ? 'block' : 'none';
        }
    }

    /**
     * Get tag item count
     */
    getTagItemCount(tagName, apps, bookmarks) {
        let count = 0;
        [...apps, ...bookmarks].forEach(item => {
            if (item.metadata?.merged?.tags?.includes(tagName)) {
                count++;
            }
        });
        return count;
    }

    /**
     * Generate tag color based on name
     */
    generateTagColor(tagName) {
        const colors = [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
            '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#6f42c1'
        ];
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
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
     * Update items with new tag name
     */
    async updateItemsWithTagName(oldName, newName) {
        try {
            const organizationData = await this.dataManager.adapter.load('custom/organization_custom') || { customizations: [] };
            
            // Update tag name in customizations
            organizationData.customizations.forEach(item => {
                if (item.metadata?.tags?.includes(oldName)) {
                    const tagIndex = item.metadata.tags.indexOf(oldName);
                    item.metadata.tags[tagIndex] = newName;
                }
            });

            organizationData.lastUpdate = new Date().toISOString();
            await this.dataManager.adapter.save('custom/organization_custom', organizationData);

            // Trigger merge to update final data
            await this.dataManager.performMerge();

        } catch (error) {
            console.error('Failed to update items with new tag name:', error);
            throw error;
        }
    }

    /**
     * Remove tag from all items
     */
    async removeTagFromAllItems(tagName) {
        try {
            const organizationData = await this.dataManager.adapter.load('custom/organization_custom') || { customizations: [] };
            
            // Remove tag from all customizations
            organizationData.customizations.forEach(item => {
                if (item.metadata?.tags?.includes(tagName)) {
                    const tagIndex = item.metadata.tags.indexOf(tagName);
                    item.metadata.tags.splice(tagIndex, 1);
                }
            });

            organizationData.lastUpdate = new Date().toISOString();
            await this.dataManager.adapter.save('custom/organization_custom', organizationData);

            // Trigger merge to update final data
            await this.dataManager.performMerge();

        } catch (error) {
            console.error('Failed to remove tag from items:', error);
            throw error;
        }
    }

    /**
     * Get all tags
     */
    getTags() {
        return Array.from(this.tags.values());
    }

    /**
     * Get tag by name
     */
    getTag(name) {
        return this.tags.get(name);
    }

    /**
     * Get selected tags
     */
    getSelectedTags() {
        return Array.from(this.selectedTags);
    }

    /**
     * Refresh tag data
     */
    async refresh() {
        await this.loadTags();
        this.renderTagList();
    }
}

module.exports = TagManager;