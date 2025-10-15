// Global state
let allProducts = [];
let filteredProducts = [];
let activeFilters = new Set([CONFIG.TYPES.INDICA, CONFIG.TYPES.SATIVA, CONFIG.TYPES.HYBRIDE, CONFIG.TYPES.ALL]);
let searchQuery = '';
let sortBy = 'name';
let productTypeChanges = {}; // Store product type changes by SKU
let productDisplayModes = {}; // Store product display modes by SKU: { sku: { split: true/false, expandHeight: 0|1|2 } }
let sectionSlots = {}; // Store slot-based layout: { sectionId: { slots: [{index, products: [sku1, sku2]}], slotType: 'door'|'drawer' } }
let dragState = {
    draggedElement: null,
    draggedSku: null,
    sourceGridId: null,
    sourceStorageIndex: null,
    sourceSlotIndex: null,
    dropTarget: null,
    dropStorageIndex: null,
    dropSlotIndex: null
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
        loadHiddenProducts(); // Remove hidden products
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

// Helper function to check if a format is special (hashish, edible, infused, oil)
function isSpecialFormat(format) {
    if (!format) return false;
    const formatLower = format.toLowerCase();
    return formatLower.includes('hashish') || 
           formatLower.includes('hash') ||
           formatLower.includes('mangeable') || 
           formatLower.includes('edible') ||
           formatLower.includes('comestible') ||
           formatLower.includes('infusé') || 
           formatLower.includes('infused') ||
           formatLower.includes('huile') || 
           formatLower.includes('oil');
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
    const specialFormatClass = isSpecialFormat(product.format) ? ' special-format' : '';

    const cardHtml = `
        <div class="product-card${hiddenClass}${specialFormatClass}"
             data-type="${cardType}"
             data-sku="${product.sku}"
             role="button"
             tabindex="0"
             aria-label="${product.name}, ${thcValue}% THC, cliquez pour modifier">
            <button class="product-remove-btn" data-sku="${product.sku}" title="Retirer de cette section" aria-label="Retirer ${product.name} de cette section" onclick="event.stopPropagation(); event.preventDefault(); removeProductFromSection('${product.sku}'); return false;">&times;</button>
            <div class="product-name">${product.name}</div>
            <div class="product-thc">
                <div class="thc-value">${thcValue}%</div>
            </div>
            ${showFormat ? `<div class="product-format">${formatDisplay}</div>` : ''}
            ${showCbd ? `<div class="product-cbd">CBD: ${cbdValue}%</div>` : ''}
        </div>
    `;
    return cardHtml;
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
    
    // Get display mode for this product
    const displayMode = getProductDisplayMode(product.sku);
    
    // Build class list
    let cardClasses = 'drawer-product-card standalone';
    if (!isVisible) cardClasses += ' card-hidden';
    if (displayMode.split) cardClasses += ' split';
    if (isSpecialFormat(product.format)) cardClasses += ' special-format';
    
    card.className = cardClasses;
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true'); // Now draggable for reordering
    card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
    
    card.innerHTML = `
        <button class="product-remove-btn" data-sku="${product.sku}" title="Retirer de cette section" aria-label="Retirer ${product.name} de cette section">&times;</button>
        <button class="product-split-btn ${displayMode.split ? 'active' : ''}" data-sku="${product.sku}" title="Diviser en demi-largeur" aria-label="Diviser ${product.name} en demi-largeur">⇔</button>
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
    
    // Click and keyboard handlers managed by global event delegation in setupEventListeners
    
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
    
    // Get display mode for this product
    const displayMode = getProductDisplayMode(product.sku);
    
    // Build class list
    let cardClasses = 'door-product-card';
    if (!isVisible) cardClasses += ' card-hidden';
    if (displayMode.split) cardClasses += ' split';
    if (displayMode.expandHeight === 1) cardClasses += ' expand-height';
    if (displayMode.expandHeight === 2) cardClasses += ' expand-height-2';
    if (isSpecialFormat(product.format)) cardClasses += ' special-format';
    
    card.className = cardClasses;
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true'); // Now draggable for reordering
    card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
    
    card.innerHTML = `
        <button class="product-remove-btn" data-sku="${product.sku}" title="Retirer de cette section" aria-label="Retirer ${product.name} de cette section">&times;</button>
        <button class="product-split-btn ${displayMode.split ? 'active' : ''}" data-sku="${product.sku}" title="Diviser en demi-largeur" aria-label="Diviser ${product.name} en demi-largeur">⇔</button>
        <button class="product-expand-btn ${displayMode.expandHeight > 0 ? 'active' : ''}" data-sku="${product.sku}" title="Agrandir en hauteur (${displayMode.expandHeight}/2)" aria-label="Agrandir ${product.name} en hauteur">↕${displayMode.expandHeight > 0 ? displayMode.expandHeight : ''}</button>
        <div class="door-product-name">${product.name}</div>
        <div class="door-product-thc">
            <div class="door-thc-value">${thcValue}%</div>
        </div>
        ${showCbd ? `<div class="door-product-cbd">${cbdValue}%</div>` : ''}
        ${displayMode.expandHeight > 0 ? `<div class="door-product-brand">${product.brand}</div>` : ''}
        ${displayMode.expandHeight > 0 ? `<div class="door-product-format">${product.format}</div>` : ''}
    `;
    
    // Drag handlers managed by global event delegation in initializeDragAndDrop
    // Click and keyboard handlers managed by global event delegation in setupEventListeners
    
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
    
    // Get display mode for this product
    const displayMode = getProductDisplayMode(product.sku);
    
    // Build class list
    let cardClasses = 'door-product-card standalone';
    if (!isVisible) cardClasses += ' card-hidden';
    if (displayMode.split) cardClasses += ' split';
    if (isSpecialFormat(product.format)) cardClasses += ' special-format';
    
    card.className = cardClasses;
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true'); // Now draggable for reordering
    card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
    
    card.innerHTML = `
        <button class="product-remove-btn" data-sku="${product.sku}" title="Retirer de cette section" aria-label="Retirer ${product.name} de cette section">&times;</button>
        <button class="product-split-btn ${displayMode.split ? 'active' : ''}" data-sku="${product.sku}" title="Diviser en demi-largeur" aria-label="Diviser ${product.name} en demi-largeur">⇔</button>
        <div class="door-product-name">${product.name}</div>
        <div class="door-product-thc">
            <div class="door-thc-value">${thcValue}%</div>
        </div>
        ${showCbd ? `<div class="door-product-cbd">${cbdValue}%</div>` : ''}
    `;
    
    // Drag handlers managed by global event delegation in initializeDragAndDrop
    // Click and keyboard handlers managed by global event delegation in setupEventListeners
    
    return card;
}

// Helper function: Create a door element with products (supports empty doors)
function createDoorFromSlot(slot, slotIndex, sectionId) {
    const door = document.createElement('div');
    door.className = 'door';
    door.dataset.doorIndex = slotIndex;
    door.dataset.slotIndex = slotIndex;
    door.dataset.sectionId = sectionId;
    
    // Make door draggable for drop target
    door.setAttribute('draggable', 'false');
    
    // Check if slot is empty or occupied by expanded card
    const isEmpty = slot.products === null || (Array.isArray(slot.products) && slot.products.length === 0);
    const isExpandedOccupied = slot.products === null;
    
    if (isExpandedOccupied) {
        door.classList.add('expanded-occupied');
    } else if (isEmpty) {
        door.classList.add('empty');
    }
    
    // Create door handle
    const handle = document.createElement('div');
    handle.className = 'door-handle';
    
    // Create labels container (shown when closed)
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'door-labels';
    
    // Create stock display container (shown when open)
    const stockDisplay = document.createElement('div');
    stockDisplay.className = 'door-stock-display';
    
    // Handle different slot states
    if (isExpandedOccupied) {
        // Slot occupied by expanded card from previous slot
        const occupiedLabel = document.createElement('div');
        occupiedLabel.className = 'door-occupied-label';
        occupiedLabel.textContent = '↑ Occupé';
        labelsContainer.appendChild(occupiedLabel);
    } else if (isEmpty) {
        // Empty slot
        const emptyLabel = document.createElement('div');
        emptyLabel.className = 'door-empty-label';
        emptyLabel.textContent = 'Vide';
        labelsContainer.appendChild(emptyLabel);
    } else {
        // Slot with products
        slot.products.forEach(sku => {
            const product = allProducts.find(p => p.sku === sku);
            if (!product) return;
            
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
    }
    
    door.appendChild(labelsContainer);
    door.appendChild(stockDisplay);
    door.appendChild(handle);
    
    // Event delegation on main handles drag & drop
    
    return door;
}

function createDrawerFromSlot(slot, slotIndex, sectionId) {
    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.dataset.drawerIndex = slotIndex;
    drawer.dataset.slotIndex = slotIndex;
    drawer.dataset.sectionId = sectionId;
    
    // Make drawer draggable for drop target
    drawer.setAttribute('draggable', 'false');
    
    // Check if slot is empty
    const isEmpty = Array.isArray(slot.products) && slot.products.length === 0;
    
    if (isEmpty) {
        drawer.classList.add('empty');
    }
    
    // Create drawer handle
    const handle = document.createElement('div');
    handle.className = 'drawer-handle';
    
    // Create labels container (shown when closed)
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'drawer-labels';
    
    // Create stock display container (shown when open)
    const stockDisplay = document.createElement('div');
    stockDisplay.className = 'drawer-stock-display';
    
    // Handle different slot states
    if (isEmpty) {
        // Empty slot
        const emptyLabel = document.createElement('div');
        emptyLabel.className = 'drawer-empty-label';
        emptyLabel.textContent = 'Vide';
        labelsContainer.appendChild(emptyLabel);
    } else {
        // Slot with products
        slot.products.forEach(sku => {
            const product = allProducts.find(p => p.sku === sku);
            if (!product) return;
            
            // Get THC value
            const thcValue = product.manualThc || product.thcMax;
            // Get CBD value
            const cbdValue = product.manualCbd || product.cbd || 0;
            const showCbd = cbdValue > 0;
            
            // Check if product matches current filters
            const isVisible = productMatchesFilters(product);
            
            // Get display mode for this product
            const displayMode = getProductDisplayMode(product.sku);
            
            // Build class list
            let cardClasses = 'drawer-product-card';
            if (!isVisible) cardClasses += ' card-hidden';
            if (displayMode.split) cardClasses += ' split';
            if (isSpecialFormat(product.format)) cardClasses += ' special-format';
            
            // Create card
            const card = document.createElement('div');
            card.className = cardClasses;
            card.dataset.type = product.type;
            card.dataset.sku = product.sku;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('draggable', 'true');
            card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
            
            card.innerHTML = `
                <button class="product-remove-btn" data-sku="${product.sku}" title="Retirer de cette section" aria-label="Retirer ${product.name} de cette section">&times;</button>
                <button class="product-split-btn ${displayMode.split ? 'active' : ''}" data-sku="${product.sku}" title="Diviser en demi-largeur" aria-label="Diviser ${product.name} en demi-largeur">⇔</button>
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
    }
    
    drawer.appendChild(labelsContainer);
    drawer.appendChild(stockDisplay);
    drawer.appendChild(handle);
    
    // Event delegation on main handles drag & drop
    
    return drawer;
}

// New storage-based rendering functions
function createDoorFromStorage(storage, storageIndex, sectionId) {
    const door = document.createElement('div');
    door.className = 'door';
    door.dataset.storageIndex = storageIndex;
    door.dataset.sectionId = sectionId;
    
    // Make door draggable for drop target
    door.setAttribute('draggable', 'false');
    
    // Create door handle
    const handle = document.createElement('div');
    handle.className = 'door-handle';
    
    // Create labels container (shown when closed)
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'door-labels';
    
    // Create stock display container (shown when open)
    const stockDisplay = document.createElement('div');
    stockDisplay.className = 'door-stock-display';
    
    // Render each slot in this storage
    storage.slots.forEach((slot, slotIndex) => {
        const slotElement = createSlotElement(slot, storageIndex, slotIndex, sectionId, 'door');
        labelsContainer.appendChild(slotElement);
        
        // Also add stock items to stockDisplay
        if (Array.isArray(slot.products)) {
            slot.products.forEach(sku => {
                const product = allProducts.find(p => p.sku === sku);
                if (!product) return;
                
                const stockItem = document.createElement('div');
                stockItem.className = 'door-stock-item';
                
                const stockName = document.createElement('div');
                stockName.className = 'door-stock-name';
                stockName.textContent = product.name;
                
                const stockCount = document.createElement('div');
                stockCount.className = 'door-stock-count';
                stockCount.textContent = '0';
                stockCount.dataset.sku = product.sku;
                
                stockItem.appendChild(stockName);
                stockItem.appendChild(stockCount);
                stockDisplay.appendChild(stockItem);
            });
        }
    });
    
    door.appendChild(labelsContainer);
    door.appendChild(stockDisplay);
    door.appendChild(handle);
    
    // Event delegation on main handles drag & drop
    
    return door;
}

function createDrawerFromStorage(storage, storageIndex, sectionId) {
    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.dataset.storageIndex = storageIndex;
    drawer.dataset.sectionId = sectionId;
    
    // Make drawer draggable for drop target
    drawer.setAttribute('draggable', 'false');
    
    // Create drawer handle
    const handle = document.createElement('div');
    handle.className = 'drawer-handle';
    
    // Create labels container (shown when closed)
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'drawer-labels';
    
    // Create stock display container (shown when open)
    const stockDisplay = document.createElement('div');
    stockDisplay.className = 'drawer-stock-display';
    
    // Render each slot in this storage
    storage.slots.forEach((slot, slotIndex) => {
        const slotElement = createSlotElement(slot, storageIndex, slotIndex, sectionId, 'drawer');
        labelsContainer.appendChild(slotElement);
        
        // Also add stock items to stockDisplay
        if (Array.isArray(slot.products)) {
            slot.products.forEach(sku => {
                const product = allProducts.find(p => p.sku === sku);
                if (!product) return;
                
                const stockItem = document.createElement('div');
                stockItem.className = 'drawer-stock-item';
                
                const stockName = document.createElement('div');
                stockName.className = 'drawer-stock-name';
                stockName.textContent = product.name;
                
                const stockCount = document.createElement('div');
                stockCount.className = 'drawer-stock-count';
                stockCount.textContent = '0';
                stockCount.dataset.sku = product.sku;
                
                stockItem.appendChild(stockName);
                stockItem.appendChild(stockCount);
                stockDisplay.appendChild(stockItem);
            });
        }
    });
    
    drawer.appendChild(labelsContainer);
    drawer.appendChild(stockDisplay);
    drawer.appendChild(handle);
    
    // Event delegation on main handles drag & drop
    
    return drawer;
}

function createSlotElement(slot, storageIndex, slotIndex, sectionId, storageType) {
    const slotDiv = document.createElement('div');
    slotDiv.className = `slot ${storageType}-slot`;
    slotDiv.dataset.storageIndex = storageIndex;
    slotDiv.dataset.slotIndex = slotIndex;
    slotDiv.dataset.sectionId = sectionId;
    
    // Check if slot is empty or occupied by expanded card
    const isExpandedOccupied = slot.products === null;
    
    if (isExpandedOccupied) {
        slotDiv.classList.add('expanded-occupied');
        const occupiedLabel = document.createElement('div');
        occupiedLabel.className = 'slot-occupied-label';
        occupiedLabel.textContent = '↑ Occupé';
        slotDiv.appendChild(occupiedLabel);
    } else if (Array.isArray(slot.products)) {
        // Count valid products (products that exist in allProducts)
        const validProducts = slot.products.filter(sku => allProducts.find(p => p.sku === sku));
        
        if (validProducts.length === 0) {
            // Slot is empty or all products have been removed/hidden
            slotDiv.classList.add('empty');
            const emptyLabel = document.createElement('div');
            emptyLabel.className = 'slot-empty-label';
            emptyLabel.textContent = 'Vide';
            slotDiv.appendChild(emptyLabel);
        } else {
            // Slot with valid products
            slot.products.forEach(sku => {
                const product = allProducts.find(p => p.sku === sku);
                if (!product) return; // Skip products that don't exist anymore
                
                // Create card based on storage type
                const card = storageType === 'door' ? createDoorProductCard(product) : createDrawerProductCard(product);
                
                // Check if product is misplaced in this section
                const section = getSectionById(sectionId.replace('-grid', ''));
                if (section && !matchesSection(product, section)) {
                    card.classList.add('misplaced-product');
                    card.title = `⚠️ Ce produit ne correspond pas au format de cette section (${product.format})`;
                }
                
                slotDiv.appendChild(card);
            });
        }
    }
    
    // Event delegation on main handles drag & drop
    
    return slotDiv;
}

function createDrawerProductCard(product) {
    const thcValue = product.manualThc || product.thcMax;
    const cbdValue = product.manualCbd || product.cbd || 0;
    const showCbd = cbdValue > 0;
    
    // Check if product matches current filters
    const isVisible = productMatchesFilters(product);
    
    // Get display mode for this product
    const displayMode = getProductDisplayMode(product.sku);
    
    // Build class list
    let cardClasses = 'drawer-product-card';
    if (!isVisible) cardClasses += ' card-hidden';
    if (displayMode.split) cardClasses += ' split';
    if (isSpecialFormat(product.format)) cardClasses += ' special-format';
    
    // Create card
    const card = document.createElement('div');
    card.className = cardClasses;
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true');
    card.setAttribute('aria-label', `${product.name}, ${thcValue}% THC, cliquez pour modifier`);
    
    card.innerHTML = `
        <button class="product-remove-btn" data-sku="${product.sku}" title="Retirer de cette section" aria-label="Retirer ${product.name} de cette section">&times;</button>
        <button class="product-split-btn ${displayMode.split ? 'active' : ''}" data-sku="${product.sku}" title="Diviser en demi-largeur" aria-label="Diviser ${product.name} en demi-largeur">⇔</button>
        <div class="drawer-product-name">${product.name}</div>
        <div class="drawer-product-thc">
            <div class="drawer-thc-value">${thcValue}%</div>
        </div>
        ${showCbd ? `<div class="drawer-product-cbd">${cbdValue}%</div>` : ''}
    `;
    
    // Drag handlers managed by global event delegation in initializeDragAndDrop
    
    return card;
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
    
    const sectionId = grid.id;
    const storageCount = section.storageCount || 12;
    const slotsPerStorage = CONFIG.DOOR_CONFIG.productsPerDoor; // 6 slots per door
    
    // Initialize storage structure for this section if not exists
    const sectionData = initializeSectionStorages(sectionId, 'door', storageCount, slotsPerStorage);
    
    // Auto-assign products that are not yet assigned to any slot
    const assignedSkus = new Set();
    sectionData.storages.forEach(storage => {
        storage.slots.forEach(slot => {
            if (Array.isArray(slot.products)) {
                slot.products.forEach(sku => assignedSkus.add(sku));
            }
        });
    });
    
    const unassignedProducts = products.filter(p => !assignedSkus.has(p.sku));
    if (unassignedProducts.length > 0) {
        autoAssignProductsToStorages(sectionId, unassignedProducts);
    }
    
    // Render each storage (door)
    sectionData.storages.forEach((storage, storageIndex) => {
        const door = createDoorFromStorage(storage, storageIndex, sectionId);
        grid.appendChild(door);
    });
}

function renderDrawersGridDynamic(grid, products, section) {
    grid.innerHTML = '';
    
    const sectionId = grid.id;
    const storageCount = section.storageCount || 12;
    const slotsPerStorage = CONFIG.DRAWER_CONFIG.productsPerDrawer; // 2 slots per drawer
    
    // Initialize storage structure for this section if not exists
    const sectionData = initializeSectionStorages(sectionId, 'drawer', storageCount, slotsPerStorage);
    
    // Auto-assign products that are not yet assigned to any slot
    const assignedSkus = new Set();
    sectionData.storages.forEach(storage => {
        storage.slots.forEach(slot => {
            if (Array.isArray(slot.products)) {
                slot.products.forEach(sku => assignedSkus.add(sku));
            }
        });
    });
    
    const unassignedProducts = products.filter(p => !assignedSkus.has(p.sku));
    if (unassignedProducts.length > 0) {
        autoAssignProductsToStorages(sectionId, unassignedProducts);
    }
    
    // Render each storage (drawer)
    sectionData.storages.forEach((storage, storageIndex) => {
        const drawer = createDrawerFromStorage(storage, storageIndex, sectionId);
        grid.appendChild(drawer);
    });
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
// ============================================
// Section Slots System - Fixed grid with empty slots
// ============================================

function saveSectionSlots() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SECTION_SLOTS, JSON.stringify(sectionSlots));
        console.log('Section slots saved');
    } catch (error) {
        handleStorageError(error, 'section slots');
    }
}

function loadSectionSlots() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SECTION_SLOTS);
        if (saved) {
            sectionSlots = JSON.parse(saved);
            console.log('Section slots loaded');
        }
    } catch (error) {
        console.error('Error loading section slots:', error);
        sectionSlots = {};
    }
}

function initializeSectionStorages(sectionId, storageType, storageCount, slotsPerStorage) {
    // Check if section exists and has valid structure
    const existingSection = sectionSlots[sectionId];
    const needsInitialization = !existingSection || 
                                 !existingSection.storages || 
                                 !Array.isArray(existingSection.storages);
    
    if (needsInitialization) {
        const storages = [];
        
        // Create each storage (door or drawer)
        for (let i = 0; i < storageCount; i++) {
            const slots = [];
            
            // Create slots for this storage
            for (let j = 0; j < slotsPerStorage; j++) {
                slots.push({
                    index: j,
                    products: [] // Empty slot
                });
            }
            
            storages.push({
                index: i,
                slots: slots
            });
        }
        
        sectionSlots[sectionId] = {
            storages: storages,
            storageType: storageType, // 'door' or 'drawer'
            slotsPerStorage: slotsPerStorage
        };
        
        console.log(`Initialized ${storageCount} ${storageType}s with ${slotsPerStorage} slots each for section ${sectionId}`);
    }
    return sectionSlots[sectionId];
}

function getSlot(sectionId, storageIndex, slotIndex) {
    if (!sectionSlots[sectionId] || !sectionSlots[sectionId].storages) return null;
    const storage = sectionSlots[sectionId].storages[storageIndex];
    if (!storage) return null;
    return storage.slots[slotIndex];
}

function getStorage(sectionId, storageIndex) {
    if (!sectionSlots[sectionId] || !sectionSlots[sectionId].storages) return null;
    return sectionSlots[sectionId].storages[storageIndex];
}

function isSlotEmpty(sectionId, storageIndex, slotIndex) {
    const slot = getSlot(sectionId, storageIndex, slotIndex);
    if (!slot) return false;
    return slot.products === null || (Array.isArray(slot.products) && slot.products.length === 0);
}

function isSlotExpandedOccupied(sectionId, storageIndex, slotIndex) {
    const slot = getSlot(sectionId, storageIndex, slotIndex);
    return slot && slot.products === null; // null means occupied by expanded card from previous slot
}

function canAddToSlot(sectionId, storageIndex, slotIndex, sku, isSwap = false) {
    const slot = getSlot(sectionId, storageIndex, slotIndex);
    if (!slot) return false;
    
    // Cannot add to slot occupied by expanded card
    if (slot.products === null) return false;
    
    const displayMode = getProductDisplayMode(sku);
    
    // Check if this is a door section
    const isDoorSection = sectionSlots[sectionId] && sectionSlots[sectionId].storageType === 'door';
    
    // If card is expanded, check if there's enough space for the expansion
    if (displayMode.expandHeight > 0 && isDoorSection) {
        const slotsPerStorage = sectionSlots[sectionId].slotsPerStorage || CONFIG.DOOR_CONFIG.productsPerDoor;
        const requiredSlots = displayMode.expandHeight + 1; // 1=2 slots, 2=3 slots
        const availableSlots = slotsPerStorage - slotIndex;
        
        if (availableSlots < requiredSlots) {
            // Not enough slots remaining for this expansion level
            return false;
        }
    }
    
    // Empty slot - can add anything
    if (slot.products.length === 0) return true;
    
    // Slot with 1 product
    if (slot.products.length === 1) {
        const existingProduct = allProducts.find(p => p.sku === slot.products[0]);
        if (!existingProduct) return false;
        
        const existingMode = getProductDisplayMode(existingProduct.sku);
        
        // If this is a swap operation
        if (isSwap) {
            // CANNOT swap two split products together
            if (displayMode.split && existingMode.split) {
                return false;
            }
            // Allow other swaps (normal with normal, normal with split, etc.)
            return true;
        }
        
        // For non-swap operations (adding to same slot):
        // Both must be split to share a slot
        if (displayMode.split && existingMode.split) {
            return true;
        }
        
        // Otherwise cannot add (one is expanded or normal, can't share)
        return false;
    }
    
    // Slot with 2 products (both split) - full
    if (slot.products.length === 2) return false;
    
    return false;
}

function addProductToSlot(sectionId, storageIndex, slotIndex, sku) {
    const slot = getSlot(sectionId, storageIndex, slotIndex);
    if (!slot) return false;
    
    if (!canAddToSlot(sectionId, storageIndex, slotIndex, sku)) return false;
    
    // Add product to slot
    if (!slot.products.includes(sku)) {
        slot.products.push(sku);
    }
    
    // If expanded, mark next slot(s) as occupied
    const displayMode = getProductDisplayMode(sku);
    if (displayMode.expandHeight > 0 && sectionSlots[sectionId] && sectionSlots[sectionId].storageType === 'door') {
        // Mark the required number of slots as occupied (expandHeight: 1=next slot, 2=next 2 slots)
        for (let i = 1; i <= displayMode.expandHeight; i++) {
            const nextSlot = getSlot(sectionId, storageIndex, slotIndex + i);
            if (nextSlot) {
                if (Array.isArray(nextSlot.products) && nextSlot.products.length === 0) {
                    console.log(`✓ Marking slot ${slotIndex + i} (storage ${storageIndex}) as occupied by expanded card from slot ${slotIndex}`);
                    nextSlot.products = null; // Mark as occupied by expanded card
                } else if (nextSlot.products === null) {
                    console.log(`ℹ Slot ${slotIndex + i} (storage ${storageIndex}) already marked as occupied`);
                } else {
                    console.error(`✗ Cannot mark slot ${slotIndex + i} (storage ${storageIndex}) - it contains products:`, nextSlot.products);
                }
            } else {
                console.error(`✗ Slot ${slotIndex + i} (storage ${storageIndex}) does not exist`);
            }
        }
    }
    
    saveSectionSlots();
    return true;
}

// Helper function to free slots occupied by an expanded card
function freeExpandedSlots(sectionId, storageIndex, slotIndex, sku) {
    const displayMode = getProductDisplayMode(sku);
    if (displayMode.expandHeight > 0 && sectionSlots[sectionId] && sectionSlots[sectionId].storageType === 'door') {
        // Free all slots that were occupied by this expanded card
        for (let i = 1; i <= displayMode.expandHeight; i++) {
            const nextSlot = getSlot(sectionId, storageIndex, slotIndex + i);
            if (nextSlot) {
                // Only free if it's marked as occupied (null)
                if (nextSlot.products === null) {
                    console.log(`✓ Freeing slot ${slotIndex + i} (storage ${storageIndex}) - was occupied by expanded card from slot ${slotIndex}`);
                    nextSlot.products = []; // Free the slot - make it empty, not occupied
                } else if (Array.isArray(nextSlot.products) && nextSlot.products.length === 0) {
                    console.log(`ℹ Slot ${slotIndex + i} (storage ${storageIndex}) is already empty`);
                } else {
                    console.warn(`⚠ Slot ${slotIndex + i} (storage ${storageIndex}) has products - not freeing:`, nextSlot.products);
                }
            }
        }
    }
}

function removeProductFromSlot(sectionId, storageIndex, slotIndex, sku) {
    const slot = getSlot(sectionId, storageIndex, slotIndex);
    if (!slot || !Array.isArray(slot.products)) return false;
    
    const index = slot.products.indexOf(sku);
    if (index > -1) {
        // First, free any expanded slots
        freeExpandedSlots(sectionId, storageIndex, slotIndex, sku);
        
        // Then remove the product from its slot
        slot.products.splice(index, 1);
        
        saveSectionSlots();
        return true;
    }
    
    return false;
}

function findProductSlot(sectionId, sku) {
    if (!sectionSlots[sectionId] || !sectionSlots[sectionId].storages) return null;
    
    for (let i = 0; i < sectionSlots[sectionId].storages.length; i++) {
        const storage = sectionSlots[sectionId].storages[i];
        for (let j = 0; j < storage.slots.length; j++) {
            const slot = storage.slots[j];
            if (Array.isArray(slot.products) && slot.products.includes(sku)) {
                return { storageIndex: i, slotIndex: j };
            }
        }
    }
    
    return null;
}

function moveProduct(fromSectionId, fromStorageIndex, fromSlotIndex, toSectionId, toStorageIndex, toSlotIndex, sku) {
    const targetSlot = getSlot(toSectionId, toStorageIndex, toSlotIndex);
    
    // Check if target slot has a product
    if (targetSlot && Array.isArray(targetSlot.products) && targetSlot.products.length === 1) {
        const targetSku = targetSlot.products[0];
        
        // Check if both products are split - if so, ADD to same slot instead of swapping
        const draggedMode = getProductDisplayMode(sku);
        const targetProduct = allProducts.find(p => p.sku === targetSku);
        const targetMode = targetProduct ? getProductDisplayMode(targetSku) : { split: false };
        
        if (draggedMode.split && targetMode.split) {
            // ADD operation: both are split, they can share the slot
            console.log(`Adding split ${sku} to slot with split ${targetSku} (sharing slot)`);
            
            // Remove from source
            if (!removeProductFromSlot(fromSectionId, fromStorageIndex, fromSlotIndex, sku)) {
                console.error('Failed to remove source product during add');
                return false;
            }
            
            // Add to destination (slot already has one split, now will have two)
            if (!addProductToSlot(toSectionId, toStorageIndex, toSlotIndex, sku)) {
                console.error('Failed to add product to destination slot');
                // Rollback
                addProductToSlot(fromSectionId, fromStorageIndex, fromSlotIndex, sku);
                return false;
            }
            
            console.log(`Added ${sku} to slot with ${targetSku} at storage ${toStorageIndex} slot ${toSlotIndex}`);
            return true;
        }
        
        // SWAP operation: not both splits, perform traditional swap
        // Step 1: Free expanded slots for both products before removing
        console.log(`Swap: Freeing expanded slots before swap`);
        freeExpandedSlots(fromSectionId, fromStorageIndex, fromSlotIndex, sku);
        freeExpandedSlots(toSectionId, toStorageIndex, toSlotIndex, targetSku);
        
        // Step 2: Remove both products from their current slots
        const fromSlot = getSlot(fromSectionId, fromStorageIndex, fromSlotIndex);
        const toSlot = getSlot(toSectionId, toStorageIndex, toSlotIndex);
        
        if (!fromSlot || !Array.isArray(fromSlot.products) || !toSlot || !Array.isArray(toSlot.products)) {
            console.error('Failed to get slots during swap');
            return false;
        }
        
        const fromIndex = fromSlot.products.indexOf(sku);
        const toIndex = toSlot.products.indexOf(targetSku);
        
        if (fromIndex === -1 || toIndex === -1) {
            console.error('Failed to find products in slots during swap');
            return false;
        }
        
        // Remove products
        fromSlot.products.splice(fromIndex, 1);
        toSlot.products.splice(toIndex, 1);
        
        // Step 3: Add products to swapped positions (this will mark new expanded slots)
        if (!addProductToSlot(toSectionId, toStorageIndex, toSlotIndex, sku)) {
            console.error('Failed to add source product to target during swap');
            // Rollback
            fromSlot.products.push(sku);
            toSlot.products.push(targetSku);
            saveSectionSlots();
            return false;
        }
        
        if (!addProductToSlot(fromSectionId, fromStorageIndex, fromSlotIndex, targetSku)) {
            console.error('Failed to add target product to source during swap');
            // Rollback - remove from destination and restore both
            const toSlotAgain = getSlot(toSectionId, toStorageIndex, toSlotIndex);
            if (toSlotAgain && Array.isArray(toSlotAgain.products)) {
                const idx = toSlotAgain.products.indexOf(sku);
                if (idx > -1) toSlotAgain.products.splice(idx, 1);
            }
            fromSlot.products.push(sku);
            toSlot.products.push(targetSku);
            saveSectionSlots();
            return false;
        }
        
        console.log(`Swapped ${sku} with ${targetSku} between storage ${fromStorageIndex} slot ${fromSlotIndex} and storage ${toStorageIndex} slot ${toSlotIndex}`);
        saveSectionSlots();
        return true;
    }
    
    // Normal move to empty slot
    if (!removeProductFromSlot(fromSectionId, fromStorageIndex, fromSlotIndex, sku)) {
        console.error('Failed to remove product from source slot');
        return false;
    }
    
    // Add to destination
    if (!addProductToSlot(toSectionId, toStorageIndex, toSlotIndex, sku)) {
        console.error('Failed to add product to destination slot');
        // Rollback - add back to source
        addProductToSlot(fromSectionId, fromStorageIndex, fromSlotIndex, sku);
        return false;
    }
    
    console.log(`Moved ${sku} from storage ${fromStorageIndex} slot ${fromSlotIndex} to storage ${toStorageIndex} slot ${toSlotIndex}`);
    return true;
}

function autoAssignProductsToStorages(sectionId, products) {
    // Auto-assign products to empty slots (used when section is first created)
    if (!sectionSlots[sectionId] || !sectionSlots[sectionId].storages) return;
    
    const storages = sectionSlots[sectionId].storages;
    let productIndex = 0;
    
    // Iterate through all storages and their slots
    for (let i = 0; i < storages.length && productIndex < products.length; i++) {
        const storage = storages[i];
        
        for (let j = 0; j < storage.slots.length && productIndex < products.length; j++) {
            const slot = storage.slots[j];
            
            // Skip occupied slots
            if (slot.products === null) continue;
            
            // Skip non-empty slots
            if (Array.isArray(slot.products) && slot.products.length > 0) continue;
            
            // Add product to empty slot
            const product = products[productIndex];
            slot.products = [product.sku];
            productIndex++;
            
            // If expanded, skip next slot(s)
            const displayMode = getProductDisplayMode(product.sku);
            if (displayMode.expandHeight > 0 && sectionSlots[sectionId] && sectionSlots[sectionId].storageType === 'door') {
                // Mark and skip all required slots
                for (let k = 1; k <= displayMode.expandHeight && j + k < storage.slots.length; k++) {
                    storage.slots[j + k].products = null;
                }
                j += displayMode.expandHeight; // Skip next iterations
            }
        }
    }
    
    saveSectionSlots();
}

// ============================================
// Product Display Modes Functions (Split & Expand)
// ============================================

function saveProductDisplayModes() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCT_DISPLAY_MODES, JSON.stringify(productDisplayModes));
    } catch (error) {
        handleStorageError(error, 'product display modes');
    }
}

function loadProductDisplayModes() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCT_DISPLAY_MODES);
        if (saved) {
            productDisplayModes = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading product display modes:', error);
        productDisplayModes = {};
    }
}

function getProductDisplayMode(sku) {
    if (!productDisplayModes[sku]) {
        productDisplayModes[sku] = { split: false, expandHeight: 0 };
    }
    // Migration: convert old boolean to number
    if (typeof productDisplayModes[sku].expandHeight === 'boolean') {
        productDisplayModes[sku].expandHeight = productDisplayModes[sku].expandHeight ? 1 : 0;
    }
    return productDisplayModes[sku];
}

function toggleProductSplit(sku) {
    const mode = getProductDisplayMode(sku);
    
    // If expanding, need to free slots first
    if (mode.expandHeight > 0) {
        // Find product location
        for (const sectionId in sectionSlots) {
            const location = findProductSlot(sectionId, sku);
            if (location) {
                // Free expanded slots before disabling
                freeExpandedSlots(sectionId, location.storageIndex, location.slotIndex, sku);
                break;
            }
        }
        mode.expandHeight = 0;
    }
    
    // Toggle split
    mode.split = !mode.split;
    
    saveProductDisplayModes();
    saveSectionSlots(); // Save slot changes
    refreshDisplay();
    
    console.log(`Product ${sku} split toggled:`, mode.split);
}

function toggleProductExpandHeight(sku) {
    const mode = getProductDisplayMode(sku);
    
    // If split, disable it first (mutual exclusion)
    if (mode.split) {
        mode.split = false;
    }
    
    // Find product location to check if expansion is possible
    let sectionId = null;
    let location = null;
    for (const sid in sectionSlots) {
        const loc = findProductSlot(sid, sku);
        if (loc) {
            sectionId = sid;
            location = loc;
            break;
        }
    }
    
    if (!sectionId || !location) {
        console.warn(`Cannot expand product ${sku} - not found in any section`);
        return;
    }
    
    // Check if this is a door section (expand only works for doors)
    const isDoorSection = sectionSlots[sectionId] && sectionSlots[sectionId].storageType === 'door';
    if (!isDoorSection) {
        console.warn(`Cannot expand product ${sku} - expand only works in door sections`);
        return;
    }
    
    // Free current expanded slots if any
    if (mode.expandHeight > 0) {
        freeExpandedSlots(sectionId, location.storageIndex, location.slotIndex, sku);
    }
    
    // Calculate next expand level: 0 -> 1 -> 2 -> 0
    const nextExpandHeight = (mode.expandHeight + 1) % 3;
    
    // If going to expand (1 or 2), check if there's space
    if (nextExpandHeight > 0) {
        const slotsPerStorage = sectionSlots[sectionId].slotsPerStorage || CONFIG.DOOR_CONFIG.productsPerDoor;
        const requiredSlots = nextExpandHeight + 1; // 1=2 slots, 2=3 slots
        const availableSlots = slotsPerStorage - location.slotIndex;
        
        if (availableSlots < requiredSlots) {
            console.warn(`Cannot expand product ${sku} to level ${nextExpandHeight} - not enough slots (need ${requiredSlots}, have ${availableSlots})`);
            alert(`Impossible d'agrandir - pas assez d'espace dans cette porte (besoin de ${requiredSlots} emplacements, seulement ${availableSlots} disponibles)`);
            return;
        }
        
        // Check if next slots are available (empty or already marked as occupied by this card)
        let canExpand = true;
        for (let i = 1; i <= nextExpandHeight; i++) {
            const nextSlot = getSlot(sectionId, location.storageIndex, location.slotIndex + i);
            if (!nextSlot) {
                canExpand = false;
                break;
            }
            // Slot must be empty or already occupied by this card's previous expansion
            if (nextSlot.products !== null && !(Array.isArray(nextSlot.products) && nextSlot.products.length === 0)) {
                canExpand = false;
                console.warn(`Slot ${location.slotIndex + i} is not available for expansion:`, nextSlot.products);
                break;
            }
        }
        
        if (!canExpand) {
            alert(`Impossible d'agrandir - les emplacements suivants sont occupés`);
            return;
        }
    }
    
    // Apply the new expand height
    mode.expandHeight = nextExpandHeight;
    
    // If expanding, mark the slots as occupied
    if (mode.expandHeight > 0) {
        for (let i = 1; i <= mode.expandHeight; i++) {
            const nextSlot = getSlot(sectionId, location.storageIndex, location.slotIndex + i);
            if (nextSlot && Array.isArray(nextSlot.products) && nextSlot.products.length === 0) {
                nextSlot.products = null; // Mark as occupied
            }
        }
    }
    
    saveProductDisplayModes();
    saveSectionSlots(); // Save slot changes
    refreshDisplay();
    
    console.log(`Product ${sku} expand height toggled:`, mode.expandHeight);
}

// ============================================
// Drag and Drop with Slot System
// ============================================

function handleDragStart(e) {
    // Support all card types and empty slots
    const card = e.target.closest('.product-card, .door-product-card, .drawer-product-card');
    
    if (!card || !card.hasAttribute('draggable')) return;
    
    const slot = card.closest('.slot');
    const grid = card.closest('.products-grid');
    
    if (!grid) return;
    
    // Get storage and slot indexes from parent slot
    let storageIndex = -1;
    let slotIndex = -1;
    
    if (slot) {
        storageIndex = parseInt(slot.dataset.storageIndex);
        slotIndex = parseInt(slot.dataset.slotIndex);
    }

    dragState.draggedElement = card;
    dragState.draggedSku = card.dataset.sku;
    dragState.sourceGridId = grid.id;
    dragState.sourceStorageIndex = storageIndex;
    dragState.sourceSlotIndex = slotIndex;

    // Add visual feedback
    setTimeout(() => {
        card.classList.add('dragging');
    }, 0);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragState.draggedSku);
    
    console.log(`Drag start: SKU ${dragState.draggedSku} from storage ${storageIndex} slot ${slotIndex}`);
}

function handleDragEnd() {
    const card = dragState.draggedElement;
    
    if (card) {
        card.classList.remove('dragging');
    }

    // Perform the move if we have valid source and destination
    if (dragState.sourceGridId && dragState.sourceStorageIndex !== null && dragState.sourceSlotIndex !== null && 
        dragState.dropStorageIndex !== null && dragState.dropSlotIndex !== null && dragState.draggedSku) {
        
        const fromSection = dragState.sourceGridId;
        const toSection = dragState.sourceGridId; // Same grid for now
        
        // Only move if different slots
        const differentSlots = dragState.sourceStorageIndex !== dragState.dropStorageIndex || 
                              dragState.sourceSlotIndex !== dragState.dropSlotIndex;
        
        if (differentSlots) {
            const success = moveProduct(
                fromSection,
                dragState.sourceStorageIndex,
                dragState.sourceSlotIndex,
                toSection,
                dragState.dropStorageIndex,
                dragState.dropSlotIndex,
                dragState.draggedSku
            );
            
            if (success) {
                // Refresh display to show new layout
                refreshDisplay();
            }
        }
    }

    // Remove all visual feedback
    document.querySelectorAll('.product-card, .door-product-card, .drawer-product-card').forEach(c => {
        c.classList.remove('drag-over');
    });
    document.querySelectorAll('.slot, .door, .drawer').forEach(s => {
        s.classList.remove('drag-over', 'drag-invalid');
    });
    document.querySelectorAll('.products-grid').forEach(g => g.classList.remove('drag-active'));

    // Reset drag state
    dragState.draggedElement = null;
    dragState.draggedSku = null;
    dragState.sourceGridId = null;
    dragState.sourceStorageIndex = null;
    dragState.sourceSlotIndex = null;
    dragState.dropTarget = null;
    dragState.dropStorageIndex = null;
    dragState.dropSlotIndex = null;
}

function handleDragOver(e) {
    e.preventDefault();

    if (!dragState.draggedElement) return;

    const grid = e.target.closest('.products-grid');
    if (!grid || !dragState.sourceGridId) return;

    // Only allow drop in the same grid
    if (grid.id !== dragState.sourceGridId) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }

    // Find the slot being hovered over
    const slot = e.target.closest('.slot');
    console.log('DragOver - e.target:', e.target.className, 'slot found:', slot?.className, 'dataset:', slot?.dataset);
    let storageIndex = -1;
    let slotIndex = -1;
    
    if (slot) {
        storageIndex = parseInt(slot.dataset.storageIndex);
        slotIndex = parseInt(slot.dataset.slotIndex);
    }
    
    if (storageIndex === -1 || slotIndex === -1) {
        console.log('DragOver - No valid slot found. storageIndex:', storageIndex, 'slotIndex:', slotIndex);
        return;
    }
    
    // Check if this is a swap operation vs an add (sharing) operation
    const targetSlot = getSlot(grid.id, storageIndex, slotIndex);
    
    // Determine if this is a swap or an add:
    // Swap = slot is occupied AND cannot accept another product (full or incompatible)
    // Add = slot can accept the dragged product (empty or compatible split)
    let isSwap = false;
    if (targetSlot && Array.isArray(targetSlot.products) && targetSlot.products.length > 0) {
        const draggedMode = getProductDisplayMode(dragState.draggedSku);
        
        if (targetSlot.products.length === 2) {
            // Slot is full (2 splits) - must be a swap
            isSwap = true;
        } else if (targetSlot.products.length === 1) {
            const existingProduct = allProducts.find(p => p.sku === targetSlot.products[0]);
            if (existingProduct) {
                const existingMode = getProductDisplayMode(existingProduct.sku);
                // If both are split, it's an ADD (sharing), not a swap
                // Otherwise it's a swap
                isSwap = !(draggedMode.split && existingMode.split);
            }
        }
    }
    
    // Check if we can add to this slot
    const canAdd = canAddToSlot(grid.id, storageIndex, slotIndex, dragState.draggedSku, isSwap);
    
    if (canAdd) {
        e.dataTransfer.dropEffect = 'move';
        grid.classList.add('drag-active');
        if (slot) {
            slot.classList.add('drag-over');
            slot.classList.remove('drag-invalid');
        }
        dragState.dropStorageIndex = storageIndex;
        dragState.dropSlotIndex = slotIndex;
    } else {
        e.dataTransfer.dropEffect = 'none';
        if (slot) {
            slot.classList.add('drag-invalid');
            slot.classList.remove('drag-over');
        }
        dragState.dropStorageIndex = null;
        dragState.dropSlotIndex = null;
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // The move will be handled in handleDragEnd
    return false;
}

function handleDragEnter(e) {
    // Visual feedback handled in handleDragOver
}

function handleDragLeave(e) {
    const slot = e.target.closest('.slot, .door, .drawer');
    if (slot) {
        slot.classList.remove('drag-over', 'drag-invalid');
    }
}

function initializeDragAndDrop() {
    // Use event delegation on the main container for all dynamically created cards
    const mainElement = document.querySelector('main');
    
    if (mainElement) {
        // Remove any existing listeners to avoid duplicates
        mainElement.removeEventListener('dragstart', handleDragStart, true);
        mainElement.removeEventListener('dragend', handleDragEnd, true);
        mainElement.removeEventListener('dragover', handleDragOver, true);
        mainElement.removeEventListener('drop', handleDrop, true);
        mainElement.removeEventListener('dragenter', handleDragEnter, true);
        mainElement.removeEventListener('dragleave', handleDragLeave, true);
        
        // Add listeners with capture phase to catch all drag events
        mainElement.addEventListener('dragstart', handleDragStart, true);
        mainElement.addEventListener('dragend', handleDragEnd, true);
        mainElement.addEventListener('dragover', handleDragOver, true);
        mainElement.addEventListener('drop', handleDrop, true);
        mainElement.addEventListener('dragenter', handleDragEnter, true);
        mainElement.addEventListener('dragleave', handleDragLeave, true);
        
        console.log('Drag & drop initialized with event delegation (all events)');
    }
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
            <div class="storage-controls">
                <button class="btn-decrease-storage" data-section-id="${section.id}" title="Retirer un ${section.storageType === 'door' ? 'porte' : 'tiroir'}">−</button>
                <button class="btn-increase-storage" data-section-id="${section.id}" title="Ajouter un ${section.storageType === 'door' ? 'porte' : 'tiroir'}">+</button>
            </div>
            <button class="btn-delete-section" data-section-id="${section.id}" title="Supprimer cette section">🗑️</button>
        </div>
    `;
    
    // Add click handlers
    item.querySelector('.btn-delete-section').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSection(section.id);
    });
    
    item.querySelector('.btn-increase-storage').addEventListener('click', (e) => {
        e.stopPropagation();
        adjustSectionStorageCount(section.id, 1);
    });
    
    item.querySelector('.btn-decrease-storage').addEventListener('click', (e) => {
        e.stopPropagation();
        adjustSectionStorageCount(section.id, -1);
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
    
    // Ne permettre que la création de nouvelles sections
    currentEditingSectionId = null;
    
    // Create new section only
    title.textContent = 'Nouvelle section';
    deleteBtn.style.display = 'none';
    resetSectionEditor();
    
    modal.classList.add('active');
}

function closeSectionEditorModal() {
    const modal = document.getElementById('sectionEditorModal');
    modal.classList.remove('active');
    currentEditingSectionId = null;
}

// Fonction populateSectionEditor supprimée - édition de sections désactivée

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
    
    // Create section data (création seulement - pas d'édition)
    const sectionData = {
        id: generateSectionId(),
        name,
        formats,
        strainTypes,
        storageType,
        storageCount,
        wallPosition,
        visible: true,
        order: sectionsConfig.length + 1
    };
    
    // Add new section only
    addSection(sectionData);
    
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

// Fonction pour ajuster le nombre d'unités de rangement d'une section
function adjustSectionStorageCount(sectionId, delta) {
    if (!sectionId) return;
    
    const section = getSectionById(sectionId);
    if (!section) {
        console.error('Section not found:', sectionId);
        return;
    }
    
    const newCount = section.storageCount + delta;
    
    // Minimum 1, maximum 30
    if (newCount < 1) {
        alert('Une section doit avoir au moins 1 unité de rangement.');
        return;
    }
    
    if (newCount > 30) {
        alert('Une section ne peut pas avoir plus de 30 unités de rangement.');
        return;
    }
    
    // Update storage count in section config
    section.storageCount = newCount;
    saveSectionsConfig();
    
    // Update sectionSlots structure to match new count
    const gridId = `${sectionId}-grid`;
    let sectionData = sectionSlots[gridId];
    
    // Initialize if not exists
    if (!sectionData || !sectionData.storages) {
        const slotsPerStorage = section.storageType === 'door' ? 
            CONFIG.DOOR_CONFIG.productsPerDoor : 
            CONFIG.DRAWER_CONFIG.productsPerDrawer;
        sectionData = initializeSectionStorages(gridId, section.storageType, section.storageCount, slotsPerStorage);
    }
    
    if (sectionData && sectionData.storages) {
        const currentCount = sectionData.storages.length;
        const slotsPerStorage = sectionData.slotsPerStorage;
        
        if (delta > 0) {
            // Adding storage units
            for (let i = 0; i < delta; i++) {
                const newIndex = currentCount + i;
                const slots = [];
                
                // Create slots for this new storage
                for (let j = 0; j < slotsPerStorage; j++) {
                    slots.push({
                        index: j,
                        products: [] // Empty slot
                    });
                }
                
                sectionData.storages.push({
                    index: newIndex,
                    slots: slots
                });
            }
            console.log(`Ajouté ${delta} unité(s) de rangement à la section "${section.name}"`);
        } else if (delta < 0) {
            // Removing storage units - check if they contain products first
            const unitsToRemove = Math.abs(delta);
            const startIndex = currentCount - unitsToRemove;
            
            // Check if any of the storages to be removed contain products
            let hasProducts = false;
            for (let i = startIndex; i < currentCount; i++) {
                const storage = sectionData.storages[i];
                if (storage && storage.slots) {
                    for (const slot of storage.slots) {
                        if (Array.isArray(slot.products) && slot.products.length > 0) {
                            hasProducts = true;
                            break;
                        }
                    }
                }
                if (hasProducts) break;
            }
            
            if (hasProducts) {
                if (!confirm(`Attention: Les dernières unités de rangement contiennent des produits. Voulez-vous vraiment les supprimer?\n\nLes produits seront retirés de cette section.`)) {
                    // Restore original count
                    section.storageCount = currentCount;
                    saveSectionsConfig();
                    return;
                }
            }
            
            // Remove the last 'unitsToRemove' storages
            sectionData.storages.splice(startIndex, unitsToRemove);
            console.log(`Retiré ${unitsToRemove} unité(s) de rangement de la section "${section.name}"`);
        }
        
        // Save updated slots structure
        saveSectionSlots();
    }
    
    // Re-render sections list to show updated count
    renderSectionsList();
    
    // If section is on current wall, regenerate HTML and re-render
    if (section.wallPosition === currentWall) {
        regenerateSectionsHTML();
        renderProducts();
    }
    
    const storageType = section.storageType === 'door' ? 'portes' : 'tiroirs';
    console.log(`Section "${section.name}" mise à jour: ${newCount} ${storageType}`);
}

// Fonction pour supprimer une section directement depuis la liste
function deleteSection(sectionId) {
    if (!sectionId) return;
    
    const section = getSectionById(sectionId);
    if (!section) {
        console.error('Section not found:', sectionId);
        return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer la section "${section.name}"?\n\nCette action est irréversible.`)) {
        const wasOnCurrentWall = section.wallPosition === currentWall;
        
        removeSection(sectionId);
        renderSectionsList();
        
        // Only regenerate HTML if the deleted section was on the currently displayed wall
        if (wasOnCurrentWall) {
            // Regenerate the HTML structure
            regenerateSectionsHTML();
            
            // Re-render products
            renderProducts();
        }
        
        console.log('Section supprimée:', section.name);
    }
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
    
    // Initialize section drag and drop (IMPORTANT: doit être après l'ajout au DOM)
    setTimeout(() => {
        initializeSectionDragDrop();
    }, 0);
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
    
    // Create icon element
    const iconSpan = document.createElement('span');
    iconSpan.className = 'section-icon';
    iconSpan.style.color = iconColor;
    iconSpan.textContent = '●';
    
    // Create title element
    const titleH2 = document.createElement('h2');
    titleH2.textContent = section.name;
    
    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'section-edit-btn';
    editBtn.innerHTML = '<span>✏️</span> Éditer';
    editBtn.title = 'Ouvrir l\'éditeur de section';
    editBtn.setAttribute('aria-label', `Éditer la section ${section.name}`);
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSectionFullEditorModal(section.id);
    });
    
    // Create product count
    const countSpan = document.createElement('span');
    countSpan.className = 'product-count';
    countSpan.id = `${section.id}-count`;
    countSpan.textContent = '0';
    
    // Create storage type indicator
    const storageSpan = document.createElement('span');
    if (section.storageType === 'door') {
        storageSpan.className = 'storage-indicator storage-door';
        storageSpan.title = 'Section avec portes';
        storageSpan.textContent = `🚪 ${section.storageCount}`;
    } else if (section.storageType === 'drawer') {
        storageSpan.className = 'storage-indicator storage-drawer';
        storageSpan.title = 'Section avec tiroirs';
        storageSpan.textContent = `📦 ${section.storageCount}`;
    }
    
    // Append all elements
    header.appendChild(iconSpan);
    header.appendChild(titleH2);
    header.appendChild(editBtn);
    header.appendChild(countSpan);
    if (storageSpan.className) {
        header.appendChild(storageSpan);
    }
    
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

// Vérifier si un produit correspond vraiment à une section (format ET type)
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
                // Check if format matches exactly (case-insensitive)
                if (product.format && product.format.toLowerCase() === 'hashish') {
                    formatMatch = true;
                } else {
                    // Also check in name, format, or brand for hashish/hash keywords
                    const searchText = (product.name + ' ' + product.format + ' ' + (product.brand || '')).toLowerCase();
                    if (searchText.includes('hashish') || 
                        searchText.includes('hash') ||
                        searchText.includes('haschich') ||
                        searchText.includes('haschisch')) formatMatch = true;
                }
                break;
            case 'edible':
                // Check if format matches exactly
                if (product.format && product.format.toLowerCase() === 'mangeable') {
                    formatMatch = true;
                } else {
                    if (product.name.toLowerCase().includes('mangeable') ||
                        product.name.toLowerCase().includes('edible')) formatMatch = true;
                }
                break;
            case 'infused':
                // Check if format matches exactly
                if (product.format && product.format.toLowerCase() === 'infusé') {
                    formatMatch = true;
                } else {
                    if (product.name.toLowerCase().includes('infusé') ||
                        product.name.toLowerCase().includes('infused')) formatMatch = true;
                }
                break;
            case 'oil':
                // Check if format matches exactly
                if (product.format && product.format.toLowerCase() === 'huile') {
                    formatMatch = true;
                } else {
                    if (product.name.toLowerCase().includes('huile') ||
                        product.name.toLowerCase().includes('oil')) formatMatch = true;
                }
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



// Store ID management functions
function openStoreIdModal() {
    const modal = document.getElementById('storeIdModal');
    const input = document.getElementById('storeIdInput');
    
    input.value = storeId;
    modal.classList.add('active');
    
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

function closeStoreIdModal() {
    const modal = document.getElementById('storeIdModal');
    modal.classList.remove('active');
}

function saveStoreIdFromModal() {
    const input = document.getElementById('storeIdInput');
    const newStoreId = input.value.trim();
    
    if (!newStoreId) {
        showValidationError('Le numéro de succursale ne peut pas être vide');
        return;
    }
    
    // Validate format (optional: numbers only or alphanumeric)
    if (!/^[0-9]+$/.test(newStoreId)) {
        showValidationError('Le numéro de succursale doit contenir uniquement des chiffres');
        return;
    }
    
    saveStoreId(newStoreId);
    updateStoreIdDisplay();
    closeStoreIdModal();
}

function updateStoreIdDisplay() {
    const display = document.getElementById('storeIdDisplay');
    if (display) {
        display.textContent = storeId;
    }
}

// Store ID management functions
function openStoreIdModal() {
    const modal = document.getElementById('storeIdModal');
    const input = document.getElementById('storeIdInput');
    
    input.value = storeId;
    modal.classList.add('active');
    
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

function closeStoreIdModal() {
    const modal = document.getElementById('storeIdModal');
    modal.classList.remove('active');
}

function saveStoreIdFromModal() {
    const input = document.getElementById('storeIdInput');
    const newStoreId = input.value.trim();
    
    if (!newStoreId) {
        showValidationError('Le numéro de succursale ne peut pas être vide');
        return;
    }
    
    // Validate format (optional: numbers only or alphanumeric)
    if (!/^[0-9]+$/.test(newStoreId)) {
        showValidationError('Le numéro de succursale doit contenir uniquement des chiffres');
        return;
    }
    
    saveStoreId(newStoreId);
    updateStoreIdDisplay();
    closeStoreIdModal();
}

function updateStoreIdDisplay() {
    const display = document.getElementById('storeIdDisplay');
    if (display) {
        display.textContent = storeId;
    }
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
        // Check if clicking remove button - must check this FIRST
        const removeBtn = e.target.closest('.product-remove-btn');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const sku = removeBtn.dataset.sku;
            if (sku) {
                removeProductFromSection(sku);
            }
            return;
        }
        
        // Check if clicking split button
        const splitBtn = e.target.closest('.product-split-btn');
        if (splitBtn) {
            e.preventDefault();
            e.stopPropagation();
            const sku = splitBtn.dataset.sku;
            if (sku) {
                toggleProductSplit(sku);
            }
            return;
        }
        
        // Check if clicking expand button
        const expandBtn = e.target.closest('.product-expand-btn');
        if (expandBtn) {
            e.preventDefault();
            e.stopPropagation();
            const sku = expandBtn.dataset.sku;
            if (sku) {
                toggleProductExpandHeight(sku);
            }
            return;
        }
        
        // Check if clicking on a door or drawer itself (not a product card inside)
        const door = e.target.closest('.door');
        const drawer = e.target.closest('.drawer');
        const productCard = e.target.closest('.product-card, .door-product-card, .drawer-product-card');
        
        // If clicking on a product card, open edit modal and stop propagation to prevent door/drawer from opening
        if (productCard) {
            e.stopPropagation(); // Stop propagation to parent door/drawer
            const sku = productCard.dataset.sku;
            if (sku) {
                openEditModalBySku(sku);
            }
            return;
        }
        
        // If clicking directly on door/drawer (not on a product card), toggle open/close
        if (door) {
            door.classList.toggle('open');
            return;
        }
        
        if (drawer) {
            drawer.classList.toggle('open');
            return;
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
            const storeIdModal = document.getElementById('storeIdModal');
            const sectionFullEditorModal = document.getElementById('sectionFullEditorModal');

            if (imageModal && imageModal.classList.contains('active')) {
                closeImageViewer();
            } else if (sectionFullEditorModal && sectionFullEditorModal.classList.contains('active')) {
                closeSectionFullEditorModal(false);
            } else if (addProductModal && addProductModal.classList.contains('active')) {
                closeAddProductModal();
            } else if (sectionEditorModal && sectionEditorModal.classList.contains('active')) {
                closeSectionEditorModal();
            } else if (sectionManagerModal && sectionManagerModal.classList.contains('active')) {
                closeSectionManagerModal();
            } else if (storeIdModal && storeIdModal.classList.contains('active')) {
                closeStoreIdModal();
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
    
    // Store ID button and modal
    const storeIdBtn = document.getElementById('storeIdBtn');
    if (storeIdBtn) {
        storeIdBtn.addEventListener('click', openStoreIdModal);
    }
    
    const storeIdModalCloseBtn = document.getElementById('storeIdModalCloseBtn');
    const storeIdCancelBtn = document.getElementById('storeIdCancelBtn');
    const storeIdSaveBtn = document.getElementById('storeIdSaveBtn');
    const storeIdModal = document.getElementById('storeIdModal');
    
    if (storeIdModalCloseBtn) {
        storeIdModalCloseBtn.addEventListener('click', closeStoreIdModal);
    }
    if (storeIdCancelBtn) {
        storeIdCancelBtn.addEventListener('click', closeStoreIdModal);
    }
    if (storeIdSaveBtn) {
        storeIdSaveBtn.addEventListener('click', saveStoreIdFromModal);
    }
    if (storeIdModal) {
        storeIdModal.addEventListener('click', (e) => {
            if (e.target === storeIdModal) {
                closeStoreIdModal();
            }
        });
    }
    
    // Store ID input - submit on Enter
    const storeIdInput = document.getElementById('storeIdInput');
    if (storeIdInput) {
        storeIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveStoreIdFromModal();
            }
        });
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
    
    // Add product mode toggle
    document.querySelectorAll('input[name="addProductMode"]').forEach(radio => {
        radio.addEventListener('change', toggleAddProductMode);
    });
    
    // Generate SKU button
    const generateSkuBtn = document.getElementById('generateSkuBtn');
    if (generateSkuBtn) {
        generateSkuBtn.addEventListener('click', generateAutoSku);
    }
    
    // Section Full Editor Modal handlers
    const sectionFullEditorCloseBtn = document.getElementById('sectionFullEditorCloseBtn');
    const sectionFullEditorCancelBtn = document.getElementById('sectionFullEditorCancelBtn');
    const sectionFullEditorSaveBtn = document.getElementById('sectionFullEditorSaveBtn');
    const addStorageBtn = document.getElementById('addStorageBtn');
    const removeStorageBtn = document.getElementById('removeStorageBtn');
    const sidebarSearchInput = document.getElementById('sidebarSearchInput');
    
    if (sectionFullEditorCloseBtn) {
        sectionFullEditorCloseBtn.addEventListener('click', () => closeSectionFullEditorModal(false));
    }
    if (sectionFullEditorCancelBtn) {
        sectionFullEditorCancelBtn.addEventListener('click', () => closeSectionFullEditorModal(false));
    }
    if (sectionFullEditorSaveBtn) {
        sectionFullEditorSaveBtn.addEventListener('click', () => closeSectionFullEditorModal(true));
    }
    if (addStorageBtn) {
        addStorageBtn.addEventListener('click', addStorageUnit);
    }
    if (removeStorageBtn) {
        removeStorageBtn.addEventListener('click', removeStorageUnit);
    }
    if (sidebarSearchInput) {
        sidebarSearchInput.addEventListener('input', (e) => handleSidebarSearch(e.target.value));
    }
    
    // Sidebar filter buttons
    document.querySelectorAll('.sidebar-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            handleSidebarFilter(btn.dataset.filter);
        });
    });
}

// ============================================
// Remove Product from Section
// ============================================

// Make function globally accessible for inline onclick handlers
window.removeProductFromSection = function(sku) {
    const product = allProducts.find(p => p.sku === sku);
    if (!product) return;
    
    if (confirm(`Voulez-vous retirer "${product.name}" de cette section?\n\nNote: Le produit sera caché mais pas supprimé définitivement. Vous pourrez le rajouter plus tard.`)) {
        // Find and remove product from its slot first
        let productRemoved = false;
        for (const sectionId in sectionSlots) {
            const slotLocation = findProductSlot(sectionId, sku);
            if (slotLocation) {
                console.log(`Removing product ${sku} from section ${sectionId}, storage ${slotLocation.storageIndex}, slot ${slotLocation.slotIndex}`);
                const success = removeProductFromSlot(sectionId, slotLocation.storageIndex, slotLocation.slotIndex, sku);
                if (success) {
                    productRemoved = true;
                    console.log(`✓ Product removed from slot and expanded slots freed`);
                    break; // Product found and removed
                }
            }
        }
        
        if (!productRemoved) {
            console.log(`Product ${sku} not found in any slot - may not be assigned yet`);
        }
        
        // Save as hidden product
        saveHiddenProduct(sku);
        
        // Remove from allProducts for immediate UI update
        // The slot will remain visible as "empty" thanks to createSlotElement logic
        allProducts = allProducts.filter(p => p.sku !== sku);
        
        // Refresh display
        refreshDisplay();
        
        console.log('Produit retiré:', product.name);
    }
};

function saveHiddenProduct(sku) {
    try {
        let hiddenProducts = [];
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HIDDEN_PRODUCTS);
        if (saved) {
            hiddenProducts = JSON.parse(saved);
        }
        
        if (!hiddenProducts.includes(sku)) {
            hiddenProducts.push(sku);
            localStorage.setItem(CONFIG.STORAGE_KEYS.HIDDEN_PRODUCTS, JSON.stringify(hiddenProducts));
        }
    } catch (error) {
        handleStorageError(error, 'hidden products');
    }
}

function removeFromHiddenProducts(sku) {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HIDDEN_PRODUCTS);
        if (saved) {
            let hiddenProducts = JSON.parse(saved);
            hiddenProducts = hiddenProducts.filter(s => s !== sku);
            localStorage.setItem(CONFIG.STORAGE_KEYS.HIDDEN_PRODUCTS, JSON.stringify(hiddenProducts));
        }
    } catch (error) {
        handleStorageError(error, 'removing from hidden products');
    }
}

function loadHiddenProducts() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HIDDEN_PRODUCTS);
        if (saved) {
            const hiddenProducts = JSON.parse(saved);
            // Remove hidden products from allProducts
            allProducts = allProducts.filter(p => !hiddenProducts.includes(p.sku));
        }
    } catch (error) {
        console.error('Error loading hidden products:', error);
    }
}

// ============================================
// Add Product Modal Functions
// ============================================

function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    
    // Reset mode to existing
    document.querySelector('input[name="addProductMode"][value="existing"]').checked = true;
    
    // Reset form
    document.getElementById('addProductName').value = '';
    document.getElementById('addProductBrand').value = '';
    document.getElementById('addProductSku').value = '';
    document.getElementById('addProductThc').value = '';
    document.getElementById('addProductCbd').value = '';
    document.getElementById('searchExistingProduct').value = '';
    
    // Populate section selects
    populateAddProductSectionSelect();
    populateAddProductTargetSectionSelect();
    
    // Populate format select
    populateAddProductFormatSelect();
    
    // Populate existing products list
    populateExistingProductsList();
    
    // Show/hide sections based on mode
    toggleAddProductMode();
    
    // Clear any previous errors
    const errorDiv = document.getElementById('addProductError');
    if (errorDiv) {
        errorDiv.remove();
    }
    
    // Show modal
    modal.classList.add('active');
    
    // Focus first field
    setTimeout(() => {
        document.getElementById('searchExistingProduct').focus();
    }, 100);
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    modal.classList.remove('active');
}

function populateAddProductSectionSelect() {
    const select = document.getElementById('addProductType');
    select.innerHTML = '';
    
    // Add options for each strain type (excluding 'Tous')
    Object.values(CONFIG.SECTION_CONFIG.STRAIN_TYPES).forEach(type => {
        if (type === 'Tous') return; // Skip 'Tous' option
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    });
}

function populateAddProductTargetSectionSelect() {
    const select = document.getElementById('addProductTargetSection');
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

function populateExistingProductsList() {
    const select = document.getElementById('addExistingProduct');
    const searchInput = document.getElementById('searchExistingProduct');
    
    const updateList = (searchTerm = '') => {
        select.innerHTML = '';
        
        // Get all available products (original data + user-created products from localStorage)
        let existingProducts = [...(window.PRODUCTS_DATA || [])];
        
        // Add user-created products from localStorage
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.NEW_PRODUCTS);
            if (saved) {
                const newProducts = JSON.parse(saved);
                // Merge with existing, avoiding duplicates
                newProducts.forEach(product => {
                    if (!existingProducts.find(p => p.sku === product.sku)) {
                        existingProducts.push(product);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading new products for list:', error);
        }
        
        // Get SKUs of products that are displayed in ANY section
        const displayedSkus = new Set();
        
        // Check all sections for displayed products
        sectionsConfig.forEach(section => {
            if (!section.visible) return;
            
            const sectionId = `${section.id}-grid`;
            const sectionData = sectionSlots[sectionId];
            
            if (sectionData && sectionData.storages) {
                sectionData.storages.forEach(storage => {
                    storage.slots.forEach(slot => {
                        if (Array.isArray(slot.products)) {
                            slot.products.forEach(sku => displayedSkus.add(sku));
                        }
                    });
                });
            }
        });
        
        // Filter out products that are already displayed in any section
        const notDisplayed = existingProducts.filter(p => !displayedSkus.has(p.sku));
        
        // Filter by search term
        const filtered = notDisplayed.filter(p => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return p.name.toLowerCase().includes(term) || 
                   p.brand.toLowerCase().includes(term) ||
                   p.sku.toLowerCase().includes(term);
        });
        
        // Sort by name
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        // Add options
        filtered.forEach(product => {
            const option = document.createElement('option');
            option.value = product.sku;
            option.textContent = `${product.name} - ${product.brand} (${product.format})`;
            option.dataset.productData = JSON.stringify(product);
            select.appendChild(option);
        });
        
        if (filtered.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Aucun produit disponible';
            option.disabled = true;
            select.appendChild(option);
        }
    };
    
    // Initial population
    updateList();
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        updateList(e.target.value);
    });
}

function toggleAddProductMode() {
    const mode = document.querySelector('input[name="addProductMode"]:checked').value;
    const existingFields = document.getElementById('existingProductFields');
    const newFields = document.getElementById('newProductFields');
    
    if (mode === 'existing') {
        existingFields.style.display = 'block';
        newFields.style.display = 'none';
    } else {
        existingFields.style.display = 'none';
        newFields.style.display = 'block';
    }
}

function generateAutoSku() {
    // Generate a random 8-digit SKU
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const sku = timestamp + random;
    
    // Check if SKU already exists
    if (allProducts.find(p => p.sku === sku)) {
        // Try again if duplicate (very unlikely)
        generateAutoSku();
        return;
    }
    
    // Set the SKU input value
    document.getElementById('addProductSku').value = sku;
    
    console.log('SKU auto-généré:', sku);
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
    const mode = document.querySelector('input[name="addProductMode"]:checked').value;
    const targetSectionId = document.getElementById('addProductTargetSection').value;
    
    if (!targetSectionId) {
        showAddProductError('La section cible est requise');
        return;
    }
    
    // Get section to determine type
    const section = getSectionById(targetSectionId);
    if (!section) {
        showAddProductError('Section invalide');
        return;
    }
    
    let product;
    
    if (mode === 'existing') {
        // Add existing product
        const select = document.getElementById('addExistingProduct');
        const selectedOption = select.options[select.selectedIndex];
        
        if (!selectedOption || !selectedOption.dataset.productData) {
            showAddProductError('Veuillez sélectionner un produit');
            return;
        }
        
        const existingProduct = JSON.parse(selectedOption.dataset.productData);
        
        // Check if already in allProducts (already added to a section)
        if (!allProducts.find(p => p.sku === existingProduct.sku)) {
            // Add to allProducts
            product = { ...existingProduct };
            allProducts.push(product);
        } else {
            product = allProducts.find(p => p.sku === existingProduct.sku);
        }
        
        // Remove from hidden products if it was hidden before
        removeFromHiddenProducts(existingProduct.sku);
        
        // Update type to match section
        product.type = section.strainTypes[0];
        saveProductTypeChange(product.sku, product.type);
        
    } else {
        // Create new product
        const name = document.getElementById('addProductName').value.trim();
        const brand = document.getElementById('addProductBrand').value.trim();
        const sku = document.getElementById('addProductSku').value.trim();
        const type = document.getElementById('addProductType').value;
        const format = document.getElementById('addProductFormat').value;
        const thc = document.getElementById('addProductThc').value.trim();
        const cbd = document.getElementById('addProductCbd').value.trim();
        
        // Validate required fields
        if (!name) {
            showAddProductError('Le nom du produit est requis');
            return;
        }
        // Brand is optional - use default if empty
        const brandValue = brand || 'Sans marque';
        if (!sku) {
            showAddProductError('Le SKU est requis');
            return;
        }
        if (!type) {
            showAddProductError('Le type de souche est requis');
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
        
        // Create new product object
        product = {
            name: name,
            brand: brandValue,
            sku: sku,
            type: type,
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
        allProducts.push(product);
        
        // Save to localStorage
        saveNewProductsToStorage();
    }
    
    // Assign product to the chosen section
    const gridId = `${targetSectionId}-grid`;
    
    // Initialize section storages if needed
    const sectionData = sectionSlots[gridId];
    if (!sectionData || !sectionData.storages) {
        const slotsPerStorage = section.storageType === 'door' ? 
            CONFIG.DOOR_CONFIG.productsPerDoor : 
            CONFIG.DRAWER_CONFIG.productsPerDrawer;
        initializeSectionStorages(gridId, section.storageType, section.storageCount, slotsPerStorage);
    }
    
    // Find first available empty slot in the chosen section
    let assigned = false;
    const storages = sectionSlots[gridId].storages;
    
    for (let i = 0; i < storages.length && !assigned; i++) {
        const storage = storages[i];
        for (let j = 0; j < storage.slots.length && !assigned; j++) {
            const slot = storage.slots[j];
            // Check if slot is empty and not occupied by expanded card
            if (Array.isArray(slot.products) && slot.products.length === 0) {
                // Add product to this empty slot
                if (addProductToSlot(gridId, i, j, product.sku)) {
                    assigned = true;
                    console.log(`Produit ${product.sku} assigné à la section ${targetSectionId}, storage ${i}, slot ${j}`);
                }
            }
        }
    }
    
    if (!assigned) {
        console.warn(`Impossible d'assigner le produit ${product.sku} à la section ${targetSectionId} - aucun emplacement vide disponible`);
        showAddProductError('Aucun emplacement vide dans cette section. Le produit a été ajouté mais doit être placé manuellement.');
    }
    
    // Close modal
    closeAddProductModal();
    
    // Refresh display
    refreshDisplay();
    
    console.log('Produit ajouté avec succès:', product);
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
    loadSectionSlots();
    loadProductDisplayModes();
    
    // Update store ID display
    updateStoreIdDisplay();
    
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
    storageType: null,
    hoveredSection: null,
    hoveredSectionId: null
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
    
    // Remove any existing event listeners to avoid duplicates
    header.removeEventListener('dragstart', handleSectionDragStart);
    header.removeEventListener('dragend', handleSectionDragEnd);
    section.removeEventListener('dragenter', handleSectionDragEnter);
    section.removeEventListener('dragover', handleSectionDragOver);
    section.removeEventListener('dragleave', handleSectionDragLeave);
    section.removeEventListener('drop', handleSectionDrop);
    header.removeEventListener('dragover', handleSectionDragOver);
    header.removeEventListener('drop', handleSectionDrop);
    
    // Add event listeners on header for drag start/end
    header.addEventListener('dragstart', handleSectionDragStart);
    header.addEventListener('dragend', handleSectionDragEnd);
    
    // Add event listeners on section for drop zone
    section.addEventListener('dragenter', handleSectionDragEnter);
    section.addEventListener('dragover', handleSectionDragOver);
    section.addEventListener('dragleave', handleSectionDragLeave);
    section.addEventListener('drop', handleSectionDrop);
    
    // IMPORTANT: Also add dragover and drop on header to catch events
    header.addEventListener('dragover', handleSectionDragOver);
    header.addEventListener('drop', handleSectionDrop);
}

function handleSectionDragStart(e) {
    const section = e.target.closest('.strain-section');
    if (!section) return;
    
    sectionDragState.draggedSection = section;
    sectionDragState.draggedSectionId = section.dataset.sectionId;
    sectionDragState.storageType = section.dataset.storageType;
    sectionDragState.sourceRow = section.closest('.sections-row-doors, .sections-row-drawers');
    
    section.classList.add('dragging-section');
    
    // IMPORTANT: Désactiver les pointer-events sur tous les enfants pour permettre le drop sur la section
    const allSections = document.querySelectorAll('.strain-section');
    allSections.forEach(s => {
        const subsection = s.querySelector('.subsection');
        if (subsection) {
            subsection.style.pointerEvents = 'none';
        }
    });
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionDragState.draggedSectionId);
    
    // Add visual feedback to the row
    if (sectionDragState.sourceRow) {
        sectionDragState.sourceRow.classList.add('drag-active-row');
    }
}

function handleSectionDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    
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
    // IMPORTANT: toujours appeler preventDefault pour permettre le drop
    e.preventDefault();
    e.stopPropagation();
    
    const targetSection = e.currentTarget;
    
    if (!targetSection.classList.contains('strain-section')) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    // Check if we're dragging a section
    if (!sectionDragState.draggedSection) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    // Don't allow drop on self
    if (targetSection === sectionDragState.draggedSection) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    // Also check by ID to be extra sure
    if (targetSection.dataset.sectionId === sectionDragState.draggedSectionId) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    // Only allow drop if storage types match
    const targetStorageType = targetSection.dataset.storageType;
    if (targetStorageType !== sectionDragState.storageType) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    // Valid drop target
    e.dataTransfer.dropEffect = 'move';
    targetSection.classList.add('drag-over-section');
    
    // Store the hovered section for manual drop handling
    sectionDragState.hoveredSection = targetSection;
    sectionDragState.hoveredSectionId = targetSection.dataset.sectionId;
}

function handleSectionDragLeave(e) {
    const targetSection = e.currentTarget;
    if (!targetSection.classList.contains('strain-section')) return;
    
    targetSection.classList.remove('drag-over-section');
}

function handleSectionDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Find the section - might be the currentTarget or need to search up
    let targetSection = e.currentTarget;
    if (!targetSection.classList.contains('strain-section')) {
        targetSection = e.currentTarget.closest('.strain-section');
    }
    
    if (!targetSection || !targetSection.classList.contains('strain-section')) {
        return;
    }
    
    targetSection.classList.remove('drag-over-section');
    
    // Don't allow drop on self
    if (targetSection === sectionDragState.draggedSection) {
        console.log('Drop on self, returning');
        return;
    }
    
    // Only allow drop if storage types match
    const targetStorageType = targetSection.dataset.storageType;
    if (targetStorageType !== sectionDragState.storageType) {
        return;
    }
    
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
    
    // Perform the reorder if we have a valid target
    if (sectionDragState.draggedSectionId && 
        sectionDragState.hoveredSectionId && 
        sectionDragState.draggedSectionId !== sectionDragState.hoveredSectionId) {
        
        reorderSections(sectionDragState.draggedSectionId, sectionDragState.hoveredSectionId);
    }
    
    // Remove drag over class from all sections
    document.querySelectorAll('.strain-section').forEach(s => {
        s.classList.remove('drag-over-section');
    });
    
    // IMPORTANT: Restaurer les pointer-events sur tous les enfants
    const allSections = document.querySelectorAll('.strain-section');
    allSections.forEach(s => {
        const subsection = s.querySelector('.subsection');
        if (subsection) {
            subsection.style.pointerEvents = '';
        }
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
    sectionDragState.hoveredSection = null;
    sectionDragState.hoveredSectionId = null;
}

function reorderSections(draggedId, targetId) {
    // Find the dragged and target sections in config
    const draggedIndex = sectionsConfig.findIndex(s => s.id === draggedId);
    const targetIndex = sectionsConfig.findIndex(s => s.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
        return;
    }
    
    // Remove dragged section from array
    const [draggedSection] = sectionsConfig.splice(draggedIndex, 1);
    
    // Insert at new position (before or after target depending on direction)
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

// ============================================
// SECTION FULL EDITOR MODAL
// ============================================

let sectionFullEditorState = {
    isOpen: false,
    currentSectionId: null,
    originalSectionSlots: null, // Backup for cancel
    placedProducts: new Set() // Track which products are placed
};

/**
 * Open the full-screen section editor modal
 * @param {string} sectionId - The ID of the section to edit
 */
function openSectionFullEditorModal(sectionId) {
    console.log('Opening section full editor for:', sectionId);
    
    const section = getSectionById(sectionId);
    if (!section) {
        console.error('Section not found:', sectionId);
        alert('Erreur: Section introuvable');
        return;
    }
    
    // Store current state
    sectionFullEditorState.isOpen = true;
    sectionFullEditorState.currentSectionId = sectionId;
    
    // Backup current section slots for cancel functionality
    const gridId = `${sectionId}-grid`;
    if (sectionSlots[gridId]) {
        sectionFullEditorState.originalSectionSlots = JSON.parse(JSON.stringify(sectionSlots[gridId]));
    }
    
    // Get modal elements
    const modal = document.getElementById('sectionFullEditorModal');
    if (!modal) {
        console.error('Modal element not found in DOM');
        alert('Erreur: Modal introuvable dans le DOM');
        return;
    }
    const title = document.getElementById('sectionFullEditorTitle');
    const canvasSectionName = document.getElementById('canvasSectionName');
    const canvasStorageType = document.getElementById('canvasStorageType');
    const canvasStorageCount = document.getElementById('canvasStorageCount');
    
    // Set title and info
    title.textContent = `Éditeur: ${section.name}`;
    canvasSectionName.textContent = section.name;
    canvasStorageType.textContent = section.storageType === 'door' ? '🚪 Portes' : '📦 Tiroirs';
    canvasStorageCount.textContent = `${section.storageCount} unités`;
    
    // Show modal
    modal.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Render canvas and palette
    renderSectionFullEditorCanvas();
    renderSectionFullEditorPalette();
    
    console.log('Section full editor opened for:', sectionId);
}

/**
 * Close the full-screen section editor modal
 * @param {boolean} save - Whether to save changes or cancel
 */
function closeSectionFullEditorModal(save = false) {
    if (!sectionFullEditorState.isOpen) return;
    
    const modal = document.getElementById('sectionFullEditorModal');
    
    if (!save) {
        // Restore original state if canceling
        if (sectionFullEditorState.originalSectionSlots && sectionFullEditorState.currentSectionId) {
            const gridId = `${sectionFullEditorState.currentSectionId}-grid`;
            sectionSlots[gridId] = sectionFullEditorState.originalSectionSlots;
        }
    } else {
        // Save changes to localStorage
        saveSectionSlots();
        
        // Refresh main view to show changes
        refreshDisplay();
    }
    
    // Hide modal
    modal.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear state
    sectionFullEditorState.isOpen = false;
    sectionFullEditorState.currentSectionId = null;
    sectionFullEditorState.originalSectionSlots = null;
    sectionFullEditorState.placedProducts.clear();
    
    console.log('Section full editor closed, saved:', save);
}

/**
 * Render the section canvas in the modal
 */
function renderSectionFullEditorCanvas() {
    const section = getSectionById(sectionFullEditorState.currentSectionId);
    if (!section) return;
    
    const canvasGrid = document.getElementById('sectionFullEditorCanvasGrid');
    const gridId = `${section.id}-grid`;
    
    // Clear canvas
    canvasGrid.innerHTML = '';
    
    // Apply appropriate class for layout
    canvasGrid.className = 'canvas-grid';
    if (section.storageType === 'door') {
        canvasGrid.classList.add('canvas-doors');
    } else {
        canvasGrid.classList.add('canvas-drawers');
    }
    
    // Initialize storage if needed
    const slotsPerStorage = section.storageType === 'door' ? 
        CONFIG.DOOR_CONFIG.productsPerDoor : 
        CONFIG.DRAWER_CONFIG.productsPerDrawer;
    
    initializeSectionStorages(gridId, section.storageType, section.storageCount, slotsPerStorage);
    
    const sectionData = sectionSlots[gridId];
    if (!sectionData || !sectionData.storages) return;
    
    // Track placed products
    sectionFullEditorState.placedProducts.clear();
    
    // Render each storage unit
    sectionData.storages.forEach((storage, storageIndex) => {
        const storageElement = section.storageType === 'door' ? 
            createDoorFromStorage(storage, storageIndex, gridId) :
            createDrawerFromStorage(storage, storageIndex, gridId);
        
        canvasGrid.appendChild(storageElement);
        
        // Track placed products
        storage.slots.forEach(slot => {
            if (Array.isArray(slot.products)) {
                slot.products.forEach(sku => sectionFullEditorState.placedProducts.add(sku));
            }
        });
    });
    
    // Update product count
    updateCanvasStats();
    
    // Initialize drag and drop for canvas
    initializeCanvasDragAndDrop();
}

/**
 * Get all available products including hidden ones
 * @returns {Array} All products from database and user-created
 */
function getAllAvailableProducts() {
    // Start with all products from database
    let availableProducts = [...(window.PRODUCTS_DATA || [])];
    
    // Add user-created products from localStorage
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.NEW_PRODUCTS);
        if (saved) {
            const newProducts = JSON.parse(saved);
            newProducts.forEach(product => {
                if (!availableProducts.find(p => p.sku === product.sku)) {
                    availableProducts.push(product);
                }
            });
        }
    } catch (error) {
        console.error('Error loading new products:', error);
    }
    
    // Add hidden products from localStorage (they should be available in palette)
    try {
        const hiddenSkus = localStorage.getItem(CONFIG.STORAGE_KEYS.HIDDEN_PRODUCTS);
        if (hiddenSkus) {
            const hiddenSkusList = JSON.parse(hiddenSkus);
            // Hidden products might be in PRODUCTS_DATA or NEW_PRODUCTS
            // They're not in allProducts, so we need to get them from original sources
            hiddenSkusList.forEach(sku => {
                const hiddenProduct = availableProducts.find(p => p.sku === sku);
                // Product already in availableProducts, no need to add
                if (hiddenProduct) {
                    // Mark it as hidden for UI purposes if needed
                    hiddenProduct.isHidden = true;
                }
            });
        }
    } catch (error) {
        console.error('Error loading hidden products:', error);
    }
    
    return availableProducts;
}

/**
 * Render the product palette sidebar
 */
function renderSectionFullEditorPalette() {
    const section = getSectionById(sectionFullEditorState.currentSectionId);
    if (!section) return;
    
    const palette = document.getElementById('sectionFullEditorPalette');
    const sidebarCount = document.getElementById('sidebarProductCount');
    
    // Get all available products (includes hidden and user-created)
    const allAvailableProducts = getAllAvailableProducts();
    
    // Filter by section criteria
    const allMatchingProducts = allAvailableProducts.filter(product => matchesSection(product, section));
    
    // Get all products that are currently placed in ANY section
    const placedInAnySection = new Set();
    sectionsConfig.forEach(sec => {
        if (!sec.visible) return;
        const gridId = `${sec.id}-grid`;
        const sectionData = sectionSlots[gridId];
        if (sectionData && sectionData.storages) {
            sectionData.storages.forEach(storage => {
                storage.slots.forEach(slot => {
                    if (Array.isArray(slot.products)) {
                        slot.products.forEach(sku => placedInAnySection.add(sku));
                    }
                });
            });
        }
    });
    
    // Filter to only show products that are NOT placed anywhere
    const unplacedProducts = allMatchingProducts.filter(product => 
        !placedInAnySection.has(product.sku)
    );
    
    // Clear palette
    palette.innerHTML = '';
    
    // Render each product as a draggable card
    unplacedProducts.forEach(product => {
        const card = createPaletteProductCard(product);
        palette.appendChild(card);
    });
    
    // Update count
    sidebarCount.textContent = `${unplacedProducts.length} produit${unplacedProducts.length !== 1 ? 's' : ''}`;
    
    // Apply empty class if needed
    if (unplacedProducts.length === 0) {
        palette.classList.add('empty');
    } else {
        palette.classList.remove('empty');
    }
}

/**
 * Create a product card for the palette
 */
function createPaletteProductCard(product) {
    const thcValue = product.manualThc || product.thcMax;
    
    const card = document.createElement('div');
    card.className = 'palette-product-card';
    card.dataset.type = product.type;
    card.dataset.sku = product.sku;
    card.setAttribute('draggable', 'true');
    
    if (isSpecialFormat(product.format)) {
        card.classList.add('special-format');
    }
    
    card.innerHTML = `
        <div class="palette-product-name">${product.name}</div>
        <div class="palette-product-thc">${thcValue}%</div>
    `;
    
    // Drag event handlers
    card.addEventListener('dragstart', handlePaletteDragStart);
    card.addEventListener('dragend', handlePaletteDragEnd);
    
    return card;
}

/**
 * Handle drag start from palette
 */
function handlePaletteDragStart(e) {
    const card = e.target;
    const sku = card.dataset.sku;
    
    card.classList.add('dragging-from-palette');
    
    // Store drag data
    dragState.draggedElement = card;
    dragState.draggedSku = sku;
    dragState.sourceGridId = 'palette'; // Special marker for palette source
    dragState.sourceStorageIndex = null;
    dragState.sourceSlotIndex = null;
    
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', sku);
    
    console.log('Drag from palette:', sku);
}

/**
 * Handle drag end from palette
 */
function handlePaletteDragEnd(e) {
    const card = e.target;
    card.classList.remove('dragging-from-palette');
    
    // Clean up drag state
    if (dragState.sourceGridId === 'palette') {
        dragState.draggedElement = null;
        dragState.draggedSku = null;
        dragState.sourceGridId = null;
    }
}

/**
 * Initialize drag and drop for canvas elements
 */
function initializeCanvasDragAndDrop() {
    const canvasGrid = document.getElementById('sectionFullEditorCanvasGrid');
    if (!canvasGrid) {
        console.error('Canvas grid not found');
        return;
    }
    
    console.log('Initializing canvas drag and drop');
    
    // Add drop handlers to all slots
    const slots = canvasGrid.querySelectorAll('.slot');
    console.log('Found slots:', slots.length);
    slots.forEach(element => {
        element.addEventListener('dragover', handleCanvasDragOver);
        element.addEventListener('drop', handleCanvasDrop);
        element.addEventListener('dragleave', handleCanvasDragLeave);
    });
    
    // Add drop handlers to doors/drawers themselves (for empty ones)
    const containers = canvasGrid.querySelectorAll('.door, .drawer');
    console.log('Found door/drawer containers:', containers.length);
    containers.forEach(element => {
        element.addEventListener('dragover', handleCanvasDragOver);
        element.addEventListener('drop', handleCanvasDrop);
        element.addEventListener('dragleave', handleCanvasDragLeave);
    });
    
    // Make existing products in canvas draggable
    const cards = canvasGrid.querySelectorAll('.door-product-card, .drawer-product-card');
    console.log('Found product cards:', cards.length);
    cards.forEach(card => {
        card.addEventListener('dragstart', handleCanvasProductDragStart);
        card.addEventListener('dragend', handleCanvasProductDragEnd);
    });
}

/**
 * Handle drag over canvas elements
 */
function handleCanvasDragOver(e) {
    e.preventDefault();
    
    if (!dragState.draggedSku) return;
    
    let dropTarget = e.currentTarget;
    const section = getSectionById(sectionFullEditorState.currentSectionId);
    const gridId = `${section.id}-grid`;
    
    // Get storage and slot indices
    let storageIndex = parseInt(dropTarget.dataset.storageIndex);
    let slotIndex = parseInt(dropTarget.dataset.slotIndex);
    
    // If we're on a slot, we have both indices
    if (!isNaN(storageIndex) && !isNaN(slotIndex)) {
        // Already on a slot, good to go
    }
    // If dropping on door/drawer container (not a slot), find the first empty slot
    else if (!isNaN(storageIndex) && isNaN(slotIndex)) {
        // We're on a door/drawer container, find first available slot
        const sectionData = sectionSlots[gridId];
        if (sectionData && sectionData.storages && sectionData.storages[storageIndex]) {
            const storage = sectionData.storages[storageIndex];
            // Find first empty or available slot
            let foundSlot = false;
            for (let i = 0; i < storage.slots.length; i++) {
                const slot = storage.slots[i];
                if (slot.products === null) continue; // Skip occupied by expansion
                if (!Array.isArray(slot.products) || slot.products.length === 0) {
                    slotIndex = i;
                    foundSlot = true;
                    break;
                }
            }
            // If no empty slot found, try first slot anyway (might allow stacking)
            if (!foundSlot) {
                slotIndex = 0;
            }
        } else {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
    }
    else {
        // Invalid drop target
        console.log('Invalid drop target, missing indices');
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    // Check if can add to slot
    const isFromPalette = dragState.sourceGridId === 'palette';
    const canAdd = canAddToSlot(gridId, storageIndex, slotIndex, dragState.draggedSku, !isFromPalette);
    
    // Apply visual feedback
    dropTarget.classList.remove('drop-zone-valid', 'drop-zone-invalid');
    if (canAdd) {
        dropTarget.classList.add('drop-zone-valid');
        e.dataTransfer.dropEffect = isFromPalette ? 'copy' : 'move';
    } else {
        dropTarget.classList.add('drop-zone-invalid');
        e.dataTransfer.dropEffect = 'none';
    }
    
    // Store drop target
    dragState.dropStorageIndex = storageIndex;
    dragState.dropSlotIndex = slotIndex;
}

/**
 * Handle drag leave from canvas elements
 */
function handleCanvasDragLeave(e) {
    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drop-zone-valid', 'drop-zone-invalid');
}

/**
 * Handle drop on canvas
 */
function handleCanvasDrop(e) {
    e.preventDefault();
    
    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drop-zone-valid', 'drop-zone-invalid');
    
    if (!dragState.draggedSku || dragState.dropStorageIndex === null || dragState.dropSlotIndex === null) {
        console.log('Drop failed: missing drag state', dragState);
        return;
    }
    
    const section = getSectionById(sectionFullEditorState.currentSectionId);
    const gridId = `${section.id}-grid`;
    
    const isFromPalette = dragState.sourceGridId === 'palette';
    
    console.log('Drop on canvas:', {
        sku: dragState.draggedSku,
        isFromPalette,
        storage: dragState.dropStorageIndex,
        slot: dragState.dropSlotIndex
    });
    
    if (isFromPalette) {
        // Ensure product is in allProducts (could be hidden or from database)
        let product = allProducts.find(p => p.sku === dragState.draggedSku);
        
        if (!product) {
            // Product not in allProducts, get it from available products
            const allAvailableProducts = getAllAvailableProducts();
            product = allAvailableProducts.find(p => p.sku === dragState.draggedSku);
            
            if (product) {
                console.log('Adding product to allProducts:', product.name);
                allProducts.push(product);
                
                // If it was hidden, remove from hidden list
                removeFromHiddenProducts(product.sku);
            } else {
                console.error('Product not found:', dragState.draggedSku);
                alert('Erreur: Produit introuvable');
                dragState.dropStorageIndex = null;
                dragState.dropSlotIndex = null;
                return;
            }
        }
        
        // Add product from palette to canvas
        const success = addProductToSlot(gridId, dragState.dropStorageIndex, dragState.dropSlotIndex, dragState.draggedSku);
        
        if (success) {
            console.log('Added product from palette to canvas');
            // Re-render canvas and palette
            renderSectionFullEditorCanvas();
            renderSectionFullEditorPalette();
        } else {
            console.error('Failed to add product to slot');
        }
    } else {
        // Move product within canvas
        const success = moveProduct(
            gridId,
            dragState.sourceStorageIndex,
            dragState.sourceSlotIndex,
            gridId,
            dragState.dropStorageIndex,
            dragState.dropSlotIndex,
            dragState.draggedSku
        );
        
        if (success) {
            console.log('Moved product within canvas');
            // Re-render canvas
            renderSectionFullEditorCanvas();
            renderSectionFullEditorPalette();
        } else {
            console.error('Failed to move product');
        }
    }
    
    // Reset drag state
    dragState.dropStorageIndex = null;
    dragState.dropSlotIndex = null;
}

/**
 * Handle drag start for products in canvas
 */
function handleCanvasProductDragStart(e) {
    const card = e.target;
    const sku = card.dataset.sku;
    const slot = card.closest('.slot');
    
    if (!slot) return;
    
    const storageIndex = parseInt(slot.dataset.storageIndex);
    const slotIndex = parseInt(slot.dataset.slotIndex);
    const gridId = `${sectionFullEditorState.currentSectionId}-grid`;
    
    dragState.draggedElement = card;
    dragState.draggedSku = sku;
    dragState.sourceGridId = gridId;
    dragState.sourceStorageIndex = storageIndex;
    dragState.sourceSlotIndex = slotIndex;
    
    card.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sku);
    
    console.log('Drag from canvas:', sku, 'storage:', storageIndex, 'slot:', slotIndex);
}

/**
 * Handle drag end for products in canvas
 */
function handleCanvasProductDragEnd(e) {
    const card = e.target;
    card.classList.remove('dragging');
    
    // Reset drag state
    dragState.draggedElement = null;
    dragState.draggedSku = null;
    dragState.sourceGridId = null;
    dragState.sourceStorageIndex = null;
    dragState.sourceSlotIndex = null;
}

/**
 * Update canvas statistics
 */
function updateCanvasStats() {
    const canvasProductCount = document.getElementById('canvasProductCount');
    const count = sectionFullEditorState.placedProducts.size;
    canvasProductCount.textContent = `${count} produit${count !== 1 ? 's' : ''} placé${count !== 1 ? 's' : ''}`;
}

/**
 * Add a new storage unit (door/drawer) to the section
 */
function addStorageUnit() {
    const section = getSectionById(sectionFullEditorState.currentSectionId);
    if (!section) return;
    
    const gridId = `${section.id}-grid`;
    const sectionData = sectionSlots[gridId];
    
    if (!sectionData || !sectionData.storages) {
        console.error('Section data not found');
        return;
    }
    
    // Determine slots per storage
    const slotsPerStorage = section.storageType === 'door' ? 
        CONFIG.DOOR_CONFIG.productsPerDoor : 
        CONFIG.DRAWER_CONFIG.productsPerDrawer;
    
    // Create new empty storage with slots
    const newStorageIndex = sectionData.storages.length;
    const newStorage = {
        index: newStorageIndex,
        slots: []
    };
    
    // Create empty slots for the new storage
    for (let i = 0; i < slotsPerStorage; i++) {
        newStorage.slots.push({
            index: i,
            products: []
        });
    }
    
    // Add new storage to section data
    sectionData.storages.push(newStorage);
    
    // Increase storage count in section config
    section.storageCount++;
    
    // Update section config
    updateSection(section.id, { storageCount: section.storageCount });
    
    // Save section slots
    saveSectionSlots();
    
    // Update UI
    document.getElementById('canvasStorageCount').textContent = `${section.storageCount} unités`;
    
    // Re-render canvas
    renderSectionFullEditorCanvas();
    
    console.log('Added storage unit, new count:', section.storageCount);
}

/**
 * Remove the last storage unit (door/drawer) from the section
 */
function removeStorageUnit() {
    const section = getSectionById(sectionFullEditorState.currentSectionId);
    if (!section || section.storageCount <= 1) return;
    
    const gridId = `${section.id}-grid`;
    const sectionData = sectionSlots[gridId];
    
    if (!sectionData || !sectionData.storages) return;
    
    // Check if last storage has products
    const lastStorage = sectionData.storages[sectionData.storages.length - 1];
    const hasProducts = lastStorage.slots.some(slot => 
        Array.isArray(slot.products) && slot.products.length > 0
    );
    
    if (hasProducts) {
        const confirmed = confirm('Cette porte/tiroir contient des produits. Les retirer quand même?');
        if (!confirmed) return;
    }
    
    // Remove last storage
    sectionData.storages.pop();
    section.storageCount--;
    
    // Update section config
    updateSection(section.id, { storageCount: section.storageCount });
    
    // Save section slots
    saveSectionSlots();
    
    // Update UI
    document.getElementById('canvasStorageCount').textContent = `${section.storageCount} unités`;
    
    // Re-render canvas and palette
    renderSectionFullEditorCanvas();
    renderSectionFullEditorPalette();
    
    console.log('Removed storage unit, new count:', section.storageCount);
}

/**
 * Handle sidebar search
 */
function handleSidebarSearch(query) {
    const palette = document.getElementById('sectionFullEditorPalette');
    const cards = palette.querySelectorAll('.palette-product-card');
    
    const lowerQuery = query.toLowerCase();
    
    cards.forEach(card => {
        const name = card.querySelector('.palette-product-name').textContent.toLowerCase();
        if (name.includes(lowerQuery)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Handle sidebar filter
 */
function handleSidebarFilter(filter) {
    const palette = document.getElementById('sectionFullEditorPalette');
    const cards = palette.querySelectorAll('.palette-product-card');
    
    cards.forEach(card => {
        const isPlaced = card.classList.contains('already-placed');
        
        if (filter === 'all') {
            card.style.display = '';
        } else if (filter === 'available') {
            card.style.display = isPlaced ? 'none' : '';
        } else if (filter === 'placed') {
            card.style.display = isPlaced ? '' : 'none';
        }
    });
}
