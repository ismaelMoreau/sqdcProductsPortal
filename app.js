// Global state
let allProducts = [];
let filteredProducts = [];
let activeFilters = new Set([CONFIG.TYPES.INDICA, CONFIG.TYPES.SATIVA, CONFIG.TYPES.HYBRIDE, CONFIG.TYPES.ALL]);
let searchQuery = '';
let sortBy = 'name';
let productTypeChanges = {}; // Store product type changes by SKU
let productOrder = {}; // Store custom product order by grid ID
let dragState = {
    draggedElement: null,
    draggedSku: null,
    sourceGridId: null,
    dropTarget: null
};

// Section manager state
let sectionsConfig = [];
let currentWall = 'front';
let storeId = '77074'; // Default store ID
let currentEditingSectionId = null;

// Files index is loaded from files-index-data.js (embedded to avoid CORS issues)
// window.FILES_INDEX is available globally

// Helper function for localStorage error handling
function handleStorageError(error, context = '') {
    console.error(`Error saving to localStorage${context ? ' (' + context + ')' : ''}:`, error);
    if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded. Consider clearing old data.');
        showValidationError('Erreur: Espace de stockage insuffisant');
    }
}

// ============================================
// Section Configuration Functions
// ============================================

function loadSectionsConfig() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SECTIONS);
        if (saved) {
            sectionsConfig = JSON.parse(saved);
            
            // Validate sections have new structure (storageType instead of storage.doors)
            const hasValidStructure = sectionsConfig.every(s => 
                s.storageType && s.storageCount !== undefined
            );
            
            if (!hasValidStructure) {
                console.log('Invalid section structure detected - resetting to defaults');
                sectionsConfig = JSON.parse(JSON.stringify(CONFIG.SECTION_CONFIG.DEFAULT_SECTIONS));
                saveSectionsConfig();
            } else {
                console.log('Sections config loaded:', sectionsConfig.length, 'sections');
            }
        } else {
            // Use default sections on first load
            sectionsConfig = JSON.parse(JSON.stringify(CONFIG.SECTION_CONFIG.DEFAULT_SECTIONS));
            saveSectionsConfig();
            console.log('Using default sections config');
        }
    } catch (error) {
        console.error('Error loading sections config:', error);
        sectionsConfig = JSON.parse(JSON.stringify(CONFIG.SECTION_CONFIG.DEFAULT_SECTIONS));
    }
}

function saveSectionsConfig() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SECTIONS, JSON.stringify(sectionsConfig));
        console.log('Sections config saved');
    } catch (error) {
        handleStorageError(error, 'sections config');
    }
}

function getSectionById(sectionId) {
    return sectionsConfig.find(s => s.id === sectionId);
}

function addSection(sectionData) {
    sectionsConfig.push(sectionData);
    saveSectionsConfig();
    console.log('Section added:', sectionData.name);
}

function removeSection(sectionId) {
    sectionsConfig = sectionsConfig.filter(s => s.id !== sectionId);
    saveSectionsConfig();
    console.log('Section removed:', sectionId);
}

function updateSection(sectionId, updates) {
    const index = sectionsConfig.findIndex(s => s.id === sectionId);
    if (index !== -1) {
        sectionsConfig[index] = { ...sectionsConfig[index], ...updates };
        saveSectionsConfig();
        console.log('Section updated:', sectionId);
    }
}

function generateSectionId() {
    return 'section_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSectionName(formats, strainTypes) {
    // Convert format keys to labels
    const formatLabels = formats.map(f => CONFIG.SECTION_CONFIG.AVAILABLE_FORMATS[f] || f);
    
    // Check if all strain types are selected
    const allTypes = Object.values(CONFIG.SECTION_CONFIG.STRAIN_TYPES).slice(0, 3); // Exclude 'Tous'
    const hasAllTypes = allTypes.every(type => strainTypes.includes(type));
    
    let name = '';
    
    if (hasAllTypes || strainTypes.length === 0) {
        name = 'Tous types';
    } else {
        name = strainTypes.join(' • ');
    }
    
    name += ' ' + formatLabels.join(' • ');
    
    return name;
}

function getSectionsByWall(wallPosition) {
    return sectionsConfig.filter(s => s.wallPosition === wallPosition && s.visible);
}

function loadStoreId() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.STORE_ID);
        if (saved) {
            storeId = saved;
        }
    } catch (error) {
        console.error('Error loading store ID:', error);
    }
}

function saveStoreId(id) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.STORE_ID, id);
        storeId = id;
    } catch (error) {
        handleStorageError(error, 'store ID');
    }
}

// Migration removed - using dynamic sections only

// Load products
async function loadProducts() {
    // Load from embedded data (products-data.js)
    if (window.PRODUCTS_DATA && window.PRODUCTS_DATA.length > 0) {
        allProducts = [...window.PRODUCTS_DATA]; // Create a copy
        loadNewProductsFromStorage(); // Load user-added products
        applyProductTypeChanges();
        loadProductFormatChanges();
        loadThcChanges();
        loadCbdChanges();
        filteredProducts = [...allProducts];
        renderProducts();
        updateCounts();
    } else {
        document.querySelector('main').innerHTML = '<div class="empty-state">Erreur lors du chargement des produits</div>';
    }
}

function applyProductTypeChanges() {
    // Apply saved type changes to products
    allProducts.forEach(product => {
        if (productTypeChanges[product.sku]) {
            product.type = productTypeChanges[product.sku];
        }
    });
}

// Check if a product matches current filters
function productMatchesFilters(product) {
    // Check type filter
    const typeMatch = activeFilters.has('all') || activeFilters.has(product.type);

    // Check search query
    const searchMatch = !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase());

    return typeMatch && searchMatch;
}

// Filter products based on active filters and search
function filterProducts() {
    filteredProducts = allProducts.filter(productMatchesFilters);

    sortProducts();
    renderProducts();
    updateCounts();
}

// Sort products
function sortProducts() {
    switch(sortBy) {
        case 'name':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'brand':
            filteredProducts.sort((a, b) => a.brand.localeCompare(b.brand));
            break;
        case 'thc-desc':
            filteredProducts.sort((a, b) => {
                const aThc = parseFloat(a.manualThc) || a.thcMax;
                const bThc = parseFloat(b.manualThc) || b.thcMax;
                return bThc - aThc;
            });
            break;
        case 'thc-asc':
            filteredProducts.sort((a, b) => {
                const aThc = parseFloat(a.manualThc) || a.thcMin;
                const bThc = parseFloat(b.manualThc) || b.thcMin;
                return aThc - bThc;
            });
            break;
    }
}

// Create product card HTML
function createProductCard(product, isVisible = true) {
    const thcValue = product.manualThc || product.thcMax;
    const cbdValue = product.manualCbd || product.cbdMax || 0;

    // Use product type directly for card styling
    const cardType = product.type;

    // Show format for non-3.5g products
    const showFormat = product.format !== CONFIG.FORMATS.SMALL;
    const formatDisplay = product.manualFormat || product.format;

    // Show CBD if it exists
    const showCbd = cbdValue > 0;

    // Add hidden class if product doesn't match current filters
    const hiddenClass = isVisible ? '' : ' card-hidden';

    return `
        <div class="product-card${hiddenClass}"
             data-type="${cardType}"
             data-sku="${product.sku}"
             role="button"
             tabindex="0"
             aria-label="${product.name}, ${thcValue}% THC, cliquez pour modifier">
            <div class="product-name">${product.name}</div>
            <div class="product-thc">
                <div class="thc-value">${thcValue}%</div>
            </div>
            ${showFormat ? `<div class="product-format">${formatDisplay}</div>` : ''}
            ${showCbd ? `<div class="product-cbd">CBD: ${cbdValue}%</div>` : ''}
        </div>
    `;
}

// Update scroll arrows visibility
function updateScrollArrows(grid) {
    if (!grid) return;

    const wrapper = grid.closest('.grid-wrapper');
    if (!wrapper) return;

    const leftArrow = wrapper.querySelector('.scroll-arrow-left');
    const rightArrow = wrapper.querySelector('.scroll-arrow-right');

    if (!leftArrow || !rightArrow) return;

    const canScrollLeft = grid.scrollLeft > 0;
    const canScrollRight = grid.scrollLeft < (grid.scrollWidth - grid.clientWidth - 1);

    if (canScrollLeft) {
        leftArrow.classList.add('visible');
    } else {
        leftArrow.classList.remove('visible');
    }

    if (canScrollRight) {
        rightArrow.classList.add('visible');
    } else {
        rightArrow.classList.remove('visible');
    }
}

// Setup scroll arrows for a grid
function setupScrollArrows(grid) {
    if (!grid) return;

    const wrapper = grid.closest('.grid-wrapper');
    if (!wrapper) return;

    const leftArrow = wrapper.querySelector('.scroll-arrow-left');
    const rightArrow = wrapper.querySelector('.scroll-arrow-right');

    if (!leftArrow || !rightArrow) return;

    // Update arrows on scroll
    grid.addEventListener('scroll', () => updateScrollArrows(grid));

    // Click handlers
    leftArrow.addEventListener('click', () => {
        grid.scrollBy({ left: -280, behavior: 'smooth' }); // 4 cards width
    });

    rightArrow.addEventListener('click', () => {
        grid.scrollBy({ left: 280, behavior: 'smooth' }); // 4 cards width
    });

    // Initial update
    updateScrollArrows(grid);
}

// Display configuration moved to config.js - access via CONFIG.DRAWER_CONFIG and CONFIG.DOOR_CONFIG



// Helper function to get section name from grid ID
function getSectionFromGridId(gridId) {
    if (gridId.includes('indica')) return 'indica';
    if (gridId.includes('sativa')) return 'sativa';
    if (gridId.includes('hybride')) return 'hybride';
    if (gridId.includes('oz28')) return 'oz28';
    return 'indica'; // fallback
}

// Helper function: Create a standalone card (label without drawer)
function createStandaloneCard(product) {
    const thcValue = product.manualThc || product.thcMax;
    const cbdValue = product.manualCbd || product.cbd || 0;
    const showCbd = cbdValue > 0;
    
    // Check if product matches current filters
    const isVisible = productMatchesFilters(product);
    
    const card = document.createElement('div');
    card.className = isVisible ? 'drawer-product-card standalone' : 'drawer-product-card standalone card-hidden';
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true'); // Now draggable for reordering
    card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
    
    card.innerHTML = `
        <div class="drawer-product-name">${product.name}</div>
        <div class="drawer-product-thc">
            <div class="drawer-thc-value">${thcValue}%</div>
        </div>
        ${showCbd ? `<div class="drawer-product-cbd">${cbdValue}%</div>` : ''}
    `;
    
    // Drag handlers for reordering
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
    
    // Click handler to open modal
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModalBySku(product.sku);
    });
    
    // Keyboard accessibility
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openEditModalBySku(product.sku);
        }
    });
    
    return card;
}

// Helper function: Create a door product card (for doors)
function createDoorProductCard(product) {
    const thcValue = product.manualThc || product.thcMax;
    const cbdValue = product.manualCbd || product.cbd || 0;
    const showCbd = cbdValue > 0;
    
    // Check if product matches current filters
    const isVisible = productMatchesFilters(product);
    
    const card = document.createElement('div');
    card.className = isVisible ? 'door-product-card' : 'door-product-card card-hidden';
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true'); // Now draggable for reordering
    card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
    
    card.innerHTML = `
        <div class="door-product-name">${product.name}</div>
        <div class="door-product-thc">
            <div class="door-thc-value">${thcValue}%</div>
        </div>
        ${showCbd ? `<div class="door-product-cbd">${cbdValue}%</div>` : ''}
    `;
    
    // Drag handlers for reordering
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
    
    // Click handler to open modal
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModalBySku(product.sku);
    });
    
    // Keyboard accessibility
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openEditModalBySku(product.sku);
        }
    });
    
    return card;
}

// Helper function: Create a standalone door card (label without door)
function createStandaloneDoorCard(product) {
    const thcValue = product.manualThc || product.thcMax;
    const cbdValue = product.manualCbd || product.cbd || 0;
    const showCbd = cbdValue > 0;
    
    // Check if product matches current filters
    const isVisible = productMatchesFilters(product);
    
    const card = document.createElement('div');
    card.className = isVisible ? 'door-product-card standalone' : 'door-product-card standalone card-hidden';
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true'); // Now draggable for reordering
    card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
    
    card.innerHTML = `
        <div class="door-product-name">${product.name}</div>
        <div class="door-product-thc">
            <div class="door-thc-value">${thcValue}%</div>
        </div>
        ${showCbd ? `<div class="door-product-cbd">${cbdValue}%</div>` : ''}
    `;
    
    // Drag handlers for reordering
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
    
    // Click handler to open modal
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModalBySku(product.sku);
    });
    
    // Keyboard accessibility
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openEditModalBySku(product.sku);
        }
    });
    
    return card;
}

// Helper function: Create a door element with products (supports empty doors)
function createDoor(products, doorIndex) {
    const door = document.createElement('div');
    door.className = 'door';
    door.dataset.doorIndex = doorIndex;
    
    // Add empty class if no products
    if (!products || products.length === 0) {
        door.classList.add('empty');
    }
    
    // Create door handle
    const handle = document.createElement('div');
    handle.className = 'door-handle';
    
    // Create labels container (shown when closed) - 4 cards stacked vertically
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'door-labels';
    
    // Create stock display container (shown when open)
    const stockDisplay = document.createElement('div');
    stockDisplay.className = 'door-stock-display';
    
    // Add empty state message if no products
    if (!products || products.length === 0) {
        const emptyLabel = document.createElement('div');
        emptyLabel.className = 'door-empty-label';
        emptyLabel.textContent = 'Vide';
        labelsContainer.appendChild(emptyLabel);
        door.appendChild(labelsContainer);
        door.appendChild(stockDisplay);
        door.appendChild(handle);
        return door;
    }
    
    // Add product labels (square cards with THC% and CBD) and stock info
    products.forEach(product => {
        // Create card for labels container
        const card = createDoorProductCard(product);
        labelsContainer.appendChild(card);
        
        // Add stock info for open state
        const stockItem = document.createElement('div');
        stockItem.className = 'door-stock-item';
        
        const stockName = document.createElement('div');
        stockName.className = 'door-stock-name';
        stockName.textContent = product.name;
        
        const stockCount = document.createElement('div');
        stockCount.className = 'door-stock-count';
        stockCount.textContent = '0'; // Stock count set to 0 for now
        stockCount.dataset.sku = product.sku;
        
        stockItem.appendChild(stockName);
        stockItem.appendChild(stockCount);
        stockDisplay.appendChild(stockItem);
    });
    
    door.appendChild(labelsContainer);
    door.appendChild(stockDisplay);
    door.appendChild(handle);
    
    // Mark door as not draggable
    door.setAttribute('draggable', 'false');
    
    // Toggle door on click (exactly like drawers)
    door.addEventListener('click', (e) => {
        door.classList.toggle('open');
    });
    
    return door;
}

// Helper function: Create a drawer element with products (supports empty drawers)
function createDrawer(products, drawerIndex) {
    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.dataset.drawerIndex = drawerIndex;
    
    // Add empty class if no products
    if (!products || products.length === 0) {
        drawer.classList.add('empty');
    }
    
    // Create drawer handle
    const handle = document.createElement('div');
    handle.className = 'drawer-handle';
    
    // Create labels container (shown when closed) - square cards side by side
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'drawer-labels';
    
    // Create stock display container (shown when open)
    const stockDisplay = document.createElement('div');
    stockDisplay.className = 'drawer-stock-display';
    
    // Add empty state message if no products
    if (!products || products.length === 0) {
        const emptyLabel = document.createElement('div');
        emptyLabel.className = 'drawer-empty-label';
        emptyLabel.textContent = 'Vide';
        labelsContainer.appendChild(emptyLabel);
        return drawer.appendChild(labelsContainer), drawer.appendChild(stockDisplay), drawer.appendChild(handle), drawer;
    }
    
    // Add product labels (square cards with THC% and CBD) and stock info
    products.forEach(product => {
        // Get THC value
        const thcValue = product.manualThc || product.thcMax;
        // Get CBD value
        const cbdValue = product.manualCbd || product.cbd || 0;
        const showCbd = cbdValue > 0;
        
        // Check if product matches current filters
        const isVisible = productMatchesFilters(product);
        
        // Create square card label (clickable to open modal)
        const card = document.createElement('div');
        card.className = isVisible ? 'drawer-product-card' : 'drawer-product-card card-hidden';
        card.dataset.type = product.type;
        card.dataset.sku = product.sku;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('draggable', 'true'); // Now draggable for reordering
        card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
        
        card.innerHTML = `
            <div class="drawer-product-name">${product.name}</div>
            <div class="drawer-product-thc">
                <div class="drawer-thc-value">${thcValue}%</div>
            </div>
            ${showCbd ? `<div class="drawer-product-cbd">${cbdValue}%</div>` : ''}
        `;
        
        // Drag handlers for reordering
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
        
        // Click handler to open modal
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModalBySku(product.sku);
        });
        
        // Keyboard accessibility
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                openEditModalBySku(product.sku);
            }
        });
        
        labelsContainer.appendChild(card);
        
        // Add stock info for open state
        const stockItem = document.createElement('div');
        stockItem.className = 'drawer-stock-item';
        
        const stockName = document.createElement('div');
        stockName.className = 'drawer-stock-name';
        stockName.textContent = product.name;
        
        const stockCount = document.createElement('div');
        stockCount.className = 'drawer-stock-count';
        stockCount.textContent = '0'; // Stock count set to 0 for now
        stockCount.dataset.sku = product.sku;
        
        stockItem.appendChild(stockName);
        stockItem.appendChild(stockCount);
        stockDisplay.appendChild(stockItem);
    });
    
    drawer.appendChild(labelsContainer);
    drawer.appendChild(stockDisplay);
    drawer.appendChild(handle);
    
    // Mark drawer as not draggable
    drawer.setAttribute('draggable', 'false');
    
    // Toggle drawer on click
    drawer.addEventListener('click', (e) => {
        drawer.classList.toggle('open');
    });
    
    return drawer;
}

// Legacy static rendering functions removed - using dynamic sections only

// Main render function - uses dynamic sections only
function renderProducts() {
    renderProductsDynamic();
    initializeDragAndDrop();
}

function renderProductsDynamic() {
    // Render each section dynamically
    sectionsConfig.forEach(section => {
        // Skip if not visible or not on current wall
        if (!section.visible || section.wallPosition !== currentWall) return;
        
        const grid = document.getElementById(`${section.id}-grid`);
        if (!grid) return;
        
        // Get all products for this section
        const products = getProductsForSection(section, 'all');
        
        // Render based on storage type
        if (section.storageType === 'door') {
            renderDoorsGridDynamic(grid, products, section);
        } else if (section.storageType === 'drawer') {
            renderDrawersGridDynamic(grid, products, section);
        } else {
            // Fallback to regular grid
            renderGridSection(grid, products);
        }
    });
    
    // Update counts
    updateDynamicSectionCounts();
    
    // Update scroll arrows
    document.querySelectorAll('.products-grid').forEach(grid => {
        updateScrollArrows(grid);
    });
}

function renderDoorsGridDynamic(grid, products, section) {
    grid.innerHTML = '';
    
    const orderedProducts = applyCustomOrder(products, grid.id);
    const maxDoors = section.storageCount || 12;
    
    // Create all doors
    for (let i = 0; i < maxDoors; i++) {
        const startIndex = i * CONFIG.DOOR_CONFIG.productsPerDoor;
        const doorProds = orderedProducts.slice(startIndex, startIndex + CONFIG.DOOR_CONFIG.productsPerDoor);
        const door = createDoor(doorProds, i);
        grid.appendChild(door);
    }
    
    // Add remaining products as standalone cards
    const remainingStartIndex = maxDoors * CONFIG.DOOR_CONFIG.productsPerDoor;
    if (remainingStartIndex < orderedProducts.length) {
        const remainingProducts = orderedProducts.slice(remainingStartIndex);
        remainingProducts.forEach(product => {
            const card = createStandaloneDoorCard(product);
            grid.appendChild(card);
        });
    }
}

function renderDrawersGridDynamic(grid, products, section) {
    grid.innerHTML = '';
    
    const orderedProducts = applyCustomOrder(products, grid.id);
    const maxDrawers = section.storageCount || 12;
    
    // Create all drawers
    for (let i = 0; i < maxDrawers; i++) {
        const startIndex = i * CONFIG.DRAWER_CONFIG.productsPerDrawer;
        const drawerProds = orderedProducts.slice(startIndex, startIndex + CONFIG.DRAWER_CONFIG.productsPerDrawer);
        const drawer = createDrawer(drawerProds, i);
        grid.appendChild(drawer);
    }
    
    // Add remaining products as standalone cards
    const remainingStartIndex = maxDrawers * CONFIG.DRAWER_CONFIG.productsPerDrawer;
    if (remainingStartIndex < orderedProducts.length) {
        const remainingProducts = orderedProducts.slice(remainingStartIndex);
        remainingProducts.forEach(product => {
            const card = createStandaloneCard(product);
            grid.appendChild(card);
        });
    }
}

// Update product counts
function updateCounts() {
    // Dynamic sections only - no fallback
    updateDynamicSectionCounts();
}

// Modal functions for editing cards (using SKU for unique identification)
function openEditModalBySku(sku) {
    // Find product in allProducts using SKU (unique identifier)
    const product = allProducts.find(p => p.sku === sku);
    if (!product) return;

    const modal = document.getElementById('editModal');
    const modalProductName = document.getElementById('modalProductName');
    const modalSectionSelect = document.getElementById('modalSectionSelect');
    const modalThcInput = document.getElementById('modalThcInput');
    const modalCbdInput = document.getElementById('modalCbdInput');
    const modalFormatSelect = document.getElementById('modalFormatSelect');

    // Store the SKU and previous focus for later use
    modal.dataset.editingSku = sku;
    modal.dataset.previousFocus = sku;

    // Set modal content
    modalProductName.textContent = product.name;

    // Populate strain type select
    populateStrainTypeSelect();
    
    // Populate format select with available formats
    populateFormatSelect();

    // Set current strain type
    modalSectionSelect.value = product.type;

    // Set current format
    const currentFormat = product.manualFormat || product.format;
    modalFormatSelect.value = currentFormat;

    // Set current THC value
    const currentThc = product.manualThc || product.thcMax;
    modalThcInput.value = currentThc;

    // Set current CBD value
    const currentCbd = product.manualCbd || '';
    modalCbdInput.value = currentCbd;

    // Show modal
    modal.classList.add('active');

    // Focus first form element for accessibility
    setTimeout(() => {
        modalSectionSelect.focus();
    }, 100);
}



function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('active');
    delete modal.dataset.editingSku;

    // Return focus to the previously focused element if it exists
    if (modal.dataset.previousFocus) {
        const previousElement = document.querySelector(`[data-sku="${modal.dataset.previousFocus}"]`);
        if (previousElement) {
            previousElement.focus();
        }
        delete modal.dataset.previousFocus;
    }
}

// Populate strain type select with available strain types
function populateStrainTypeSelect() {
    const modalSectionSelect = document.getElementById('modalSectionSelect');
    modalSectionSelect.innerHTML = '';
    
    // Add options for each strain type
    Object.values(CONFIG.SECTION_CONFIG.STRAIN_TYPES).forEach(type => {
        if (type === 'Tous') return; // Skip 'Tous' option
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        modalSectionSelect.appendChild(option);
    });
}

// Populate format select with available formats from configuration
function populateFormatSelect() {
    const modalFormatSelect = document.getElementById('modalFormatSelect');
    modalFormatSelect.innerHTML = '';
    
    // Use available formats from config
    Object.entries(CONFIG.SECTION_CONFIG.AVAILABLE_FORMATS).forEach(([key, label]) => {
        const option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        modalFormatSelect.appendChild(option);
    });
}

// Validation functions
function validateThcValue(value) {
    const thc = parseFloat(value);
    if (isNaN(thc)) {
        return { valid: false, error: 'La valeur THC doit être un nombre' };
    }
    if (thc < CONFIG.VALIDATION.THC_MIN || thc > CONFIG.VALIDATION.THC_MAX) {
        return { valid: false, error: `THC doit être entre ${CONFIG.VALIDATION.THC_MIN}% et ${CONFIG.VALIDATION.THC_MAX}%` };
    }
    return { valid: true, value: thc };
}

function validateCbdValue(value) {
    const cbd = parseFloat(value);
    if (isNaN(cbd)) {
        return { valid: false, error: 'La valeur CBD doit être un nombre' };
    }
    if (cbd < CONFIG.VALIDATION.CBD_MIN || cbd > CONFIG.VALIDATION.CBD_MAX) {
        return { valid: false, error: `CBD doit être entre ${CONFIG.VALIDATION.CBD_MIN}% et ${CONFIG.VALIDATION.CBD_MAX}%` };
    }
    return { valid: true, value: cbd };
}

function showValidationError(message) {
    // Create or update error message element
    let errorDiv = document.getElementById('modalError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'modalError';
        errorDiv.style.cssText = 'color: #ff6b6b; background-color: rgba(255, 107, 107, 0.1); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #ff6b6b;';
        const modalBody = document.querySelector('.modal-body');
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function clearValidationError() {
    const errorDiv = document.getElementById('modalError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Helper: Get and validate modal form values
function getModalFormValues() {
    const newSection = document.getElementById('modalSectionSelect').value;
    const newThc = document.getElementById('modalThcInput').value.trim();
    const newCbd = document.getElementById('modalCbdInput').value.trim();
    const modalFormatSelect = document.getElementById('modalFormatSelect');
    const newFormat = modalFormatSelect.value;

    // Validate THC if provided
    if (newThc) {
        const validation = validateThcValue(newThc);
        if (!validation.valid) {
            return { valid: false, error: validation.error };
        }
    }

    // Validate CBD if provided
    if (newCbd) {
        const validation = validateCbdValue(newCbd);
        if (!validation.valid) {
            return { valid: false, error: validation.error };
        }
    }

    return {
        valid: true,
        section: newSection,
        thc: newThc ? parseFloat(newThc) : null,
        cbd: newCbd ? parseFloat(newCbd) : null,
        format: newFormat
    };
}

// Helper: Find product by SKU
function findProductBySku(sku) {
    return allProducts.find(p => p.sku === sku);
}

// Helper: Update product type and format
function updateProductSection(product, newType, newFormat) {
    // Update type if changed
    if (newType !== product.type) {
        product.type = newType;
        saveProductTypeChange(product.sku, newType);
    }

    // Update format with the specific selected value
    if (product.format !== newFormat) {
        product.format = newFormat;
        saveProductFormatChange(product.sku, newFormat);
    }
}

// Helper: Refresh display after product changes
function refreshDisplay() {
    filteredProducts = allProducts.filter(product => {
        const typeMatch = activeFilters.has(CONFIG.TYPES.ALL) || activeFilters.has(product.type);
        const searchMatch = !searchQuery ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.brand.toLowerCase().includes(searchQuery.toLowerCase());
        return typeMatch && searchMatch;
    });

    sortProducts();
    renderProducts();
    updateCounts();
}

// Main save function - now simplified
function saveCardChanges() {
    const modal = document.getElementById('editModal');
    const sku = modal.dataset.editingSku;

    if (!sku) {
        showValidationError('Erreur: Produit non identifié');
        return;
    }

    clearValidationError();

    // Get and validate form data
    const formData = getModalFormValues();
    if (!formData.valid) {
        showValidationError(formData.error);
        return;
    }

    // Find product
    const product = findProductBySku(sku);
    if (!product) {
        showValidationError('Erreur: Produit introuvable');
        return;
    }

    // Update THC if provided
    if (formData.thc !== null) {
        product.manualThc = formData.thc.toString();
    }

    // Update CBD if provided
    if (formData.cbd !== null) {
        product.manualCbd = formData.cbd.toString();
    }

    // Update section/type and format
    updateProductSection(product, formData.section, formData.format);

    // Save changes and close modal
    saveThcChanges();
    saveCbdChanges();
    closeEditModal();

    // Refresh display to show changes
    refreshDisplay();
}

function saveThcChanges() {
    try {
        const thcChanges = {};
        allProducts.forEach(product => {
            if (product.manualThc) {
                thcChanges[product.sku] = product.manualThc;
            }
        });
        localStorage.setItem(CONFIG.STORAGE_KEYS.THC_CHANGES, JSON.stringify(thcChanges));
    } catch (error) {
        handleStorageError(error, 'THC changes');
    }
}

function loadThcChanges() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.THC_CHANGES);
        if (saved) {
            const thcChanges = JSON.parse(saved);
            allProducts.forEach(product => {
                if (thcChanges[product.sku]) {
                    product.manualThc = thcChanges[product.sku];
                }
            });
        }
    } catch (error) {
        console.error('Error loading THC changes:', error);
    }
}

function saveCbdChanges() {
    try {
        const cbdChanges = {};
        allProducts.forEach(product => {
            if (product.manualCbd) {
                cbdChanges[product.sku] = product.manualCbd;
            }
        });
        localStorage.setItem(CONFIG.STORAGE_KEYS.CBD_CHANGES, JSON.stringify(cbdChanges));
    } catch (error) {
        handleStorageError(error, 'CBD changes');
    }
}

function loadCbdChanges() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.CBD_CHANGES);
        if (saved) {
            const cbdChanges = JSON.parse(saved);
            allProducts.forEach(product => {
                if (cbdChanges[product.sku]) {
                    product.manualCbd = cbdChanges[product.sku];
                }
            });
        }
    } catch (error) {
        console.error('Error loading CBD changes:', error);
    }
}

function saveProductTypeChange(sku, newType) {
    try {
        productTypeChanges[sku] = newType;
        localStorage.setItem(CONFIG.STORAGE_KEYS.TYPE_CHANGES, JSON.stringify(productTypeChanges));
    } catch (error) {
        handleStorageError(error, 'product type change');
    }
}

function loadProductTypeChanges() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.TYPE_CHANGES);
        if (saved) {
            productTypeChanges = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading product type changes:', error);
        productTypeChanges = {};
    }
}

function saveProductFormatChange(sku, newFormat) {
    let formatChanges = {};
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.FORMAT_CHANGES);
        if (saved) {
            formatChanges = JSON.parse(saved);
        }

        formatChanges[sku] = newFormat;
        localStorage.setItem(CONFIG.STORAGE_KEYS.FORMAT_CHANGES, JSON.stringify(formatChanges));
    } catch (error) {
        handleStorageError(error, 'format change');
    }
}

function loadProductFormatChanges() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.FORMAT_CHANGES);
        if (saved) {
            const formatChanges = JSON.parse(saved);
            allProducts.forEach(product => {
                if (formatChanges[product.sku]) {
                    product.format = formatChanges[product.sku];
                }
            });
        }
    } catch (error) {
        console.error('Error loading format changes:', error);
    }
}

// Drag-and-drop functions - Simple swap approach
function saveProductOrder() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCT_ORDER, JSON.stringify(productOrder));
    } catch (error) {
        handleStorageError(error, 'product order');
    }
}

function loadProductOrder() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCT_ORDER);
        if (saved) {
            productOrder = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading product order:', error);
        productOrder = {};
    }
}

function applyCustomOrder(products, gridId) {
    if (!productOrder[gridId] || productOrder[gridId].length === 0) {
        return products;
    }

    // Create a map of SKU to product
    const productMap = new Map(products.map(p => [p.sku, p]));

    // Separate ordered and unordered products
    const ordered = [];
    const unordered = [];

    productOrder[gridId].forEach(sku => {
        if (productMap.has(sku)) {
            ordered.push(productMap.get(sku));
            productMap.delete(sku);
        }
    });

    // Add any products not in the saved order
    productMap.forEach(product => unordered.push(product));

    return [...ordered, ...unordered];
}

function swapElements(elem1, elem2) {
    // Create a temporary marker
    const temp = document.createElement('div');

    // Insert marker before elem1
    elem1.parentNode.insertBefore(temp, elem1);

    // Move elem1 to elem2's position
    elem2.parentNode.insertBefore(elem1, elem2);

    // Move elem2 to marker's position (where elem1 was)
    temp.parentNode.insertBefore(elem2, temp);

    // Remove marker
    temp.parentNode.removeChild(temp);
}

function handleDragStart(e) {
    // Support all card types: regular, door, and drawer cards
    const card = e.target.closest('.product-card, .door-product-card, .drawer-product-card');
    if (!card) return;

    const grid = card.closest('.products-grid');
    if (!grid) return;

    dragState.draggedElement = card;
    dragState.draggedSku = card.dataset.sku;
    dragState.sourceGridId = grid.id;

    // Add visual feedback
    setTimeout(() => {
        card.classList.add('dragging');
    }, 0);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragState.draggedSku);
}

function handleDragEnd() {
    const card = dragState.draggedElement;
    const dropTarget = dragState.dropTarget;

    if (card) {
        card.classList.remove('dragging');
    }

    // Perform the swap only on drop if we have a valid target
    if (dropTarget && card && dropTarget !== card) {
        swapElements(card, dropTarget);

        // Save the new order after swap
        if (dragState.sourceGridId) {
            const grid = document.getElementById(dragState.sourceGridId);
            if (grid) {
                // Query all card types
                const cards = Array.from(grid.querySelectorAll('.product-card, .door-product-card, .drawer-product-card'));
                const newOrder = cards.map(c => c.dataset.sku);
                productOrder[dragState.sourceGridId] = newOrder;
                saveProductOrder();
            }
        }
    }

    // Remove all visual feedback from all card types
    document.querySelectorAll('.product-card, .door-product-card, .drawer-product-card').forEach(c => c.classList.remove('drag-over'));
    document.querySelectorAll('.products-grid').forEach(g => g.classList.remove('drag-active'));

    // Reset drag state
    dragState.draggedElement = null;
    dragState.draggedSku = null;
    dragState.sourceGridId = null;
    dragState.dropTarget = null;
}

function handleDragOver(e) {
    e.preventDefault();

    if (!dragState.draggedElement) return;

    const card = e.target.closest('.product-card, .door-product-card, .drawer-product-card');
    const grid = e.target.closest('.products-grid');

    if (!grid || !dragState.sourceGridId) return;

    // Only allow drop in the same grid
    if (grid.id !== dragState.sourceGridId) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }

    e.dataTransfer.dropEffect = 'move';
    grid.classList.add('drag-active');

    // Track the current drop target (but don't swap yet)
    if (card && card !== dragState.draggedElement) {
        dragState.dropTarget = card;
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // The swap will be handled in handleDragEnd
    return false;
}

function handleDragEnter(e) {
    const card = e.target.closest('.product-card, .door-product-card, .drawer-product-card');
    if (card && card !== dragState.draggedElement) {
        card.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const card = e.target.closest('.product-card, .door-product-card, .drawer-product-card');
    if (card) {
        card.classList.remove('drag-over');
    }
}

function initializeDragAndDrop() {
    document.querySelectorAll('.product-card').forEach(card => {
        card.setAttribute('draggable', 'true');

        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
    });
}


// Tooltip functions (using SKU for unique identification)
function showTooltipBySku(sku, event) {
    // Find product in allProducts using SKU (unique identifier)
    const product = allProducts.find(p => p.sku === sku);
    if (!product) return;

    const tooltip = document.getElementById('productTooltip');
    const thcValue = product.manualThc || `${product.thcMin}-${product.thcMax}`;
    const cbdValue = product.manualCbd || '';

    // Update tooltip content
    document.getElementById('tooltipName').textContent = product.name;
    document.getElementById('tooltipBrand').textContent = product.brand;
    document.getElementById('tooltipFormat').textContent = product.format || '';
    document.getElementById('tooltipSku').textContent = `SKU: ${product.sku}`;
    document.getElementById('tooltipThc').textContent = `${thcValue}%`;

    // Show/hide CBD section
    const cbdSection = document.getElementById('tooltipCbdSection');
    if (cbdValue) {
        cbdSection.style.display = 'block';
        document.getElementById('tooltipCbd').textContent = `${cbdValue}%`;
    } else {
        cbdSection.style.display = 'none';
    }

    // Position tooltip
    tooltip.classList.add('active');

    // Position based on mouse location
    const updatePosition = (e) => {
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    };

    updatePosition(event);

    // Update position on mouse move
    const card = event.target.closest('.product-card');
    if (card) {
        card.onmousemove = updatePosition;
    }
}

function hideTooltip() {
    const tooltip = document.getElementById('productTooltip');
    tooltip.classList.remove('active');
}


// Fuzzy search: find files that match any word from product name
function findMatchingFilesInIndex(product, folder) {
    // Get list of files for this folder from index (loaded from files-index-data.js)
    const folderFiles = window.FILES_INDEX[folder] || [];

    if (folderFiles.length === 0) {
        console.log('No files in index for folder:', folder);
        return [];
    }

    // Extract words from product name (lowercase, min 3 chars)
    const removeAccents = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const productWords = removeAccents(product.name.toLowerCase())
        .split(/[\s\-_]+/)
        .filter(word => word.length >= 3);

    console.log('Searching for product:', product.name);
    console.log('Search words:', productWords);
    console.log('Available files:', folderFiles.length);

    // Find files that contain ANY of the product words
    const matchingFiles = [];

    folderFiles.forEach(filename => {
        const filenameLower = removeAccents(filename.toLowerCase());

        // Check if filename contains any of the product words
        for (const word of productWords) {
            if (filenameLower.includes(word)) {
                matchingFiles.push({
                    filename: filename,
                    path: `fiche_produits/${folder}/${filename}`,
                    matchedWord: word
                });
                break; // Don't add same file multiple times
            }
        }
    });

    console.log('Matching files found:', matchingFiles.length);

    return matchingFiles;
}

function openImageViewer(sku) {
    const product = allProducts.find(p => p.sku === sku);
    if (!product) return;

    const modal = document.getElementById('imageModal');
    const modalTitle = document.getElementById('imageModalTitle');
    const modalImg = document.getElementById('imageModalImg');
    const modalPdf = document.getElementById('imageModalPdf');
    const modalError = document.getElementById('imageModalError');
    const modalFileSelector = document.getElementById('imageModalFileSelector');

    // Set title
    modalTitle.textContent = product.name;

    // Hide all content
    modalImg.style.display = 'none';
    modalPdf.style.display = 'none';
    modalError.style.display = 'none';

    // Show modal
    modal.classList.add('active');

    // Get folder for this product
    const folder = getProductFolder(product);
    if (!folder) {
        modalError.style.display = 'block';
        return;
    }

    // Find matching files using fuzzy search on the index
    const matchingFiles = findMatchingFilesInIndex(product, folder);

    if (matchingFiles.length === 0) {
        // No matches found
        modalError.style.display = 'block';
    } else if (matchingFiles.length === 1) {
        // Exactly one match - display it directly
        displayFile(matchingFiles[0].path);
    } else {
        // Multiple matches - show selection UI
        showFileSelector(matchingFiles);
    }
}

function getProductFolder(product) {
    let folder = '';

    if (product.format === CONFIG.FORMATS.LARGE) {
        folder = 'dried_flower_15_28g';
    } else if (product.format === CONFIG.FORMATS.SMALL) {
        if (product.type === CONFIG.TYPES.INDICA) {
            folder = 'dried_flower_indica_35g';
        } else if (product.type === CONFIG.TYPES.SATIVA) {
            folder = 'dried_flower_sativa_35g';
        } else if (product.type === CONFIG.TYPES.HYBRIDE) {
            folder = 'dried_flower_hybrid_35g';
        }
    } else {
        if (product.type === CONFIG.TYPES.INDICA) {
            folder = 'dried_flower_indica_35g';
        } else if (product.type === CONFIG.TYPES.SATIVA) {
            folder = 'dried_flower_sativa_35g';
        } else if (product.type === CONFIG.TYPES.HYBRIDE) {
            folder = 'dried_flower_hybrid_35g';
        }
    }

    return folder;
}

function showFileSelector(files) {
    const modalFileSelector = document.getElementById('imageModalFileSelector');
    const modalFileList = document.getElementById('imageModalFileList');

    // Clear previous list
    modalFileList.innerHTML = '';

    // Create radio buttons for each file
    files.forEach((file, index) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'ficheProduit';
        radio.value = file.path;
        radio.id = `file_${index}`;

        if (index === 0) radio.checked = true; // Select first by default

        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${file.filename}`));
        modalFileList.appendChild(label);

        // Add click handler to highlight selected
        label.addEventListener('click', () => {
            document.querySelectorAll('.file-list label').forEach(l => l.classList.remove('selected'));
            label.classList.add('selected');
        });

        // Mark first as selected
        if (index === 0) label.classList.add('selected');
    });

    modalFileSelector.style.display = 'block';
}

function displayFile(path) {
    console.log('displayFile called with:', path);

    const modalImg = document.getElementById('imageModalImg');
    const modalPdf = document.getElementById('imageModalPdf');
    const modalFileSelector = document.getElementById('imageModalFileSelector');
    const modalError = document.getElementById('imageModalError');
    const modalLoading = document.getElementById('imageModalLoading');

    // Hide everything first
    modalFileSelector.style.display = 'none';
    modalError.style.display = 'none';
    modalLoading.style.display = 'none';
    modalImg.style.display = 'none';
    modalPdf.style.display = 'none';

    const isPdf = path.toLowerCase().endsWith('.pdf');

    console.log('File type:', isPdf ? 'PDF' : 'Image');

    if (isPdf) {
        modalPdf.src = path;
        modalPdf.style.display = 'block';
        console.log('PDF src set:', modalPdf.src);
    } else {
        modalImg.src = path;
        modalImg.style.display = 'block';
        console.log('Image src set:', modalImg.src);

        // Add onload/onerror handlers
        modalImg.onload = () => console.log('Image loaded successfully');
        modalImg.onerror = () => console.error('Image failed to load:', path);
    }
}

function closeImageViewer() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('active');

    // Clear both image and PDF sources to stop loading
    const modalImg = document.getElementById('imageModalImg');
    const modalPdf = document.getElementById('imageModalPdf');
    modalImg.src = '';
    modalPdf.src = '';

    // Hide all elements
    modalImg.style.display = 'none';
    modalPdf.style.display = 'none';
    document.getElementById('imageModalLoading').style.display = 'none';
    document.getElementById('imageModalError').style.display = 'none';
    document.getElementById('imageModalFileSelector').style.display = 'none';
}

function openImageViewerFromModal() {
    const editModal = document.getElementById('editModal');
    const sku = editModal.dataset.editingSku;

    if (!sku) return;

    // Close edit modal first
    closeEditModal();

    // Then open image viewer
    openImageViewer(sku);
}

// ============================================
// Section Manager Modal Functions
// ============================================

function openSectionManagerModal() {
    const modal = document.getElementById('sectionManagerModal');
    
    // Render sections list
    renderSectionsList();
    
    // Show modal
    modal.classList.add('active');
}

function closeSectionManagerModal() {
    const modal = document.getElementById('sectionManagerModal');
    modal.classList.remove('active');
}

function saveSectionManagerChanges() {
    // Save sections config
    saveSectionsConfig();
    
    // Regenerate HTML structure
    regenerateSectionsHTML();
    
    // Re-render products
    renderProducts();
    
    closeSectionManagerModal();
    
    console.log('Section manager changes saved');
}

function renderSectionsList() {
    const sectionsList = document.getElementById('sectionsList');
    if (!sectionsList) return;
    
    sectionsList.innerHTML = '';
    
    // Get sections for current wall (from modal tabs)
    const currentWallTab = document.querySelector('#sectionManagerModal .wall-tab.active');
    const currentWall = currentWallTab ? currentWallTab.dataset.wall : 'front';
    const filteredSections = sectionsConfig.filter(s => s.wallPosition === currentWall);
    
    if (filteredSections.length === 0) {
        sectionsList.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">Aucune section sur ce mur</p>';
        return;
    }
    
    filteredSections.forEach(section => {
        const sectionItem = createSectionItemHTML(section);
        sectionsList.appendChild(sectionItem);
    });
}

function createSectionItemHTML(section) {
    const item = document.createElement('div');
    item.className = 'section-item';
    item.dataset.sectionId = section.id;
    
    // Build details string
    const formats = section.formats.map(f => CONFIG.SECTION_CONFIG.AVAILABLE_FORMATS[f] || f).join(', ');
    const strains = section.strainTypes.join(', ');
    const storageIcon = section.storageType === 'door' ? '🚪' : '📦';
    const storageText = section.storageType === 'door' ? 'portes' : 'tiroirs';
    
    item.innerHTML = `
        <div class="section-item-info">
            <div class="section-item-name">${section.name}</div>
            <div class="section-item-details">
                ${formats} • ${strains} • ${storageIcon} ${section.storageCount} ${storageText}
            </div>
        </div>
        <div class="section-item-actions">
            <button class="btn-edit-section" data-section-id="${section.id}">✏️ Éditer</button>
        </div>
    `;
    
    // Add click handler
    item.querySelector('.btn-edit-section').addEventListener('click', (e) => {
        e.stopPropagation();
        openSectionEditorModal(section.id);
    });
    
    return item;
}

// ============================================
// Section Editor Modal Functions
// ============================================

function openSectionEditorModal(sectionId = null) {
    const modal = document.getElementById('sectionEditorModal');
    const title = document.getElementById('sectionEditorTitle');
    const deleteBtn = document.getElementById('sectionEditorDeleteBtn');
    
    currentEditingSectionId = sectionId;
    
    if (sectionId) {
        // Edit existing section
        const section = getSectionById(sectionId);
        if (!section) {
            console.error('Section not found:', sectionId);
            return;
        }
        title.textContent = 'Éditer la section';
        deleteBtn.style.display = 'block';
        populateSectionEditor(section);
    } else {
        // Create new section
        title.textContent = 'Nouvelle section';
        deleteBtn.style.display = 'none';
        resetSectionEditor();
    }
    
    modal.classList.add('active');
}

function closeSectionEditorModal() {
    const modal = document.getElementById('sectionEditorModal');
    modal.classList.remove('active');
    currentEditingSectionId = null;
}

function populateSectionEditor(section) {
    // Name (readonly display)
    document.getElementById('sectionNameDisplay').value = section.name;
    
    // Formats
    document.querySelectorAll('#formatCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = section.formats.includes(cb.value);
    });
    
    // Strain types
    document.querySelectorAll('#strainTypeCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = section.strainTypes.includes(cb.value);
    });
    
    // Storage type (radio button)
    document.querySelector(`input[name="storageType"][value="${section.storageType}"]`).checked = true;
    
    // Storage count
    document.getElementById('storageCount').value = section.storageCount;
    
    // Wall position
    document.querySelector(`input[name="wallPosition"][value="${section.wallPosition}"]`).checked = true;
    
    updateSectionNamePreview();
}

function resetSectionEditor() {
    // Clear name display
    document.getElementById('sectionNameDisplay').value = '';
    
    // Uncheck all checkboxes
    document.querySelectorAll('#formatCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#strainTypeCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Reset storage to defaults (door type, 12 count)
    document.querySelector('input[name="storageType"][value="door"]').checked = true;
    document.getElementById('storageCount').value = 12;
    
    // Reset wall position
    document.querySelector('input[name="wallPosition"][value="front"]').checked = true;
    
    updateSectionNamePreview();
}

// No longer needed - removed updateStorageCountsState() function

function updateSectionNamePreview() {
    // Get selected formats
    const formats = Array.from(document.querySelectorAll('#formatCheckboxes input:checked'))
        .map(cb => cb.value);
    
    // Get selected strain types
    const strainTypes = Array.from(document.querySelectorAll('#strainTypeCheckboxes input:checked'))
        .map(cb => cb.value);
    
    // Generate name
    const name = formats.length > 0 && strainTypes.length > 0 
        ? generateSectionName(formats, strainTypes)
        : '';
    
    // Update display
    document.getElementById('sectionNameDisplay').value = name;
}

function saveSectionEditor() {
    // Get selected formats
    const formats = Array.from(document.querySelectorAll('#formatCheckboxes input:checked'))
        .map(cb => cb.value);
    
    if (formats.length === 0) {
        alert('Au moins un format doit être sélectionné');
        return;
    }
    
    // Get selected strain types
    const strainTypes = Array.from(document.querySelectorAll('#strainTypeCheckboxes input:checked'))
        .map(cb => cb.value);
    
    if (strainTypes.length === 0) {
        alert('Au moins un type de souche doit être sélectionné');
        return;
    }
    
    // Get storage config (single type and count)
    const storageType = document.querySelector('input[name="storageType"]:checked').value;
    const storageCount = parseInt(document.getElementById('storageCount').value) || 12;
    
    // Get wall position
    const wallPosition = document.querySelector('input[name="wallPosition"]:checked').value;
    
    // Generate name automatically
    const name = generateSectionName(formats, strainTypes);
    
    // Create section data
    const sectionData = {
        id: currentEditingSectionId || generateSectionId(),
        name,
        formats,
        strainTypes,
        storageType,
        storageCount,
        wallPosition,
        visible: true,
        order: currentEditingSectionId ? 
            getSectionById(currentEditingSectionId).order : 
            sectionsConfig.length + 1
    };
    
    if (currentEditingSectionId) {
        // Update existing
        updateSection(currentEditingSectionId, sectionData);
    } else {
        // Add new
        addSection(sectionData);
    }
    
    // Re-render sections list in the modal
    renderSectionsList();
    
    // Only regenerate HTML if the section is on the currently displayed wall
    if (sectionData.wallPosition === currentWall) {
        // Regenerate the HTML structure
        regenerateSectionsHTML();
        
        // Re-render products in the new sections
        renderProducts();
    }
    
    closeSectionEditorModal();
}

function deleteSectionEditor() {
    if (!currentEditingSectionId) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette section?')) {
        const deletedSection = getSectionById(currentEditingSectionId);
        const wasOnCurrentWall = deletedSection && deletedSection.wallPosition === currentWall;
        
        removeSection(currentEditingSectionId);
        renderSectionsList();
        
        // Only regenerate HTML if the deleted section was on the currently displayed wall
        if (wasOnCurrentWall) {
            // Regenerate the HTML structure
            regenerateSectionsHTML();
            
            // Re-render products
            renderProducts();
        }
        
        closeSectionEditorModal();
    }
}

function generateFormCheckboxes() {
    // Formats
    const formatCheckboxes = document.getElementById('formatCheckboxes');
    if (formatCheckboxes) {
        formatCheckboxes.innerHTML = '';
        Object.entries(CONFIG.SECTION_CONFIG.AVAILABLE_FORMATS).forEach(([key, label]) => {
            const labelEl = document.createElement('label');
            labelEl.className = 'checkbox-label';
            labelEl.innerHTML = `
                <input type="checkbox" value="${key}">
                <span>${label}</span>
            `;
            formatCheckboxes.appendChild(labelEl);
        });
    }
    
    // Strain types
    const strainTypeCheckboxes = document.getElementById('strainTypeCheckboxes');
    if (strainTypeCheckboxes) {
        strainTypeCheckboxes.innerHTML = '';
        Object.entries(CONFIG.SECTION_CONFIG.STRAIN_TYPES).forEach(([key, label]) => {
            if (key === 'ALL') return; // Skip 'Tous' option for sections
            const labelEl = document.createElement('label');
            labelEl.className = 'checkbox-label';
            labelEl.innerHTML = `
                <input type="checkbox" value="${label}">
                <span>${label}</span>
            `;
            strainTypeCheckboxes.appendChild(labelEl);
        });
    }
}

function switchWallView(wallPosition) {
    currentWall = wallPosition;
    
    // Update button states
    document.querySelectorAll('.wall-nav-btn').forEach(btn => {
        if (btn.dataset.wall === wallPosition) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Regenerate HTML for the selected wall
    regenerateSectionsHTML();
    
    // Re-render products
    renderProducts();
    
    console.log('Switched to wall:', wallPosition);
}

// ============================================
// Dynamic HTML Generation Functions
// ============================================

function regenerateSectionsHTML() {
    const main = document.querySelector('main');
    if (!main) {
        console.error('Main element not found');
        return;
    }
    
    main.innerHTML = '';
    
    // Filter sections by current wall and visible status
    const visibleSections = sectionsConfig
        .filter(s => s.visible && s.wallPosition === currentWall)
        .sort((a, b) => a.order - b.order);
    
    console.log(`Generating ${visibleSections.length} sections for wall: ${currentWall}`);
    
    // Separate door sections (top) and drawer sections (bottom)
    const doorSections = visibleSections.filter(s => s.storageType === 'door');
    const drawerSections = visibleSections.filter(s => s.storageType === 'drawer');
    
    // Create row for door sections (top)
    if (doorSections.length > 0) {
        const doorsRow = document.createElement('div');
        doorsRow.className = 'sections-row-doors';
        doorsRow.id = 'doorsRow';
        
        // Add left arrow
        const leftArrow = document.createElement('div');
        leftArrow.className = 'row-scroll-arrow row-scroll-arrow-left';
        leftArrow.innerHTML = '‹';
        leftArrow.addEventListener('click', () => {
            doorsRow.scrollBy({ left: -420, behavior: 'smooth' }); // Scroll by section width + gap
        });
        doorsRow.appendChild(leftArrow);
        
        // Add door sections
        doorSections.forEach(section => {
            const sectionElement = generateSectionHTML(section);
            doorsRow.appendChild(sectionElement);
        });
        
        // Add right arrow
        const rightArrow = document.createElement('div');
        rightArrow.className = 'row-scroll-arrow row-scroll-arrow-right';
        rightArrow.innerHTML = '›';
        rightArrow.addEventListener('click', () => {
            doorsRow.scrollBy({ left: 420, behavior: 'smooth' }); // Scroll by section width + gap
        });
        doorsRow.appendChild(rightArrow);
        
        // Add scroll event to show/hide arrows
        doorsRow.addEventListener('scroll', () => updateRowScrollArrows(doorsRow));
        
        main.appendChild(doorsRow);
        
        // Initial arrow visibility
        setTimeout(() => updateRowScrollArrows(doorsRow), 100);
    }
    
    // Create row for drawer sections (bottom)
    if (drawerSections.length > 0) {
        const drawersRow = document.createElement('div');
        drawersRow.className = 'sections-row-drawers';
        drawersRow.id = 'drawersRow';
        
        // Add left arrow
        const leftArrow = document.createElement('div');
        leftArrow.className = 'row-scroll-arrow row-scroll-arrow-left';
        leftArrow.innerHTML = '‹';
        leftArrow.addEventListener('click', () => {
            drawersRow.scrollBy({ left: -420, behavior: 'smooth' }); // Scroll by section width + gap
        });
        drawersRow.appendChild(leftArrow);
        
        // Add drawer sections
        drawerSections.forEach(section => {
            const sectionElement = generateSectionHTML(section);
            drawersRow.appendChild(sectionElement);
        });
        
        // Add right arrow
        const rightArrow = document.createElement('div');
        rightArrow.className = 'row-scroll-arrow row-scroll-arrow-right';
        rightArrow.innerHTML = '›';
        rightArrow.addEventListener('click', () => {
            drawersRow.scrollBy({ left: 420, behavior: 'smooth' }); // Scroll by section width + gap
        });
        drawersRow.appendChild(rightArrow);
        
        // Add scroll event to show/hide arrows
        drawersRow.addEventListener('scroll', () => updateRowScrollArrows(drawersRow));
        
        main.appendChild(drawersRow);
        
        // Initial arrow visibility
        setTimeout(() => updateRowScrollArrows(drawersRow), 100);
    }
    
    // Setup scroll arrows for all grids
    document.querySelectorAll('.products-grid').forEach(grid => {
        setupScrollArrows(grid);
    });
    
    // Add resize handles to all sections
    document.querySelectorAll('.strain-section').forEach(addResizeHandle);
    
    // Apply saved section widths
    applySavedSectionWidths();
    
    // Add row resize handle and apply saved height
    addRowResizeHandle();
    applySavedRowHeight();
    
    // Initialize section drag and drop
    initializeSectionDragDrop();
}

// Update row scroll arrows visibility
function updateRowScrollArrows(row) {
    const leftArrow = row.querySelector('.row-scroll-arrow-left');
    const rightArrow = row.querySelector('.row-scroll-arrow-right');
    
    if (!leftArrow || !rightArrow) return;
    
    const canScrollLeft = row.scrollLeft > 10;
    const canScrollRight = row.scrollLeft < (row.scrollWidth - row.clientWidth - 10);
    
    leftArrow.style.display = canScrollLeft ? 'flex' : 'none';
    rightArrow.style.display = canScrollRight ? 'flex' : 'none';
}

function generateSectionHTML(section) {
    const sectionDiv = document.createElement('section');
    sectionDiv.className = 'strain-section';
    sectionDiv.dataset.sectionId = section.id;
    sectionDiv.dataset.storageType = section.storageType;
    
    // Determine section type class based on strain types
    if (section.strainTypes.length === 1) {
        const type = section.strainTypes[0].toLowerCase();
        sectionDiv.classList.add(`${type}-section`);
    } else {
        sectionDiv.classList.add('mixed-section');
    }
    
    // Add storage type class for positioning
    if (section.storageType === 'door') {
        sectionDiv.classList.add('section-with-doors');
    } else if (section.storageType === 'drawer') {
        sectionDiv.classList.add('section-with-drawers');
    }
    
    // Generate section header
    const header = generateSectionHeader(section);
    sectionDiv.appendChild(header);
    
    // Generate single subsection for all formats in this section
    const subsection = generateSubsection(section, 'all', section.storageType, section.formats);
    sectionDiv.appendChild(subsection);
    
    return sectionDiv;
}

function generateSectionHeader(section) {
    const header = document.createElement('div');
    header.className = 'section-header';
    
    // Icon based on strain types
    const iconColor = getSectionIconColor(section.strainTypes);
    const icon = `<span class="section-icon" style="color: ${iconColor};">●</span>`;
    
    // Section title
    const title = `<h2>${section.name}</h2>`;
    
    // Product count
    const countId = `${section.id}-count`;
    const count = `<span class="product-count" id="${countId}">0</span>`;
    
    // Storage type indicator (for visual reference only, not editable)
    let storageIndicator = '';
    if (section.storageType === 'door') {
        storageIndicator = `<span class="storage-indicator storage-door" title="Section avec portes">🚪 ${section.storageCount}</span>`;
    } else if (section.storageType === 'drawer') {
        storageIndicator = `<span class="storage-indicator storage-drawer" title="Section avec tiroirs">📦 ${section.storageCount}</span>`;
    }
    
    header.innerHTML = icon + title + count + storageIndicator;
    
    return header;
}

function generateSubsection(section, formatType, storageType, formats = null) {
    const subsection = document.createElement('div');
    subsection.className = 'subsection';
    
    // Grid wrapper (no subsection header needed anymore)
    const wrapper = document.createElement('div');
    wrapper.className = 'grid-wrapper';
    
    // Scroll arrows
    const leftArrow = document.createElement('div');
    leftArrow.className = 'scroll-arrow scroll-arrow-left';
    leftArrow.innerHTML = '‹';
    leftArrow.setAttribute('role', 'button');
    leftArrow.setAttribute('tabindex', '0');
    leftArrow.setAttribute('aria-label', 'Faire défiler les produits vers la gauche');
    
    const rightArrow = document.createElement('div');
    rightArrow.className = 'scroll-arrow scroll-arrow-right';
    rightArrow.innerHTML = '›';
    rightArrow.setAttribute('role', 'button');
    rightArrow.setAttribute('tabindex', '0');
    rightArrow.setAttribute('aria-label', 'Faire défiler les produits vers la droite');
    
    // Products grid
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    grid.id = `${section.id}-grid`;
    
    wrapper.appendChild(leftArrow);
    wrapper.appendChild(grid);
    wrapper.appendChild(rightArrow);
    
    subsection.appendChild(wrapper);
    
    return subsection;
}

function getSectionIconColor(strainTypes) {
    if (strainTypes.length === 1) {
        switch (strainTypes[0]) {
            case 'Indica': return 'var(--indica-color)';
            case 'Sativa': return 'var(--sativa-color)';
            case 'Hybride': return 'var(--hybride-color)';
            default: return 'var(--sqdc-yellow)';
        }
    }
    // Mixed or multiple types
    return 'var(--sqdc-yellow)';
}

function matchesSection(product, section) {
    // Check if product's strain type matches section
    const typeMatch = section.strainTypes.includes(product.type) || 
                      section.strainTypes.length === 3; // All types
    
    // Check if product's format matches section
    let formatMatch = false;
    
    section.formats.forEach(format => {
        switch (format) {
            case '1g':
                if (product.format === '1 g') formatMatch = true;
                break;
            case '3.5g':
                if (product.format === CONFIG.FORMATS.SMALL) formatMatch = true;
                break;
            case '7g':
                if (product.format === CONFIG.FORMATS.MEDIUM) formatMatch = true;
                break;
            case '15g':
                if (product.format === '15 g') formatMatch = true;
                break;
            case '28g':
                if (product.format === CONFIG.FORMATS.LARGE) formatMatch = true;
                break;
            case 'preroll':
                // Détecter tous les formats avec "unité" ou "unités" (préroulés)
                if (product.format.toLowerCase().includes('unité')) formatMatch = true;
                break;
            case 'hashish':
                if (product.name.toLowerCase().includes('hashish') || 
                    product.name.toLowerCase().includes('hash')) formatMatch = true;
                break;
            case 'edible':
                if (product.name.toLowerCase().includes('mangeable') ||
                    product.name.toLowerCase().includes('edible')) formatMatch = true;
                break;
            case 'infused':
                if (product.name.toLowerCase().includes('infusé') ||
                    product.name.toLowerCase().includes('infused')) formatMatch = true;
                break;
            case 'oil':
                if (product.name.toLowerCase().includes('huile') ||
                    product.name.toLowerCase().includes('oil')) formatMatch = true;
                break;
        }
    });
    
    return typeMatch && formatMatch;
}

function getProductsForSection(section, formatType) {
    return allProducts.filter(product => {
        // Check if product matches section
        return matchesSection(product, section);
    });
}

function updateDynamicSectionCounts() {
    sectionsConfig.forEach(section => {
        // Section count - single count per section now
        const countEl = document.getElementById(`${section.id}-count`);
        if (countEl) {
            const products = allProducts.filter(p => matchesSection(p, section) && productMatchesFilters(p));
            countEl.textContent = products.length;
        }
    });
}



// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;

            if (type === CONFIG.TYPES.ALL) {
                if (activeFilters.has(CONFIG.TYPES.ALL)) {
                    // Deactivate all
                    activeFilters.clear();
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                } else {
                    // Activate all
                    activeFilters = new Set([CONFIG.TYPES.INDICA, CONFIG.TYPES.SATIVA, CONFIG.TYPES.HYBRIDE, CONFIG.TYPES.ALL]);
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.add('active');
                    });
                }
            } else {
                // Toggle individual filter
                if (activeFilters.has(type)) {
                    activeFilters.delete(type);
                    button.classList.remove('active');
                    // If all individual types are deselected, deselect "all"
                    if (!activeFilters.has(CONFIG.TYPES.INDICA) && !activeFilters.has(CONFIG.TYPES.SATIVA) &&
                        !activeFilters.has(CONFIG.TYPES.HYBRIDE)) {
                        activeFilters.delete(CONFIG.TYPES.ALL);
                        document.querySelector('[data-type="all"]').classList.remove('active');
                    }
                } else {
                    activeFilters.add(type);
                    button.classList.add('active');
                    // If all individual types are selected, select "all"
                    if (activeFilters.has(CONFIG.TYPES.INDICA) && activeFilters.has(CONFIG.TYPES.SATIVA) &&
                        activeFilters.has(CONFIG.TYPES.HYBRIDE)) {
                        activeFilters.add(CONFIG.TYPES.ALL);
                        document.querySelector('[data-type="all"]').classList.add('active');
                    }
                }
            }

            filterProducts();
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        filterProducts();
    });

    // Event delegation for product cards (click and hover)
    document.addEventListener('click', (e) => {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
            const sku = productCard.dataset.sku;
            if (sku) {
                openEditModalBySku(sku);
            }
        }
    });

    document.addEventListener('mouseover', (e) => {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
            const sku = productCard.dataset.sku;
            if (sku) {
                showTooltipBySku(sku, e);
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
            hideTooltip();
        }
    });

    // Keyboard accessibility: Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const imageModal = document.getElementById('imageModal');
            const editModal = document.getElementById('editModal');
            const addProductModal = document.getElementById('addProductModal');
            const sectionManagerModal = document.getElementById('sectionManagerModal');
            const sectionEditorModal = document.getElementById('sectionEditorModal');

            if (imageModal && imageModal.classList.contains('active')) {
                closeImageViewer();
            } else if (addProductModal && addProductModal.classList.contains('active')) {
                closeAddProductModal();
            } else if (sectionEditorModal && sectionEditorModal.classList.contains('active')) {
                closeSectionEditorModal();
            } else if (sectionManagerModal && sectionManagerModal.classList.contains('active')) {
                closeSectionManagerModal();
            } else if (editModal && editModal.classList.contains('active')) {
                closeEditModal();
            }
        }
    });

    // Keyboard accessibility: Enter/Space on product cards
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const productCard = e.target.closest('.product-card');
            if (productCard) {
                e.preventDefault(); // Prevent page scroll on Space
                const sku = productCard.dataset.sku;
                if (sku) {
                    openEditModalBySku(sku);
                }
            }
        }
    });
    
    // ============================================
    // Section Manager Event Listeners
    // ============================================
    
    // Section Manager Modal handlers
    const sectionConfigBtn = document.getElementById('sectionConfigBtn');
    const sectionManagerCloseBtn = document.getElementById('sectionManagerCloseBtn');
    const sectionManagerCancelBtn = document.getElementById('sectionManagerCancelBtn');
    const sectionManagerSaveBtn = document.getElementById('sectionManagerSaveBtn');
    const addSectionBtn = document.getElementById('addSectionBtn');
    
    if (sectionConfigBtn) {
        sectionConfigBtn.addEventListener('click', openSectionManagerModal);
    }
    if (sectionManagerCloseBtn) {
        sectionManagerCloseBtn.addEventListener('click', closeSectionManagerModal);
    }
    if (sectionManagerCancelBtn) {
        sectionManagerCancelBtn.addEventListener('click', closeSectionManagerModal);
    }
    if (sectionManagerSaveBtn) {
        sectionManagerSaveBtn.addEventListener('click', saveSectionManagerChanges);
    }
    if (addSectionBtn) {
        addSectionBtn.addEventListener('click', () => openSectionEditorModal());
    }
    
    // Wall tabs in modal
    document.querySelectorAll('#sectionManagerModal .wall-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#sectionManagerModal .wall-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderSectionsList();
        });
    });
    
    // Section Editor Modal handlers
    const sectionEditorCloseBtn = document.getElementById('sectionEditorCloseBtn');
    const sectionEditorCancelBtn = document.getElementById('sectionEditorCancelBtn');
    const sectionEditorSaveBtn = document.getElementById('sectionEditorSaveBtn');
    const sectionEditorDeleteBtn = document.getElementById('sectionEditorDeleteBtn');
    
    if (sectionEditorCloseBtn) {
        sectionEditorCloseBtn.addEventListener('click', closeSectionEditorModal);
    }
    if (sectionEditorCancelBtn) {
        sectionEditorCancelBtn.addEventListener('click', closeSectionEditorModal);
    }
    if (sectionEditorSaveBtn) {
        sectionEditorSaveBtn.addEventListener('click', saveSectionEditor);
    }
    if (sectionEditorDeleteBtn) {
        sectionEditorDeleteBtn.addEventListener('click', deleteSectionEditor);
    }
    
    // Update section name preview when checkboxes change
    document.getElementById('formatCheckboxes')?.addEventListener('change', updateSectionNamePreview);
    document.getElementById('strainTypeCheckboxes')?.addEventListener('change', updateSectionNamePreview);
    
    // Wall navigation buttons (main interface)
    document.querySelectorAll('.wall-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchWallView(btn.dataset.wall);
        });
    });
    
    // Add Product button and modal handlers
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductModalCloseBtn = document.getElementById('addProductModalCloseBtn');
    const addProductCancelBtn = document.getElementById('addProductCancelBtn');
    const addProductSaveBtn = document.getElementById('addProductSaveBtn');
    const addProductModal = document.getElementById('addProductModal');
    
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openAddProductModal);
    }
    if (addProductModalCloseBtn) {
        addProductModalCloseBtn.addEventListener('click', closeAddProductModal);
    }
    if (addProductCancelBtn) {
        addProductCancelBtn.addEventListener('click', closeAddProductModal);
    }
    if (addProductSaveBtn) {
        addProductSaveBtn.addEventListener('click', saveNewProduct);
    }
    // Close modal when clicking outside
    if (addProductModal) {
        addProductModal.addEventListener('click', (e) => {
            if (e.target === addProductModal) {
                closeAddProductModal();
            }
        });
    }
}

// ============================================
// Add Product Modal Functions
// ============================================

function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    
    // Reset form
    document.getElementById('addProductName').value = '';
    document.getElementById('addProductBrand').value = '';
    document.getElementById('addProductSku').value = '';
    document.getElementById('addProductThc').value = '';
    document.getElementById('addProductCbd').value = '';
    
    // Populate section select
    populateAddProductSectionSelect();
    
    // Populate format select
    populateAddProductFormatSelect();
    
    // Clear any previous errors
    const errorDiv = document.getElementById('addProductError');
    if (errorDiv) {
        errorDiv.remove();
    }
    
    // Show modal
    modal.classList.add('active');
    
    // Focus first field
    setTimeout(() => {
        document.getElementById('addProductName').focus();
    }, 100);
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    modal.classList.remove('active');
}

function populateAddProductSectionSelect() {
    const select = document.getElementById('addProductSection');
    select.innerHTML = '';
    
    // Get all visible sections sorted by order
    const visibleSections = sectionsConfig
        .filter(s => s.visible)
        .sort((a, b) => a.order - b.order);
    
    // Add an option for each section
    visibleSections.forEach(section => {
        const option = document.createElement('option');
        option.value = section.id;
        option.textContent = section.name;
        select.appendChild(option);
    });
}

function populateAddProductFormatSelect() {
    const select = document.getElementById('addProductFormat');
    select.innerHTML = '';
    
    // Use available formats from config
    Object.entries(CONFIG.SECTION_CONFIG.AVAILABLE_FORMATS).forEach(([key, label]) => {
        const option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        select.appendChild(option);
    });
}

function showAddProductError(message) {
    // Remove existing error if any
    let errorDiv = document.getElementById('addProductError');
    if (errorDiv) {
        errorDiv.remove();
    }
    
    // Create new error
    errorDiv = document.createElement('div');
    errorDiv.id = 'addProductError';
    errorDiv.style.cssText = 'color: #ff6b6b; background-color: rgba(255, 107, 107, 0.1); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #ff6b6b;';
    errorDiv.textContent = message;
    
    const modalBody = document.querySelector('#addProductModal .modal-body');
    modalBody.insertBefore(errorDiv, modalBody.firstChild);
}

function saveNewProduct() {
    // Get form values
    const name = document.getElementById('addProductName').value.trim();
    const brand = document.getElementById('addProductBrand').value.trim();
    const sku = document.getElementById('addProductSku').value.trim();
    const sectionId = document.getElementById('addProductSection').value;
    const format = document.getElementById('addProductFormat').value;
    const thc = document.getElementById('addProductThc').value.trim();
    const cbd = document.getElementById('addProductCbd').value.trim();
    
    // Validate required fields
    if (!name) {
        showAddProductError('Le nom du produit est requis');
        return;
    }
    if (!brand) {
        showAddProductError('La marque est requise');
        return;
    }
    if (!sku) {
        showAddProductError('Le SKU est requis');
        return;
    }
    if (!sectionId) {
        showAddProductError('La section est requise');
        return;
    }
    if (!format) {
        showAddProductError('Le format est requis');
        return;
    }
    if (!thc) {
        showAddProductError('Le THC % est requis');
        return;
    }
    
    // Validate THC
    const thcValidation = validateThcValue(thc);
    if (!thcValidation.valid) {
        showAddProductError(thcValidation.error);
        return;
    }
    
    // Validate CBD if provided
    if (cbd) {
        const cbdValidation = validateCbdValue(cbd);
        if (!cbdValidation.valid) {
            showAddProductError(cbdValidation.error);
            return;
        }
    }
    
    // Check if SKU already exists
    if (allProducts.find(p => p.sku === sku)) {
        showAddProductError('Un produit avec ce SKU existe déjà');
        return;
    }
    
    // Get section to determine type
    const section = getSectionById(sectionId);
    if (!section) {
        showAddProductError('Section invalide');
        return;
    }
    
    // Create new product object
    const newProduct = {
        name: name,
        brand: brand,
        sku: sku,
        type: section.strainTypes[0], // Use first strain type of section
        format: format,
        thcMin: parseFloat(thc),
        thcMax: parseFloat(thc),
        manualThc: thc,
        cbdMin: cbd ? parseFloat(cbd) : 0,
        cbdMax: cbd ? parseFloat(cbd) : 0,
        manualCbd: cbd || null,
        cbd: cbd ? parseFloat(cbd) : 0
    };
    
    // Add to products array
    allProducts.push(newProduct);
    
    // Save to localStorage
    saveNewProductsToStorage();
    
    // Close modal
    closeAddProductModal();
    
    // Refresh display
    refreshDisplay();
    
    // Show success message (optional)
    console.log('Produit ajouté avec succès:', newProduct);
}

function saveNewProductsToStorage() {
    try {
        // Save new products separately from the embedded data
        const newProducts = allProducts.filter(p => !window.PRODUCTS_DATA.find(original => original.sku === p.sku));
        localStorage.setItem(CONFIG.STORAGE_KEYS.NEW_PRODUCTS, JSON.stringify(newProducts));
    } catch (error) {
        handleStorageError(error, 'new products');
    }
}

function loadNewProductsFromStorage() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.NEW_PRODUCTS);
        if (saved) {
            const newProducts = JSON.parse(saved);
            // Add to allProducts if not already there
            newProducts.forEach(product => {
                if (!allProducts.find(p => p.sku === product.sku)) {
                    allProducts.push(product);
                }
            });
        }
    } catch (error) {
        console.error('Error loading new products:', error);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Load configurations
    loadStoreId();
    loadSectionsConfig();
    loadProductTypeChanges();
    loadProductOrder();
    
    // Update store ID display
    const storeIdDisplay = document.getElementById('storeIdDisplay');
    if (storeIdDisplay) {
        storeIdDisplay.textContent = storeId;
    }
    
    // Generate dynamic sections HTML
    regenerateSectionsHTML();
    
    // Setup event listeners
    setupEventListeners();
    
    // Generate form checkboxes for section editor
    generateFormCheckboxes();
    
    // Load products
    loadProducts();

    // Setup scroll arrows for all grids
    document.querySelectorAll('.products-grid').forEach(grid => {
        setupScrollArrows(grid);
    });

    // Setup edit modal event listeners
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const modalViewImageBtn = document.getElementById('modalViewImageBtn');
    const modalOverlay = document.getElementById('editModal');
    const modalSectionSelect = document.getElementById('modalSectionSelect');

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeEditModal);
    }
    if (modalSaveBtn) {
        modalSaveBtn.addEventListener('click', saveCardChanges);
    }
    if (modalViewImageBtn) {
        modalViewImageBtn.addEventListener('click', openImageViewerFromModal);
    }
    // Close modal when clicking outside
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeEditModal();
            }
        });
    }
    // Setup image modal event listeners
    const imageModalCloseBtn = document.getElementById('imageModalCloseBtn');
    const imageModalOverlay = document.getElementById('imageModal');
    const imageModalDisplayBtn = document.getElementById('imageModalDisplayBtn');

    if (imageModalCloseBtn) {
        imageModalCloseBtn.addEventListener('click', closeImageViewer);
    }

    if (imageModalDisplayBtn) {
        imageModalDisplayBtn.addEventListener('click', () => {
            // Get selected radio button
            const selected = document.querySelector('input[name="ficheProduit"]:checked');
            if (selected) {
                displayFile(selected.value);
            }
        });
    }

    // Close image modal when clicking outside
    if (imageModalOverlay) {
        imageModalOverlay.addEventListener('click', (e) => {
            if (e.target === imageModalOverlay) {
                closeImageViewer();
            }
        });
    }
    
    // Setup section resize handlers
    initializeSectionResizing();
});

// ============================================
// Section Resizing Functions
// ============================================

let resizeState = {
    isResizing: false,
    currentSection: null,
    startX: 0,
    startWidth: 0
};

let rowResizeState = {
    isResizing: false,
    startY: 0,
    startHeight: 0,
    doorsRow: null,
    drawersRow: null
};

function initializeSectionResizing() {
    // Add resize handles to all sections
    document.querySelectorAll('.strain-section').forEach(addResizeHandle);
    
    // Add vertical resize handle between rows
    addRowResizeHandle();
    
    // Global mouse handlers
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.addEventListener('mousemove', handleRowResizeMove);
    document.addEventListener('mouseup', handleRowResizeEnd);
}

function addResizeHandle(section) {
    // Don't add handle if it already exists
    if (section.querySelector('.section-resize-handle')) {
        return;
    }
    
    const handle = document.createElement('div');
    handle.className = 'section-resize-handle';
    handle.title = 'Glisser pour ajuster la largeur';
    
    handle.addEventListener('mousedown', (e) => handleResizeStart(e, section));
    
    section.appendChild(handle);
}

function handleResizeStart(e, section) {
    e.preventDefault();
    e.stopPropagation();
    
    resizeState.isResizing = true;
    resizeState.currentSection = section;
    resizeState.startX = e.clientX;
    resizeState.startWidth = section.offsetWidth;
    
    section.classList.add('resizing');
    const handle = section.querySelector('.section-resize-handle');
    if (handle) {
        handle.classList.add('active');
    }
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
}

function handleResizeMove(e) {
    if (!resizeState.isResizing || !resizeState.currentSection) {
        return;
    }
    
    e.preventDefault();
    
    const deltaX = e.clientX - resizeState.startX;
    const newWidth = resizeState.startWidth + deltaX;
    
    // Get computed min width from CSS (no max limit)
    const minWidth = 200;
    
    // Clamp only the minimum
    const clampedWidth = Math.max(minWidth, newWidth);
    
    // Apply new width
    resizeState.currentSection.style.width = `${clampedWidth}px`;
}

function handleResizeEnd(e) {
    if (!resizeState.isResizing || !resizeState.currentSection) {
        return;
    }
    
    const section = resizeState.currentSection;
    section.classList.remove('resizing');
    
    const handle = section.querySelector('.section-resize-handle');
    if (handle) {
        handle.classList.remove('active');
    }
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Save the width preference to localStorage
    const sectionId = section.dataset.sectionId;
    const width = section.offsetWidth;
    
    if (sectionId && width) {
        saveSectionWidth(sectionId, width);
    }
    
    resizeState.isResizing = false;
    resizeState.currentSection = null;
    resizeState.startX = 0;
    resizeState.startWidth = 0;
}

function saveSectionWidth(sectionId, width) {
    try {
        const key = `${CONFIG.STORAGE_KEYS.SECTION_WIDTH_PREFIX}${sectionId}`;
        localStorage.setItem(key, width.toString());
    } catch (error) {
        console.error('Error saving section width:', error);
    }
}

function loadSectionWidth(sectionId) {
    try {
        const key = `${CONFIG.STORAGE_KEYS.SECTION_WIDTH_PREFIX}${sectionId}`;
        const saved = localStorage.getItem(key);
        return saved ? parseInt(saved, 10) : null;
    } catch (error) {
        console.error('Error loading section width:', error);
        return null;
    }
}

function applySavedSectionWidths() {
    document.querySelectorAll('.strain-section').forEach(section => {
        const sectionId = section.dataset.sectionId;
        if (sectionId) {
            const savedWidth = loadSectionWidth(sectionId);
            if (savedWidth) {
                section.style.width = `${savedWidth}px`;
            } else {
                // Largeur par défaut si pas de sauvegarde
                section.style.width = '400px';
            }
        }
    });
}

// ============================================
// Section Drag and Drop Functions
// ============================================

let sectionDragState = {
    draggedSection: null,
    draggedSectionId: null,
    sourceRow: null,
    storageType: null
};

function initializeSectionDragDrop() {
    document.querySelectorAll('.strain-section').forEach(section => {
        makeSectionDraggable(section);
    });
}

function makeSectionDraggable(section) {
    const header = section.querySelector('.section-header');
    if (!header) return;
    
    // Make the section draggable via its header
    header.setAttribute('draggable', 'true');
    
    header.addEventListener('dragstart', handleSectionDragStart);
    section.addEventListener('dragenter', handleSectionDragEnter);
    section.addEventListener('dragover', handleSectionDragOver);
    section.addEventListener('dragleave', handleSectionDragLeave);
    section.addEventListener('drop', handleSectionDrop);
    section.addEventListener('dragend', handleSectionDragEnd);
}

function handleSectionDragStart(e) {
    const section = e.target.closest('.strain-section');
    if (!section) return;
    
    sectionDragState.draggedSection = section;
    sectionDragState.draggedSectionId = section.dataset.sectionId;
    sectionDragState.storageType = section.dataset.storageType;
    sectionDragState.sourceRow = section.closest('.sections-row-doors, .sections-row-drawers');
    
    section.classList.add('dragging-section');
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', section.innerHTML);
    
    // Add visual feedback to the row
    if (sectionDragState.sourceRow) {
        sectionDragState.sourceRow.classList.add('drag-active-row');
    }
}

function handleSectionDragEnter(e) {
    e.preventDefault();
    
    const targetSection = e.currentTarget;
    if (!targetSection.classList.contains('strain-section')) return;
    
    // Check if we're dragging a section
    if (!sectionDragState.draggedSection) return;
    
    // Don't allow drop on self
    if (targetSection === sectionDragState.draggedSection) return;
    
    // Only allow drop if storage types match
    const targetStorageType = targetSection.dataset.storageType;
    if (targetStorageType !== sectionDragState.storageType) return;
    
    targetSection.classList.add('drag-over-section');
}

function handleSectionDragOver(e) {
    e.preventDefault();
    
    const targetSection = e.currentTarget;
    if (!targetSection.classList.contains('strain-section')) return;
    
    // Check if we're dragging a section
    if (!sectionDragState.draggedSection) return;
    
    // Don't allow drop on self
    if (targetSection === sectionDragState.draggedSection) return;
    
    // Only allow drop if storage types match
    const targetStorageType = targetSection.dataset.storageType;
    if (targetStorageType !== sectionDragState.storageType) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    e.dataTransfer.dropEffect = 'move';
}

function handleSectionDragLeave(e) {
    const targetSection = e.currentTarget;
    if (!targetSection.classList.contains('strain-section')) return;
    
    targetSection.classList.remove('drag-over-section');
}

function handleSectionDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const targetSection = e.currentTarget;
    if (!targetSection.classList.contains('strain-section')) return;
    
    targetSection.classList.remove('drag-over-section');
    
    // Don't allow drop on self
    if (targetSection === sectionDragState.draggedSection) return;
    
    // Only allow drop if storage types match
    const targetStorageType = targetSection.dataset.storageType;
    if (targetStorageType !== sectionDragState.storageType) return;
    
    // Perform the reorder
    const draggedSectionId = sectionDragState.draggedSectionId;
    const targetSectionId = targetSection.dataset.sectionId;
    
    reorderSections(draggedSectionId, targetSectionId);
}

function handleSectionDragEnd(e) {
    const section = e.target.closest('.strain-section');
    if (section) {
        section.classList.remove('dragging-section');
    }
    
    // Remove drag over class from all sections
    document.querySelectorAll('.strain-section').forEach(s => {
        s.classList.remove('drag-over-section');
    });
    
    // Remove row highlight
    if (sectionDragState.sourceRow) {
        sectionDragState.sourceRow.classList.remove('drag-active-row');
    }
    
    // Reset drag state
    sectionDragState.draggedSection = null;
    sectionDragState.draggedSectionId = null;
    sectionDragState.sourceRow = null;
    sectionDragState.storageType = null;
}

function reorderSections(draggedId, targetId) {
    // Find the dragged and target sections in config
    const draggedIndex = sectionsConfig.findIndex(s => s.id === draggedId);
    const targetIndex = sectionsConfig.findIndex(s => s.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Remove dragged section from array
    const [draggedSection] = sectionsConfig.splice(draggedIndex, 1);
    
    // Insert at new position
    const newTargetIndex = sectionsConfig.findIndex(s => s.id === targetId);
    sectionsConfig.splice(newTargetIndex, 0, draggedSection);
    
    // Update order values
    sectionsConfig.forEach((section, index) => {
        section.order = index + 1;
    });
    
    // Save and regenerate
    saveSectionsConfig();
    regenerateSectionsHTML();
    renderProducts();
}

// ============================================
// Row Vertical Resizing Functions
// ============================================

function addRowResizeHandle() {
    const doorsRow = document.getElementById('doorsRow');
    const drawersRow = document.getElementById('drawersRow');
    
    // Only add handle if both rows exist
    if (!doorsRow || !drawersRow) {
        return;
    }
    
    // Check if handle already exists
    if (document.querySelector('.row-resize-handle')) {
        return;
    }
    
    const handle = document.createElement('div');
    handle.className = 'row-resize-handle';
    handle.title = 'Glisser pour ajuster la hauteur';
    
    handle.addEventListener('mousedown', handleRowResizeStart);
    
    // Insert handle between the two rows
    doorsRow.parentNode.insertBefore(handle, drawersRow);
}

function handleRowResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const doorsRow = document.getElementById('doorsRow');
    const drawersRow = document.getElementById('drawersRow');
    
    if (!doorsRow || !drawersRow) return;
    
    rowResizeState.isResizing = true;
    rowResizeState.startY = e.clientY;
    rowResizeState.startHeight = doorsRow.offsetHeight;
    rowResizeState.doorsRow = doorsRow;
    rowResizeState.drawersRow = drawersRow;
    
    const handle = e.target;
    handle.classList.add('active');
    
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.querySelector('main').classList.add('row-resizing');
}

function handleRowResizeMove(e) {
    if (!rowResizeState.isResizing || !rowResizeState.doorsRow) {
        return;
    }
    
    e.preventDefault();
    
    const deltaY = e.clientY - rowResizeState.startY;
    const newHeight = rowResizeState.startHeight + deltaY;
    
    // Get min height from CSS
    const minHeight = 300;
    
    // Clamp to minimum
    const clampedHeight = Math.max(minHeight, newHeight);
    
    // Apply new height to doors row
    rowResizeState.doorsRow.style.height = `${clampedHeight}px`;
    // Drawers row will take remaining space with flex: 1
}

function handleRowResizeEnd(e) {
    if (!rowResizeState.isResizing) {
        return;
    }
    
    const handle = document.querySelector('.row-resize-handle');
    if (handle) {
        handle.classList.remove('active');
    }
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const main = document.querySelector('main');
    if (main) {
        main.classList.remove('row-resizing');
    }
    
    // Save the height preference
    if (rowResizeState.doorsRow) {
        const height = rowResizeState.doorsRow.offsetHeight;
        saveRowHeight(height);
    }
    
    rowResizeState.isResizing = false;
    rowResizeState.doorsRow = null;
    rowResizeState.drawersRow = null;
    rowResizeState.startY = 0;
    rowResizeState.startHeight = 0;
}

function saveRowHeight(height) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.ROW_HEIGHT, height.toString());
    } catch (error) {
        console.error('Error saving row height:', error);
    }
}

function loadRowHeight() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.ROW_HEIGHT);
        return saved ? parseInt(saved, 10) : null;
    } catch (error) {
        console.error('Error loading row height:', error);
        return null;
    }
}

function applySavedRowHeight() {
    const doorsRow = document.getElementById('doorsRow');
    if (doorsRow) {
        const savedHeight = loadRowHeight();
        if (savedHeight) {
            doorsRow.style.height = `${savedHeight}px`;
        }
    }
}
