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

// Load products
async function loadProducts() {
    // Load from embedded data (products-data.js)
    if (window.PRODUCTS_DATA && window.PRODUCTS_DATA.length > 0) {
        allProducts = window.PRODUCTS_DATA;
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
        } else if (product.format === CONFIG.FORMATS.LARGE && product.type !== CONFIG.TYPES.OZ28) {
            // Migration: Legacy 28g products without explicit type change
            // If format is 28g but type is not "28g", set it to "28g" for backwards compatibility
            product.type = CONFIG.TYPES.OZ28;
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

// Helper function: Get all section DOM elements
function getSectionElements() {
    return {
        [CONFIG.TYPES.INDICA]: {
            '3.5g': document.getElementById(CONFIG.GRID_IDS.INDICA_35G),
            'other': document.getElementById(CONFIG.GRID_IDS.INDICA_OTHER)
        },
        [CONFIG.TYPES.SATIVA]: {
            '3.5g': document.getElementById(CONFIG.GRID_IDS.SATIVA_35G),
            'other': document.getElementById(CONFIG.GRID_IDS.SATIVA_OTHER)
        },
        [CONFIG.TYPES.OZ28]: {
            'all': document.getElementById(CONFIG.GRID_IDS.OZ28)
        },
        [CONFIG.TYPES.HYBRIDE]: {
            '3.5g': document.getElementById(CONFIG.GRID_IDS.HYBRIDE_35G),
            'other': document.getElementById(CONFIG.GRID_IDS.HYBRIDE_OTHER)
        }
    };
}

// Helper function: Clear all product grids
function clearAllGrids(sections) {
    Object.values(sections).forEach(subsections => {
        Object.values(subsections).forEach(grid => {
            if (grid) grid.innerHTML = '';
        });
    });
}

// Helper function: Group products by type and format
function groupProductsByTypeAndFormat(products) {
    const productsByType = {
        [CONFIG.TYPES.INDICA]: { '3.5g': [], 'other': [] },
        [CONFIG.TYPES.SATIVA]: { '3.5g': [], 'other': [] },
        [CONFIG.TYPES.OZ28]: { 'all': [] },
        [CONFIG.TYPES.HYBRIDE]: { '3.5g': [], 'other': [] }
    };

    products.forEach(product => {
        // Check type first (not format) - section 28g has type "28g"
        if (product.type === CONFIG.TYPES.OZ28) {
            productsByType[CONFIG.TYPES.OZ28]['all'].push(product);
        } else if (productsByType[product.type]) {
            // Check if format is "3,5 g"
            if (product.format === CONFIG.FORMATS.SMALL) {
                productsByType[product.type]['3.5g'].push(product);
            } else {
                // Other formats (7g, 28g, préroulés, etc.)
                productsByType[product.type]['other'].push(product);
            }
        }
    });

    return productsByType;
}

// Configuration for drawer system
const DRAWER_CONFIG = {
    productsPerDrawer: 2,
    drawersPerColumn: 3,
    // Configuration par section (au lieu d'un seul maxDrawers global)
    maxDrawersBySection: {
        indica: 12,
        sativa: 12,
        hybride: 12
    }
};

// Configuration for door system (for 3.5g and 28g sections)
const DOOR_CONFIG = {
    productsPerDoor: 4,
    // Configuration par section
    maxDoorsBySection: {
        indica: 12,
        sativa: 12,
        hybride: 12,
        oz28: 12
    }
};

// Setup drawer count controls (one per section)
function setupDrawerCountControls() {
    const controls = {
        indica: document.getElementById('drawerCountIndica'),
        sativa: document.getElementById('drawerCountSativa'),
        hybride: document.getElementById('drawerCountHybride')
    };
    
    // Charger les valeurs sauvegardées
    loadDrawerCounts();
    
    // Appliquer les valeurs aux inputs
    Object.keys(controls).forEach(section => {
        if (controls[section]) {
            controls[section].value = DRAWER_CONFIG.maxDrawersBySection[section];
        }
    });
    
    // Ajouter les event listeners
    Object.keys(controls).forEach(section => {
        const input = controls[section];
        if (!input) return;
        
        input.addEventListener('change', (e) => {
            const newCount = parseInt(e.target.value);
            if (newCount >= 1 && newCount <= 30) {
                DRAWER_CONFIG.maxDrawersBySection[section] = newCount;
                saveDrawerCounts();
                // Re-render all sections
                renderProducts();
            }
        });
    });
}

// Setup door count controls (one per section)
function setupDoorCountControls() {
    const controls = {
        indica: document.getElementById('doorCountIndica'),
        sativa: document.getElementById('doorCountSativa'),
        hybride: document.getElementById('doorCountHybride'),
        oz28: document.getElementById('doorCountOz28')
    };
    
    // Charger les valeurs sauvegardées
    loadDoorCounts();
    
    // Appliquer les valeurs aux inputs
    Object.keys(controls).forEach(section => {
        if (controls[section]) {
            controls[section].value = DOOR_CONFIG.maxDoorsBySection[section];
        }
    });
    
    // Ajouter les event listeners
    Object.keys(controls).forEach(section => {
        const input = controls[section];
        if (!input) return;
        
        input.addEventListener('change', (e) => {
            const newCount = parseInt(e.target.value);
            if (newCount >= 1 && newCount <= 30) {
                DOOR_CONFIG.maxDoorsBySection[section] = newCount;
                saveDoorCounts();
                // Re-render all sections
                renderProducts();
            }
        });
    });
}

// Save drawer counts to localStorage
function saveDrawerCounts() {
    try {
        localStorage.setItem(
            CONFIG.STORAGE_KEYS.DRAWER_COUNT,
            JSON.stringify(DRAWER_CONFIG.maxDrawersBySection)
        );
    } catch (error) {
        handleStorageError(error, 'drawer counts');
    }
}

// Load drawer counts from localStorage
function loadDrawerCounts() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.DRAWER_COUNT);
        if (saved) {
            const counts = JSON.parse(saved);
            DRAWER_CONFIG.maxDrawersBySection = {
                ...DRAWER_CONFIG.maxDrawersBySection,
                ...counts
            };
        }
    } catch (error) {
        console.error('Error loading drawer counts:', error);
    }
}

// Save door counts to localStorage
function saveDoorCounts() {
    try {
        localStorage.setItem(
            CONFIG.STORAGE_KEYS.DOOR_COUNT,
            JSON.stringify(DOOR_CONFIG.maxDoorsBySection)
        );
    } catch (error) {
        handleStorageError(error, 'door counts');
    }
}

// Load door counts from localStorage
function loadDoorCounts() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.DOOR_COUNT);
        if (saved) {
            const counts = JSON.parse(saved);
            DOOR_CONFIG.maxDoorsBySection = {
                ...DOOR_CONFIG.maxDoorsBySection,
                ...counts
            };
        }
    } catch (error) {
        console.error('Error loading door counts:', error);
    }
}

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

// Helper function: Render a single grid with products (with drawer and door support)
function renderGridSection(grid, products, emptyMessage = 'Aucun produit') {
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    } else {
        // Check if this is a door grid (3.5g sections or 28g)
        const isDoorGrid = grid.id.includes('-3.5g') || grid.id === 'oz28-grid';
        
        // Check if this is an "other formats" grid that should have drawers
        const isDrawerGrid = grid.id.includes('-other');
        
        if (isDoorGrid) {
            // Use door system for 3.5g and 28g sections
            renderDoorsGrid(grid, products);
        } else if (isDrawerGrid) {
            // Use drawer system for "other formats"
            // Clear the grid
            grid.innerHTML = '';
            
            // Apply custom order if available
            const orderedProducts = applyCustomOrder(products, grid.id);
            
            // Déterminer quelle section et utiliser son maxDrawers
            const section = getSectionFromGridId(grid.id);
            const maxDrawers = DRAWER_CONFIG.maxDrawersBySection[section] || 12;
            
            // Create all drawers (including empty ones if needed)
            for (let i = 0; i < maxDrawers; i++) {
                const startIndex = i * DRAWER_CONFIG.productsPerDrawer;
                const drawerProds = orderedProducts.slice(startIndex, startIndex + DRAWER_CONFIG.productsPerDrawer);
                const drawer = createDrawer(drawerProds, i);
                grid.appendChild(drawer);
            }
            
            // Add remaining products as standalone labels (cards without drawers)
            const remainingStartIndex = maxDrawers * DRAWER_CONFIG.productsPerDrawer;
            if (remainingStartIndex < orderedProducts.length) {
                const remainingProducts = orderedProducts.slice(remainingStartIndex);
                remainingProducts.forEach(product => {
                    const card = createStandaloneCard(product);
                    grid.appendChild(card);
                });
            }
        } else {
            // Regular grid rendering (no drawers, no doors)
            // Apply custom order if available
            const orderedProducts = applyCustomOrder(products, grid.id);
            // Check visibility for each product based on current filters
            grid.innerHTML = orderedProducts.map(product => {
                const isVisible = productMatchesFilters(product);
                return createProductCard(product, isVisible);
            }).join('');
        }
    }
}

// Helper function: Render doors grid (for 3.5g and 28g sections)
function renderDoorsGrid(grid, products) {
    // Clear the grid
    grid.innerHTML = '';
    
    // Apply custom order if available
    const orderedProducts = applyCustomOrder(products, grid.id);
    
    // Déterminer quelle section et utiliser son maxDoors
    const section = getSectionFromGridId(grid.id);
    const maxDoors = DOOR_CONFIG.maxDoorsBySection[section] || 12;
    
    // Create all doors (including empty ones if needed)
    for (let i = 0; i < maxDoors; i++) {
        const startIndex = i * DOOR_CONFIG.productsPerDoor;
        const doorProds = orderedProducts.slice(startIndex, startIndex + DOOR_CONFIG.productsPerDoor);
        const door = createDoor(doorProds, i);
        grid.appendChild(door);
    }
    
    // Add remaining products as standalone labels (cards without doors)
    const remainingStartIndex = maxDoors * DOOR_CONFIG.productsPerDoor;
    if (remainingStartIndex < orderedProducts.length) {
        const remainingProducts = orderedProducts.slice(remainingStartIndex);
        remainingProducts.forEach(product => {
            const card = createStandaloneDoorCard(product);
            grid.appendChild(card);
        });
    }
}

// Helper function: Render all product sections
function renderAllSections(sections, productsByType) {
    Object.entries(productsByType).forEach(([type, subsections]) => {
        if (!sections[type]) return;

        if (type === CONFIG.TYPES.OZ28) {
            // Render 28g section (single grid)
            renderGridSection(sections[type]['all'], subsections['all']);
        } else {
            // Render 3.5g subsection
            renderGridSection(sections[type]['3.5g'], subsections['3.5g']);
            // Render other formats subsection
            renderGridSection(sections[type]['other'], subsections['other']);
        }
    });
}

// Helper function: Update section visibility based on product counts
function updateSectionVisibility(productsByType) {
    Object.entries(productsByType).forEach(([type, subsections]) => {
        const sectionClass = type === CONFIG.TYPES.OZ28 ? 'oz28-section' : `${type.toLowerCase()}-section`;
        const section = document.querySelector(`.${sectionClass}`);
        if (!section) return;

        let totalProducts;
        if (type === CONFIG.TYPES.OZ28) {
            totalProducts = subsections['all'].length;
        } else {
            totalProducts = subsections['3.5g'].length + subsections['other'].length;
        }

        if (totalProducts === 0 && !activeFilters.has(CONFIG.TYPES.ALL) && !activeFilters.has(type)) {
            section.classList.add('hidden');
        } else {
            section.classList.remove('hidden');
        }
    });
}

// Helper function: Update scroll arrows for all grids
function updateAllScrollArrows(sections) {
    Object.values(sections).forEach(subsections => {
        Object.values(subsections).forEach(grid => {
            if (grid) updateScrollArrows(grid);
        });
    });
}

// Main render function - now simplified
function renderProducts() {
    const sections = getSectionElements();
    clearAllGrids(sections);
    // Group ALL products (not just filtered ones) to keep card positions
    const productsByType = groupProductsByTypeAndFormat(allProducts);
    renderAllSections(sections, productsByType);
    updateSectionVisibility(productsByType);
    updateAllScrollArrows(sections);

    // Initialize drag-and-drop for all product cards
    initializeDragAndDrop();
}

// Update product counts
function updateCounts() {
    const counts = {
        [CONFIG.TYPES.INDICA]: 0,
        [CONFIG.TYPES.SATIVA]: 0,
        [CONFIG.TYPES.OZ28]: 0,
        [CONFIG.TYPES.HYBRIDE]: 0
    };

    const subsectionCounts = {
        indica35g: 0,
        indicaOther: 0,
        sativa35g: 0,
        sativaOther: 0,
        hybride35g: 0,
        hybrideOther: 0
    };

    filteredProducts.forEach(product => {
        // Count products by type
        if (counts[product.type] !== undefined) {
            counts[product.type]++;
        }

        // Count subsections for 3.5g vs other formats (only for Indica/Sativa/Hybride)
        if (product.type !== CONFIG.TYPES.OZ28) {
            const is35g = product.format === CONFIG.FORMATS.SMALL;
            if (product.type === CONFIG.TYPES.INDICA) {
                if (is35g) subsectionCounts.indica35g++;
                else subsectionCounts.indicaOther++;
            } else if (product.type === CONFIG.TYPES.SATIVA) {
                if (is35g) subsectionCounts.sativa35g++;
                else subsectionCounts.sativaOther++;
            } else if (product.type === CONFIG.TYPES.HYBRIDE) {
                if (is35g) subsectionCounts.hybride35g++;
                else subsectionCounts.hybrideOther++;
            }
        }
    });

    document.getElementById(CONFIG.COUNT_IDS.INDICA).textContent = counts[CONFIG.TYPES.INDICA];
    document.getElementById(CONFIG.COUNT_IDS.SATIVA).textContent = counts[CONFIG.TYPES.SATIVA];
    document.getElementById(CONFIG.COUNT_IDS.OZ28).textContent = counts[CONFIG.TYPES.OZ28];
    document.getElementById(CONFIG.COUNT_IDS.HYBRIDE).textContent = counts[CONFIG.TYPES.HYBRIDE];

    // Update subsection counts
    document.getElementById(CONFIG.COUNT_IDS.INDICA_35G).textContent = subsectionCounts.indica35g;
    document.getElementById(CONFIG.COUNT_IDS.INDICA_OTHER).textContent = subsectionCounts.indicaOther;
    document.getElementById(CONFIG.COUNT_IDS.SATIVA_35G).textContent = subsectionCounts.sativa35g;
    document.getElementById(CONFIG.COUNT_IDS.SATIVA_OTHER).textContent = subsectionCounts.sativaOther;
    document.getElementById(CONFIG.COUNT_IDS.HYBRIDE_35G).textContent = subsectionCounts.hybride35g;
    document.getElementById(CONFIG.COUNT_IDS.HYBRIDE_OTHER).textContent = subsectionCounts.hybrideOther;
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

    // Set current section from product type
    modalSectionSelect.value = product.type;

    // Set current format
    const currentFormat = product.manualFormat || product.format;
    modalFormatSelect.value = currentFormat;

    // Show/hide format selector based on section
    updateFormatFieldVisibility();

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

function updateFormatFieldVisibility() {
    const modalSectionSelect = document.getElementById('modalSectionSelect');
    const modalFormatField = document.getElementById('modalFormatField');

    // Hide format selector if 28g section is selected
    if (modalSectionSelect.value === CONFIG.TYPES.OZ28) {
        modalFormatField.style.display = 'none';
    } else {
        modalFormatField.style.display = 'block';
    }
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

// Helper: Update product section and format
function updateProductSection(product, newSection, newFormat) {
    if (newSection === CONFIG.TYPES.OZ28) {
        // Moving to 28g section - set both type AND format to 28g
        if (product.type !== CONFIG.TYPES.OZ28) {
            product.type = CONFIG.TYPES.OZ28;
            saveProductTypeChange(product.sku, CONFIG.TYPES.OZ28);
        }
        if (product.format !== CONFIG.FORMATS.LARGE) {
            product.format = CONFIG.FORMATS.LARGE;
            saveProductFormatChange(product.sku, CONFIG.FORMATS.LARGE);
        }
    } else {
        // Moving to a regular section (Indica, Sativa, etc.)
        if (newSection !== product.type) {
            product.type = newSection;
            saveProductTypeChange(product.sku, newSection);
        }

        // Update format with the specific selected value
        if (product.format !== newFormat) {
            product.format = newFormat;
            saveProductFormatChange(product.sku, newFormat);
        }
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

            if (imageModal && imageModal.classList.contains('active')) {
                closeImageViewer();
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
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProductTypeChanges();
    loadProductOrder();
    loadDrawerCounts();
    loadDoorCounts();
    setupEventListeners();
    setupDrawerCountControls();
    setupDoorCountControls();
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
    // Update format field visibility when section changes
    if (modalSectionSelect) {
        modalSectionSelect.addEventListener('change', updateFormatFieldVisibility);
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
});
