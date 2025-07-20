const { ipcRenderer } = require('electron');

class NexoDashboardRenderer {
  constructor() {
    this.data = {
      apps: [],
      customApps: [],
      links: [],
      filteredItems: []
    };
        
    this.currentTab = 'applications';
    this.currentFilter = '';
    this.currentSort = 'name';
    this.searchTerm = '';
    this.gridSize = 'default';
    this.searchTimeout = null;
        
    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      this.loadUserPreferences();
      await this.loadData();
      this.updateUI();
      this.hideLoading();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Erro ao inicializar a aplica��o');
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Enhanced search functionality with debouncing
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
            
      // Clear previous timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
            
      // Debounce search for better performance
      this.searchTimeout = setTimeout(() => {
        this.filterAndSortItems();
      }, 300);
    });

    // Clear search button
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        this.searchTerm = '';
        this.filterAndSortItems();
      }
    });

    // Filter and sort
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.filterAndSortItems();
    });

    document.getElementById('sortBy').addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.filterAndSortItems();
    });

    // Refresh button
    document.getElementById('refreshButton').addEventListener('click', () => {
      this.refreshData();
    });

    // Footer buttons
    document.getElementById('aboutButton').addEventListener('click', () => {
      this.showAboutModal();
    });

    document.getElementById('settingsButton').addEventListener('click', () => {
      this.showSettings();
    });

    document.getElementById('helpButton').addEventListener('click', () => {
      this.toggleShortcutsHelp();
    });

    // Modal events
    document.getElementById('closeAboutModal').addEventListener('click', () => {
      this.hideModal('aboutModal');
    });

    document.getElementById('closeSettingsModal').addEventListener('click', () => {
      this.hideModal('settingsModal');
    });

    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e);
    });

    document.addEventListener('click', () => {
      this.hideContextMenu();
    });

    // IPC events
    ipcRenderer.on('refresh-data', () => {
      this.refreshData();
    });

    ipcRenderer.on('open-settings', () => {
      this.showSettings();
    });

    ipcRenderer.on('show-about', () => {
      this.showAboutModal();
    });

    // Grid size controls
    document.querySelectorAll('.grid-size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setGridSize(e.target.dataset.size);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
        case 'f':
          e.preventDefault();
          searchInput.focus();
          break;
        case 'r':
          e.preventDefault();
          this.refreshData();
          break;
        case '1':
          e.preventDefault();
          this.switchTab('applications');
          break;
        case '2':
          e.preventDefault();
          this.switchTab('bookmarks');
          break;
        case 'ArrowUp':
          if (e.shiftKey) {
            e.preventDefault();
            this.cycleGridSize(-1);
          }
          break;
        case 'ArrowDown':
          if (e.shiftKey) {
            e.preventDefault();
            this.cycleGridSize(1);
          }
          break;
        case 't':
          if (e.shiftKey) {
            e.preventDefault();
            this.toggleTheme();
          }
          break;
        case '?':
          e.preventDefault();
          this.toggleShortcutsHelp();
          break;
        }
      }
    });
  }

  async loadData() {
    try {
      this.showLoading();
            
      // Load apps and links in parallel
      const [appsResult, linksResult] = await Promise.all([
        ipcRenderer.invoke('load-apps'),
        ipcRenderer.invoke('load-links')
      ]);

      this.data.apps = appsResult.apps || [];
      this.data.customApps = appsResult.customApps || [];
      this.data.links = linksResult || [];

      // Populate category filters
      this.updateCategoryFilters();
            
      // Initial filter and sort
      this.filterAndSortItems();
            
      this.updateStats();
            
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Erro ao carregar dados');
    }
  }

  updateCategoryFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = new Set();
        
    if (this.currentTab === 'applications') {
      [...this.data.apps, ...this.data.customApps].forEach(app => {
        if (app.category) categories.add(app.category);
        if (app.tags) app.tags.forEach(tag => categories.add(tag));
      });
    } else {
      this.data.links.forEach(link => {
        if (link.category) categories.add(link.category);
        if (link.tags) link.tags.forEach(tag => categories.add(tag));
      });
    }

    // Clear existing options (except "All categories")
    categoryFilter.innerHTML = '<option value="">Todas as categorias</option>';
        
    // Add categories
    Array.from(categories).sort().forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  filterAndSortItems() {
    let items = [];
        
    if (this.currentTab === 'applications') {
      items = [...this.data.apps, ...this.data.customApps];
    } else {
      items = this.data.links;
    }

    // Apply search filter
    if (this.searchTerm) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(this.searchTerm) ||
                (item.category && item.category.toLowerCase().includes(this.searchTerm)) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(this.searchTerm)))
      );
    }

    // Apply category filter
    if (this.currentFilter) {
      items = items.filter(item => 
        item.category === this.currentFilter ||
                (item.tags && item.tags.includes(this.currentFilter))
      );
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (this.currentSort) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'category':
        return (a.category || '').localeCompare(b.category || '');
      case 'lastModified':
        return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
      default:
        return 0;
      }
    });

    this.data.filteredItems = items;
    this.renderItems();
    this.updateStats();
  }

  renderItems() {
    const container = this.currentTab === 'applications' ? 
      document.getElementById('appsGrid') : 
      document.getElementById('bookmarksGrid');

    container.innerHTML = '';

    if (this.data.filteredItems.length === 0) {
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();

    this.data.filteredItems.forEach(item => {
      const card = this.createCard(item);
      container.appendChild(card);
    });
  }

  createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.type = this.currentTab === 'applications' ? 'app' : 'link';
    card.dataset.path = item.path || item.url;

    const icon = this.getItemIcon(item);
    const tags = this.createTags(item.tags || []);
    const meta = this.getItemMeta(item);

    card.innerHTML = `
            <div class="card-header">
                <div class="card-icon">${icon}</div>
                <div class="card-info">
                    <div class="card-title">${this.escapeHtml(item.name)}</div>
                    <div class="card-subtitle">${this.escapeHtml(item.category || '')}</div>
                </div>
            </div>
            <div class="card-body">
                <div class="card-path">${this.escapeHtml(item.path || item.url || '')}</div>
            </div>
            <div class="card-footer">
                <div class="card-tags">${tags}</div>
                <div class="card-meta">${meta}</div>
            </div>
        `;

    // Add click event
    card.addEventListener('click', (e) => {
      if (e.button === 0) { // Left click
        this.handleItemClick(item);
      }
    });

    // Add right-click event
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, item);
    });

    // Add drag and drop functionality
    this.setupDragAndDrop(card, item);

    return card;
  }

  getItemIcon(item) {
    if (this.currentTab === 'applications') {
      // Try to find icon in assets
      const iconPath = `../assets/icons/apps/${item.name}.png`;
      return `<img src="${iconPath}" alt="${item.name}" onerror="this.parentElement.innerHTML='=�'">`;
    } else {
      // For bookmarks, use favicon if available
      if (item.favicon) {
        return `<img src="${item.favicon}" alt="${item.name}">`;
      }
      return '=';
    }
  }

  createTags(tags) {
    return tags.slice(0, 3).map(tag => {
      const category = this.getCategoryForTag(tag);
      return `<span class="card-tag" data-category="${category}" onclick="window.renderer.filterByTag('${this.escapeHtml(tag)}')">${this.escapeHtml(tag)}</span>`;
    }).join('');
  }

  getCategoryForTag(tag) {
    const categoryMap = {
      'development': ['code', 'programming', 'ide', 'development', 'dev', 'git', 'terminal'],
      'productivity': ['office', 'text', 'document', 'spreadsheet', 'presentation', 'note', 'task'],
      'system': ['system', 'admin', 'utility', 'tool', 'settings', 'config'],
      'entertainment': ['game', 'music', 'video', 'media', 'player', 'stream']
    };

    const lowerTag = tag.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerTag.includes(keyword))) {
        return category;
      }
    }
    return 'default';
  }

  filterByTag(tag) {
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.value = tag;
    this.currentFilter = tag;
    this.filterAndSortItems();
  }

  getItemMeta(item) {
    if (this.currentTab === 'applications') {
      return item.version || '';
    } else {
      return item.browser || '';
    }
  }

  async handleItemClick(item) {
    try {
      const card = event.currentTarget;
      card.classList.add('launching');
            
      this.updateStatus('A abrir...');
            
      if (this.currentTab === 'applications') {
        const result = await ipcRenderer.invoke('launch-app', item.path);
        if (result.success) {
          this.updateStatus('Aplica��o aberta');
          await ipcRenderer.invoke('log-message', 'info', `Launched app: ${item.name}`);
        } else {
          this.showError(`Erro ao abrir aplica��o: ${result.error}`);
        }
      } else {
        const result = await ipcRenderer.invoke('open-link', item.url);
        if (result.success) {
          this.updateStatus('Link aberto');
          await ipcRenderer.invoke('log-message', 'info', `Opened link: ${item.name}`);
        } else {
          this.showError(`Erro ao abrir link: ${result.error}`);
        }
      }
            
      setTimeout(() => {
        card.classList.remove('launching');
        this.updateStatus('Pronto');
      }, 1000);
            
    } catch (error) {
      console.error('Error handling item click:', error);
      this.showError('Erro ao abrir item');
    }
  }

  showContextMenu(event, item = null) {
    const contextMenu = document.getElementById('contextMenu');
        
    if (!item) {
      contextMenu.classList.add('hidden');
      return;
    }

    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    contextMenu.classList.remove('hidden');

    // Update context menu items
    const openItem = document.getElementById('openItem');
    const showInFolder = document.getElementById('showInFolder');

    openItem.onclick = () => {
      this.handleItemClick(item);
      this.hideContextMenu();
    };

    showInFolder.onclick = async () => {
      if (this.currentTab === 'applications' && item.path) {
        await ipcRenderer.invoke('show-in-folder', item.path);
      }
      this.hideContextMenu();
    };

    // Show/hide based on item type
    showInFolder.style.display = (this.currentTab === 'applications') ? 'flex' : 'none';
  }

  hideContextMenu() {
    document.getElementById('contextMenu').classList.add('hidden');
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    this.currentTab = tabName;
    this.updateCategoryFilters();
    this.filterAndSortItems();
  }

  async refreshData() {
    try {
      this.updateStatus('A atualizar dados...');
      await this.loadData();
      this.updateStatus('Dados atualizados');
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.showError('Erro ao atualizar dados');
    }
  }

  updateStats() {
    const totalApps = this.data.apps.length + this.data.customApps.length;
    const totalLinks = this.data.links.length;
    const filteredCount = this.data.filteredItems.length;

    if (this.currentTab === 'applications') {
      document.getElementById('appsCount').textContent = totalApps;
      document.getElementById('appsFilteredCount').textContent = filteredCount;
    } else {
      document.getElementById('bookmarksCount').textContent = totalLinks;
      document.getElementById('bookmarksFilteredCount').textContent = filteredCount;
    }
  }

  showLoading() {
    document.getElementById('loadingState').classList.remove('hidden');
  }

  hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
  }

  showEmptyState() {
    document.getElementById('emptyState').classList.remove('hidden');
  }

  hideEmptyState() {
    document.getElementById('emptyState').classList.add('hidden');
  }

  async showAboutModal() {
    const modal = document.getElementById('aboutModal');
        
    try {
      const appInfo = await ipcRenderer.invoke('get-app-info');
            
      document.getElementById('aboutVersion').textContent = appInfo.version;
      document.getElementById('appVersion').textContent = appInfo.version;
      document.getElementById('aboutPlatform').textContent = appInfo.platform;
      document.getElementById('aboutElectron').textContent = appInfo.electron;
      document.getElementById('aboutNode').textContent = appInfo.node;
            
    } catch (error) {
      console.error('Error loading app info:', error);
    }
        
    modal.classList.remove('hidden');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  showSettings() {
    const modal = document.getElementById('settingsModal');
        
    // Populate current settings
    this.populateSettings();
        
    modal.classList.remove('hidden');
  }

  populateSettings() {
    // Theme setting
    const themeSelect = document.getElementById('themeSelect');
    const currentTheme = localStorage.getItem('nexo-theme') || 'auto';
    themeSelect.value = currentTheme;

    // Grid size setting
    const gridSizeSelect = document.getElementById('gridSizeSelect');
    const currentGridSize = localStorage.getItem('nexo-grid-size') || 'default';
    gridSizeSelect.value = currentGridSize;

    // Search delay setting
    const searchDelayInput = document.getElementById('searchDelay');
    const currentSearchDelay = localStorage.getItem('nexo-search-delay') || '300';
    searchDelayInput.value = currentSearchDelay;

    // Auto refresh setting
    const autoRefreshCheckbox = document.getElementById('autoRefresh');
    const currentAutoRefresh = localStorage.getItem('nexo-auto-refresh') === 'true';
    autoRefreshCheckbox.checked = currentAutoRefresh;

    // Drag and drop setting
    const enableDragDropCheckbox = document.getElementById('enableDragDrop');
    const currentDragDrop = localStorage.getItem('nexo-drag-drop') !== 'false';
    enableDragDropCheckbox.checked = currentDragDrop;
  }

  saveSettings() {
    try {
      // Save theme setting
      const themeSelect = document.getElementById('themeSelect');
      const newTheme = themeSelect.value;
      localStorage.setItem('nexo-theme', newTheme);
      this.applyTheme(newTheme);

      // Save grid size setting
      const gridSizeSelect = document.getElementById('gridSizeSelect');
      const newGridSize = gridSizeSelect.value;
      localStorage.setItem('nexo-grid-size', newGridSize);
      this.setGridSize(newGridSize);

      // Save search delay setting
      const searchDelayInput = document.getElementById('searchDelay');
      const newSearchDelay = searchDelayInput.value;
      localStorage.setItem('nexo-search-delay', newSearchDelay);

      // Save auto refresh setting
      const autoRefreshCheckbox = document.getElementById('autoRefresh');
      localStorage.setItem('nexo-auto-refresh', autoRefreshCheckbox.checked.toString());

      // Save drag and drop setting
      const enableDragDropCheckbox = document.getElementById('enableDragDrop');
      localStorage.setItem('nexo-drag-drop', enableDragDropCheckbox.checked.toString());

      this.hideModal('settingsModal');
      this.updateStatus('Configurações guardadas');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Erro ao guardar configurações');
    }
  }

  resetSettings() {
    if (confirm('Tem a certeza que quer repor todas as configurações aos valores padrão?')) {
      // Clear all settings from localStorage
      localStorage.removeItem('nexo-theme');
      localStorage.removeItem('nexo-grid-size');
      localStorage.removeItem('nexo-search-delay');
      localStorage.removeItem('nexo-auto-refresh');
      localStorage.removeItem('nexo-drag-drop');

      // Apply defaults
      this.applyTheme('auto');
      this.setGridSize('default');

      // Repopulate the modal
      this.populateSettings();

      this.updateStatus('Configurações repostas aos valores padrão');
    }
  }

  showError(message) {
    // Simple error display - could be enhanced with a proper toast system
    this.updateStatus(`Erro: ${message}`);
    console.error(message);
  }

  updateStatus(message) {
    document.getElementById('itemsStatus').textContent = message;
        
    // Clear status after 3 seconds
    setTimeout(() => {
      document.getElementById('itemsStatus').textContent = 'Pronto';
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setGridSize(size) {
    // Remove active class from all buttons
    document.querySelectorAll('.grid-size-btn').forEach(btn => {
      btn.classList.remove('active');
    });
        
    // Add active class to clicked button
    document.querySelector(`[data-size="${size}"]`).classList.add('active');
        
    // Get grid containers
    const appsGrid = document.getElementById('appsGrid');
    const bookmarksGrid = document.getElementById('bookmarksGrid');
        
    // Remove all grid size classes
    const grids = [appsGrid, bookmarksGrid];
    grids.forEach(grid => {
      grid.classList.remove('compact', 'comfortable', 'list');
      if (size !== 'default') {
        grid.classList.add(size);
      }
    });
        
    this.gridSize = size;
        
    // Save preference in localStorage
    localStorage.setItem('nexo-grid-size', size);
  }

  cycleGridSize(direction) {
    const sizes = ['default', 'compact', 'comfortable', 'list'];
    const currentIndex = sizes.indexOf(this.gridSize);
    let newIndex = currentIndex + direction;
        
    if (newIndex < 0) newIndex = sizes.length - 1;
    if (newIndex >= sizes.length) newIndex = 0;
        
    this.setGridSize(sizes[newIndex]);
  }

  loadUserPreferences() {
    // Load grid size preference
    const savedGridSize = localStorage.getItem('nexo-grid-size');
    if (savedGridSize && ['default', 'compact', 'comfortable', 'list'].includes(savedGridSize)) {
      this.setGridSize(savedGridSize);
    }

    // Load theme preference
    this.loadTheme();
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('nexo-theme');
    const osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
    let theme = 'auto';
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      theme = savedTheme;
    }

    this.applyTheme(theme, osPrefersDark);
  }

  applyTheme(theme, osPrefersDark = null) {
    if (osPrefersDark === null) {
      osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const body = document.body;
        
    // Remove existing theme attributes
    body.removeAttribute('data-theme');
        
    switch (theme) {
    case 'light':
      body.setAttribute('data-theme', 'light');
      break;
    case 'dark':
      body.setAttribute('data-theme', 'dark');
      break;
    case 'auto':
      // Let CSS media query handle it
      break;
    }

    // Save theme preference
    localStorage.setItem('nexo-theme', theme);
  }

  toggleTheme() {
    const currentTheme = localStorage.getItem('nexo-theme') || 'auto';
    const themes = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
        
    this.applyTheme(themes[nextIndex]);
        
    // Update status
    this.updateStatus(`Tema alterado para: ${themes[nextIndex]}`);
  }

  setupDragAndDrop(card, item) {
    card.draggable = true;
        
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', (e) => {
      card.classList.remove('dragging');
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
            
      if (!card.classList.contains('dragging')) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', (e) => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
            
      try {
        const draggedItem = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (draggedItem && draggedItem !== item) {
          this.handleCardReorder(draggedItem, item);
        }
      } catch (error) {
        console.error('Error handling drop:', error);
      }
    });
  }

  handleCardReorder(draggedItem, targetItem) {
    // Find indices of dragged and target items
    const draggedIndex = this.data.filteredItems.findIndex(item => 
      (item.name === draggedItem.name && item.path === draggedItem.path) ||
            (item.name === draggedItem.name && item.url === draggedItem.url)
    );
        
    const targetIndex = this.data.filteredItems.findIndex(item => 
      (item.name === targetItem.name && item.path === targetItem.path) ||
            (item.name === targetItem.name && item.url === targetItem.url)
    );

    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      // Reorder items in the filtered array
      const reorderedItems = [...this.data.filteredItems];
      const [removed] = reorderedItems.splice(draggedIndex, 1);
      reorderedItems.splice(targetIndex, 0, removed);
            
      this.data.filteredItems = reorderedItems;
      this.renderItems();
            
      this.updateStatus(`Movido ${draggedItem.name} para nova posição`);
    }
  }

  toggleShortcutsHelp() {
    const hint = document.getElementById('shortcutsHint');
    hint.classList.toggle('visible');
        
    // Auto-hide after 5 seconds
    if (hint.classList.contains('visible')) {
      setTimeout(() => {
        hint.classList.remove('visible');
      }, 5000);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.renderer = new NexoDashboardRenderer();
});

// Handle window focus
window.addEventListener('focus', () => {
  // Optionally refresh data when window regains focus
});

// Handle window resize
window.addEventListener('resize', () => {
  // Optionally adjust layout
});

// Listen for OS theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('nexo-theme') === 'auto' || !localStorage.getItem('nexo-theme')) {
    window.renderer.loadTheme();
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NexoDashboardRenderer;
}