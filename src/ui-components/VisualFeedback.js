/**
 * Visual Feedback System for Nexo Dashboard
 * Handles notifications, progress indicators, and visual feedback
 */

class VisualFeedback {
    constructor() {
        this.notifications = [];
        this.notificationId = 0;
        this.progressBars = new Map();
        this.loadingStates = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize visual feedback system
     */
    async initialize() {
        try {
            this.createNotificationContainer();
            this.createProgressContainer();
            this.createLoadingOverlay();
            this.setupEventListeners();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize VisualFeedback:', error);
            return false;
        }
    }

    /**
     * Create notification container
     */
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Create progress container
     */
    createProgressContainer() {
        let container = document.getElementById('progress-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'progress-container';
            container.className = 'progress-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Create loading overlay
     */
    createLoadingOverlay() {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading...</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close notifications with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearAllNotifications();
            }
        });

        // Auto-hide notifications after delay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('notification-close')) {
                const notificationId = parseInt(e.target.dataset.notificationId);
                this.hideNotification(notificationId);
            }
        });
    }

    /**
     * Show success notification
     */
    showSuccess(message, options = {}) {
        return this.showNotification(message, 'success', options);
    }

    /**
     * Show error notification
     */
    showError(message, options = {}) {
        return this.showNotification(message, 'error', { ...options, persistent: true });
    }

    /**
     * Show warning notification
     */
    showWarning(message, options = {}) {
        return this.showNotification(message, 'warning', options);
    }

    /**
     * Show info notification
     */
    showInfo(message, options = {}) {
        return this.showNotification(message, 'info', options);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', options = {}) {
        const notificationId = ++this.notificationId;
        const notification = {
            id: notificationId,
            message: message,
            type: type,
            timestamp: new Date().toISOString(),
            persistent: options.persistent || false,
            duration: options.duration || this.getDefaultDuration(type),
            icon: options.icon || this.getDefaultIcon(type),
            actions: options.actions || []
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto-hide if not persistent
        if (!notification.persistent) {
            setTimeout(() => {
                this.hideNotification(notificationId);
            }, notification.duration);
        }

        return notificationId;
    }

    /**
     * Render notification
     */
    renderNotification(notification) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notificationElement = document.createElement('div');
        notificationElement.className = `notification notification-${notification.type}`;
        notificationElement.dataset.notificationId = notification.id;
        notificationElement.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-${notification.icon}"></i>
                </div>
                <div class="notification-body">
                    <div class="notification-message">${notification.message}</div>
                    ${notification.actions.length > 0 ? `
                        <div class="notification-actions">
                            ${notification.actions.map(action => `
                                <button class="btn btn-sm btn-outline-${notification.type} notification-action"
                                        data-action="${action.id}">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <button class="notification-close" data-notification-id="${notification.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${!notification.persistent ? `
                <div class="notification-progress">
                    <div class="notification-progress-bar" style="animation-duration: ${notification.duration}ms;"></div>
                </div>
            ` : ''}
        `;

        // Add event listeners for actions
        notification.actions.forEach(action => {
            const actionBtn = notificationElement.querySelector(`[data-action="${action.id}"]`);
            if (actionBtn) {
                actionBtn.addEventListener('click', () => {
                    if (action.handler) {
                        action.handler();
                    }
                    this.hideNotification(notification.id);
                });
            }
        });

        container.appendChild(notificationElement);

        // Animate in
        setTimeout(() => {
            notificationElement.classList.add('notification-visible');
        }, 10);
    }

    /**
     * Hide notification
     */
    hideNotification(notificationId) {
        const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notificationElement) {
            notificationElement.classList.add('notification-hiding');
            setTimeout(() => {
                notificationElement.remove();
            }, 300);
        }

        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        this.notifications.forEach(notification => {
            this.hideNotification(notification.id);
        });
    }

    /**
     * Show progress bar
     */
    showProgress(id, options = {}) {
        const progressData = {
            id: id,
            title: options.title || 'Processing...',
            progress: options.progress || 0,
            indeterminate: options.indeterminate || false,
            cancellable: options.cancellable || false,
            onCancel: options.onCancel || null
        };

        this.progressBars.set(id, progressData);
        this.renderProgressBar(progressData);
        return id;
    }

    /**
     * Update progress bar
     */
    updateProgress(id, progress, title = null) {
        const progressData = this.progressBars.get(id);
        if (!progressData) return;

        progressData.progress = Math.min(100, Math.max(0, progress));
        if (title) progressData.title = title;

        this.renderProgressBar(progressData);

        // Auto-hide when complete
        if (progressData.progress >= 100) {
            setTimeout(() => {
                this.hideProgress(id);
            }, 1000);
        }
    }

    /**
     * Render progress bar
     */
    renderProgressBar(progressData) {
        const container = document.getElementById('progress-container');
        if (!container) return;

        let progressElement = document.getElementById(`progress-${progressData.id}`);
        if (!progressElement) {
            progressElement = document.createElement('div');
            progressElement.id = `progress-${progressData.id}`;
            progressElement.className = 'progress-item';
            container.appendChild(progressElement);
        }

        progressElement.innerHTML = `
            <div class="progress-header">
                <span class="progress-title">${progressData.title}</span>
                ${progressData.cancellable ? `
                    <button class="progress-cancel" data-progress-id="${progressData.id}">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar ${progressData.indeterminate ? 'indeterminate' : ''}">
                    <div class="progress-bar-fill" style="width: ${progressData.progress}%"></div>
                </div>
                ${!progressData.indeterminate ? `
                    <span class="progress-percentage">${Math.round(progressData.progress)}%</span>
                ` : ''}
            </div>
        `;

        // Add cancel handler
        if (progressData.cancellable) {
            const cancelBtn = progressElement.querySelector('.progress-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (progressData.onCancel) {
                        progressData.onCancel();
                    }
                    this.hideProgress(progressData.id);
                });
            }
        }
    }

    /**
     * Hide progress bar
     */
    hideProgress(id) {
        const progressElement = document.getElementById(`progress-${id}`);
        if (progressElement) {
            progressElement.classList.add('progress-hiding');
            setTimeout(() => {
                progressElement.remove();
            }, 300);
        }
        this.progressBars.delete(id);
    }

    /**
     * Show loading state
     */
    showLoading(id, options = {}) {
        const loadingData = {
            id: id,
            text: options.text || 'Loading...',
            overlay: options.overlay || false,
            element: options.element || null
        };

        this.loadingStates.set(id, loadingData);

        if (loadingData.overlay) {
            this.showLoadingOverlay(loadingData.text);
        } else if (loadingData.element) {
            this.showElementLoading(loadingData.element, loadingData.text);
        }

        return id;
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay(text = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('.loading-text').textContent = text;
            overlay.classList.add('loading-visible');
        }
    }

    /**
     * Show element loading
     */
    showElementLoading(element, text = 'Loading...') {
        if (!element) return;

        // Create loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.className = 'element-loading';
        loadingElement.innerHTML = `
            <div class="element-loading-content">
                <div class="element-loading-spinner"></div>
                <div class="element-loading-text">${text}</div>
            </div>
        `;

        // Position loading indicator
        const rect = element.getBoundingClientRect();
        loadingElement.style.position = 'absolute';
        loadingElement.style.top = `${rect.top + window.scrollY}px`;
        loadingElement.style.left = `${rect.left + window.scrollX}px`;
        loadingElement.style.width = `${rect.width}px`;
        loadingElement.style.height = `${rect.height}px`;

        document.body.appendChild(loadingElement);

        // Store reference for cleanup
        element.dataset.loadingElement = loadingElement.id = `loading-${Date.now()}`;
    }

    /**
     * Hide loading state
     */
    hideLoading(id) {
        const loadingData = this.loadingStates.get(id);
        if (!loadingData) return;

        if (loadingData.overlay) {
            this.hideLoadingOverlay();
        } else if (loadingData.element) {
            this.hideElementLoading(loadingData.element);
        }

        this.loadingStates.delete(id);
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('loading-visible');
        }
    }

    /**
     * Hide element loading
     */
    hideElementLoading(element) {
        if (!element) return;

        const loadingElementId = element.dataset.loadingElement;
        if (loadingElementId) {
            const loadingElement = document.getElementById(loadingElementId);
            if (loadingElement) {
                loadingElement.remove();
            }
            delete element.dataset.loadingElement;
        }
    }

    /**
     * Show confirmation dialog
     */
    showConfirmation(message, options = {}) {
        return new Promise((resolve) => {
            const confirmationId = this.showNotification(message, 'warning', {
                persistent: true,
                icon: 'question-circle',
                actions: [
                    {
                        id: 'confirm',
                        text: options.confirmText || 'Confirm',
                        handler: () => resolve(true)
                    },
                    {
                        id: 'cancel',
                        text: options.cancelText || 'Cancel',
                        handler: () => resolve(false)
                    }
                ]
            });
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(element, message, options = {}) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.top = `${rect.top - 35}px`;
        tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
        tooltip.style.transform = 'translateX(-50%)';

        document.body.appendChild(tooltip);

        // Auto-hide after delay
        setTimeout(() => {
            tooltip.remove();
        }, options.duration || 2000);
    }

    /**
     * Get default duration for notification type
     */
    getDefaultDuration(type) {
        const durations = {
            success: 3000,
            info: 4000,
            warning: 5000,
            error: 0 // Persistent
        };
        return durations[type] || 4000;
    }

    /**
     * Get default icon for notification type
     */
    getDefaultIcon(type) {
        const icons = {
            success: 'check-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle',
            error: 'exclamation-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Create pulse effect on element
     */
    pulseElement(element, options = {}) {
        if (!element) return;

        const pulseClass = options.type ? `pulse-${options.type}` : 'pulse';
        element.classList.add(pulseClass);

        setTimeout(() => {
            element.classList.remove(pulseClass);
        }, options.duration || 600);
    }

    /**
     * Highlight element
     */
    highlightElement(element, options = {}) {
        if (!element) return;

        const highlightClass = options.type ? `highlight-${options.type}` : 'highlight';
        element.classList.add(highlightClass);

        setTimeout(() => {
            element.classList.remove(highlightClass);
        }, options.duration || 2000);
    }

    /**
     * Animate element
     */
    animateElement(element, animation, options = {}) {
        if (!element) return;

        return new Promise((resolve) => {
            const animationClass = `animate-${animation}`;
            element.classList.add(animationClass);

            const handleAnimationEnd = () => {
                element.classList.remove(animationClass);
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };

            element.addEventListener('animationend', handleAnimationEnd);

            // Fallback timeout
            setTimeout(() => {
                if (element.classList.contains(animationClass)) {
                    element.classList.remove(animationClass);
                    element.removeEventListener('animationend', handleAnimationEnd);
                    resolve();
                }
            }, options.timeout || 2000);
        });
    }

    /**
     * Get current notifications
     */
    getNotifications() {
        return [...this.notifications];
    }

    /**
     * Get active progress bars
     */
    getProgressBars() {
        return new Map(this.progressBars);
    }

    /**
     * Get active loading states
     */
    getLoadingStates() {
        return new Map(this.loadingStates);
    }

    /**
     * Clear all feedback
     */
    clearAll() {
        this.clearAllNotifications();
        this.progressBars.forEach((_, id) => this.hideProgress(id));
        this.loadingStates.forEach((_, id) => this.hideLoading(id));
    }
}

module.exports = VisualFeedback;