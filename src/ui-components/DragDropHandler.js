/**
 * Drag and Drop Handler for Nexo Dashboard
 * Handles drag and drop operations for item reorganization
 */

class DragDropHandler {
    constructor(hybridDataManager, visualFeedback) {
        this.dataManager = hybridDataManager;
        this.feedback = visualFeedback;
        this.draggedItem = null;
        this.draggedElement = null;
        this.dropZones = new Map();
        this.isInitialized = false;
        this.dragOperationHistory = [];
    }

    /**
     * Initialize drag and drop handler
     */
    async initialize() {
        try {
            this.setupDragAndDrop();
            this.createDropZones();
            this.setupEventListeners();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize DragDropHandler:', error);
            this.feedback.showError('Failed to initialize drag and drop functionality');
            return false;
        }
    }

    /**
     * Setup drag and drop functionality for items
     */
    setupDragAndDrop() {
        // Enable drag and drop on existing items
        this.enableDragDropOnItems();

        // Setup mutation observer to handle dynamically added items
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.enableDragDropOnElement(node);
                        }
                    });
                }
            });
        });

        // Observe changes to item containers
        const itemContainers = document.querySelectorAll('.items-container, .category-items');
        itemContainers.forEach(container => {
            observer.observe(container, { childList: true, subtree: true });
        });
    }

    /**
     * Enable drag and drop on existing items
     */
    enableDragDropOnItems() {
        const draggableItems = document.querySelectorAll('.card, .item-card, .app-item');
        draggableItems.forEach(item => {
            this.enableDragDropOnElement(item);
        });
    }

    /**
     * Enable drag and drop on a specific element
     */
    enableDragDropOnElement(element) {
        if (element.classList.contains('card') || 
            element.classList.contains('item-card') || 
            element.classList.contains('app-item')) {
            
            element.draggable = true;
            element.classList.add('draggable-item');
            
            // Add drag event listeners
            element.addEventListener('dragstart', (e) => this.handleDragStart(e));
            element.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
            // Add visual drag handle
            if (!element.querySelector('.drag-handle')) {
                const dragHandle = document.createElement('div');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
                dragHandle.title = 'Drag to reorganize';
                element.appendChild(dragHandle);
            }
        }
    }

    /**
     * Create drop zones for categories
     */
    createDropZones() {
        // Create category drop zones
        this.createCategoryDropZones();
        
        // Create general drop zones
        this.createGeneralDropZones();
    }

    /**
     * Create category-specific drop zones
     */
    createCategoryDropZones() {
        const categoryContainer = document.getElementById('category-drop-zones');
        if (!categoryContainer) {
            const container = document.createElement('div');
            container.id = 'category-drop-zones';
            container.className = 'drop-zones-container';
            container.style.display = 'none';
            document.body.appendChild(container);
        }

        // Load categories and create drop zones
        this.loadCategoriesForDropZones();
    }

    /**
     * Load categories for drop zones
     */
    async loadCategoriesForDropZones() {
        try {
            const customData = await this.dataManager.adapter.load('custom/categories_custom') || { categories: [] };
            const mergedApps = await this.dataManager.getMergedData('apps');
            const mergedBookmarks = await this.dataManager.getMergedData('bookmarks');

            // Get all unique categories
            const categories = new Set();
            customData.categories.forEach(cat => categories.add(cat.name));
            
            [...mergedApps.items, ...mergedBookmarks.items].forEach(item => {
                if (item.metadata?.merged?.category) {
                    categories.add(item.metadata.merged.category);
                }
            });

            // Create drop zones for each category
            const container = document.getElementById('category-drop-zones');
            if (container) {
                container.innerHTML = Array.from(categories).map(categoryName => `
                    <div class="drop-zone category-drop-zone" 
                         data-category="${categoryName}"
                         data-drop-type="category">
                        <div class="drop-zone-content">
                            <i class="fas fa-folder"></i>
                            <span class="drop-zone-title">${categoryName}</span>
                            <span class="drop-zone-hint">Drop items here to categorize</span>
                        </div>
                    </div>
                `).join('');

                // Add event listeners to drop zones
                container.querySelectorAll('.drop-zone').forEach(zone => {
                    zone.addEventListener('dragover', (e) => this.handleDragOver(e));
                    zone.addEventListener('drop', (e) => this.handleDrop(e));
                    zone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
                    zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                });
            }

        } catch (error) {
            console.error('Failed to load categories for drop zones:', error);
        }
    }

    /**
     * Create general drop zones
     */
    createGeneralDropZones() {
        const generalDropZones = [
            { id: 'favorites-drop-zone', title: 'Favorites', icon: 'star', type: 'favorite' },
            { id: 'archive-drop-zone', title: 'Archive', icon: 'archive', type: 'archive' },
            { id: 'trash-drop-zone', title: 'Delete', icon: 'trash', type: 'delete' }
        ];

        const container = document.getElementById('general-drop-zones');
        if (!container) {
            const generalContainer = document.createElement('div');
            generalContainer.id = 'general-drop-zones';
            generalContainer.className = 'drop-zones-container';
            generalContainer.style.display = 'none';
            document.body.appendChild(generalContainer);
        }

        const generalContainer = document.getElementById('general-drop-zones');
        generalContainer.innerHTML = generalDropZones.map(zone => `
            <div class="drop-zone general-drop-zone ${zone.type}-drop-zone" 
                 data-drop-type="${zone.type}">
                <div class="drop-zone-content">
                    <i class="fas fa-${zone.icon}"></i>
                    <span class="drop-zone-title">${zone.title}</span>
                    <span class="drop-zone-hint">Drop items here</span>
                </div>
            </div>
        `).join('');

        // Add event listeners to general drop zones
        generalContainer.querySelectorAll('.drop-zone').forEach(zone => {
            zone.addEventListener('dragover', (e) => this.handleDragOver(e));
            zone.addEventListener('drop', (e) => this.handleDrop(e));
            zone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Global drag and drop events
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('dragstart', (e) => this.showDropZones());
        document.addEventListener('dragend', (e) => this.hideDropZones());

        // Undo/Redo shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undoLastOperation();
            } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redoLastOperation();
            }
        });

        // Escape key to cancel drag
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.draggedItem) {
                this.cancelDrag();
            }
        });
    }

    /**
     * Handle drag start
     */
    handleDragStart(event) {
        this.draggedElement = event.target;
        
        // Extract item data
        const itemId = event.target.dataset.itemId;
        const itemName = event.target.querySelector('.card-title, .item-name')?.textContent || 'Unknown';
        const itemType = event.target.dataset.itemType || 'unknown';
        
        this.draggedItem = {
            id: itemId,
            name: itemName,
            type: itemType,
            element: event.target,
            originalParent: event.target.parentNode,
            originalPosition: Array.from(event.target.parentNode.children).indexOf(event.target)
        };

        // Set drag data
        event.dataTransfer.setData('text/plain', JSON.stringify({
            id: itemId,
            name: itemName,
            type: itemType
        }));

        // Add dragging class
        event.target.classList.add('dragging');
        
        // Create drag image
        this.createDragImage(event);
        
        // Show visual feedback
        this.feedback.showInfo(`Dragging "${itemName}"`);
    }

    /**
     * Handle drag end
     */
    handleDragEnd(event) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        
        this.draggedItem = null;
        this.draggedElement = null;
        
        // Remove drag-over classes from all drop zones
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over', 'drag-active');
        });
    }

    /**
     * Handle drag over
     */
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    /**
     * Handle drag enter
     */
    handleDragEnter(event) {
        if (event.target.classList.contains('drop-zone')) {
            event.target.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(event) {
        if (event.target.classList.contains('drop-zone')) {
            event.target.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop
     */
    async handleDrop(event) {
        event.preventDefault();
        
        if (!this.draggedItem) return;

        const dropZone = event.target.closest('.drop-zone');
        if (!dropZone) return;

        const dropType = dropZone.dataset.dropType;
        const category = dropZone.dataset.category;

        try {
            // Record operation for undo
            const operation = {
                type: 'move',
                itemId: this.draggedItem.id,
                itemName: this.draggedItem.name,
                fromCategory: await this.getItemCategory(this.draggedItem.id),
                toCategory: category,
                dropType: dropType,
                timestamp: new Date().toISOString()
            };

            // Perform the operation
            await this.performDropOperation(dropType, category, this.draggedItem);
            
            // Add to history
            this.dragOperationHistory.push(operation);
            
            // Remove drag-over class
            dropZone.classList.remove('drag-over');
            
            // Show success feedback
            this.feedback.showSuccess(`Moved "${this.draggedItem.name}" to ${category || dropType}`);
            
        } catch (error) {
            console.error('Failed to perform drop operation:', error);
            this.feedback.showError('Failed to move item');
        }
    }

    /**
     * Perform drop operation
     */
    async performDropOperation(dropType, category, item) {
        const organizationData = await this.dataManager.adapter.load('custom/organization_custom') || { customizations: [] };
        
        // Find or create customization for this item
        let customization = organizationData.customizations.find(c => c.id === item.id);
        
        if (!customization) {
            customization = {
                id: item.id,
                type: item.type,
                metadata: {}
            };
            organizationData.customizations.push(customization);
        }

        // Apply the operation
        switch (dropType) {
            case 'category':
                customization.metadata.category = category;
                break;
            case 'favorite':
                customization.metadata.favorite = true;
                break;
            case 'archive':
                customization.metadata.archived = true;
                break;
            case 'delete':
                // Mark for deletion
                customization.metadata.deleted = true;
                break;
        }

        customization.metadata.lastModified = new Date().toISOString();
        organizationData.lastUpdate = new Date().toISOString();

        // Save changes
        await this.dataManager.adapter.save('custom/organization_custom', organizationData);
        
        // Trigger merge
        await this.dataManager.performMerge();
        
        // Refresh UI
        await this.refreshUI();
    }

    /**
     * Create drag image
     */
    createDragImage(event) {
        const dragImage = event.target.cloneNode(true);
        dragImage.style.transform = 'rotate(5deg)';
        dragImage.style.opacity = '0.8';
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        dragImage.style.pointerEvents = 'none';
        
        document.body.appendChild(dragImage);
        
        event.dataTransfer.setDragImage(dragImage, 0, 0);
        
        // Remove drag image after a short delay
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 100);
    }

    /**
     * Show drop zones
     */
    showDropZones() {
        const categoryZones = document.getElementById('category-drop-zones');
        const generalZones = document.getElementById('general-drop-zones');
        
        if (categoryZones) {
            categoryZones.style.display = 'flex';
            categoryZones.classList.add('zones-visible');
        }
        
        if (generalZones) {
            generalZones.style.display = 'flex';
            generalZones.classList.add('zones-visible');
        }
    }

    /**
     * Hide drop zones
     */
    hideDropZones() {
        const categoryZones = document.getElementById('category-drop-zones');
        const generalZones = document.getElementById('general-drop-zones');
        
        if (categoryZones) {
            categoryZones.style.display = 'none';
            categoryZones.classList.remove('zones-visible');
        }
        
        if (generalZones) {
            generalZones.style.display = 'none';
            generalZones.classList.remove('zones-visible');
        }
    }

    /**
     * Cancel drag operation
     */
    cancelDrag() {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        
        this.draggedItem = null;
        this.draggedElement = null;
        this.hideDropZones();
        
        this.feedback.showInfo('Drag operation cancelled');
    }

    /**
     * Undo last operation
     */
    async undoLastOperation() {
        if (this.dragOperationHistory.length === 0) {
            this.feedback.showWarning('No operations to undo');
            return;
        }

        const operation = this.dragOperationHistory.pop();
        
        try {
            // Reverse the operation
            await this.reverseOperation(operation);
            this.feedback.showSuccess(`Undid: Moved "${operation.itemName}" back to ${operation.fromCategory || 'original location'}`);
        } catch (error) {
            console.error('Failed to undo operation:', error);
            this.feedback.showError('Failed to undo operation');
        }
    }

    /**
     * Redo last operation
     */
    async redoLastOperation() {
        // This would require a separate redo history
        this.feedback.showInfo('Redo functionality not yet implemented');
    }

    /**
     * Reverse an operation
     */
    async reverseOperation(operation) {
        const organizationData = await this.dataManager.adapter.load('custom/organization_custom') || { customizations: [] };
        
        const customization = organizationData.customizations.find(c => c.id === operation.itemId);
        if (!customization) return;

        // Reverse the operation
        switch (operation.dropType) {
            case 'category':
                customization.metadata.category = operation.fromCategory;
                break;
            case 'favorite':
                delete customization.metadata.favorite;
                break;
            case 'archive':
                delete customization.metadata.archived;
                break;
            case 'delete':
                delete customization.metadata.deleted;
                break;
        }

        customization.metadata.lastModified = new Date().toISOString();
        organizationData.lastUpdate = new Date().toISOString();

        // Save changes
        await this.dataManager.adapter.save('custom/organization_custom', organizationData);
        
        // Trigger merge
        await this.dataManager.performMerge();
        
        // Refresh UI
        await this.refreshUI();
    }

    /**
     * Get item category
     */
    async getItemCategory(itemId) {
        try {
            const mergedApps = await this.dataManager.getMergedData('apps');
            const mergedBookmarks = await this.dataManager.getMergedData('bookmarks');
            
            const item = [...mergedApps.items, ...mergedBookmarks.items].find(i => i.id === itemId);
            return item?.metadata?.merged?.category || 'Uncategorized';
        } catch (error) {
            console.error('Failed to get item category:', error);
            return 'Unknown';
        }
    }

    /**
     * Refresh UI after drag and drop operations
     */
    async refreshUI() {
        // Emit custom event for UI refresh
        const refreshEvent = new CustomEvent('dragDropRefresh', {
            detail: { timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(refreshEvent);
    }

    /**
     * Refresh drop zones
     */
    async refreshDropZones() {
        await this.loadCategoriesForDropZones();
    }

    /**
     * Get operation history
     */
    getOperationHistory() {
        return [...this.dragOperationHistory];
    }

    /**
     * Clear operation history
     */
    clearOperationHistory() {
        this.dragOperationHistory = [];
    }

    /**
     * Enable/disable drag and drop
     */
    setEnabled(enabled) {
        const draggableItems = document.querySelectorAll('.draggable-item');
        draggableItems.forEach(item => {
            item.draggable = enabled;
            item.classList.toggle('drag-disabled', !enabled);
        });
    }
}

module.exports = DragDropHandler;