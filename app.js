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

// Load products
async function loadProducts() {
    try {
        // Try to fetch from JSON file first (if using web server)
        const response = await fetch('products.json');
        if (!response.ok) throw new Error('Failed to fetch');
        allProducts = await response.json();
        applyProductTypeChanges();
        loadProductFormatChanges();
        loadThcChanges();
        loadCbdChanges();
        filteredProducts = [...allProducts];
        renderProducts();
        updateCounts();
    } catch (error) {
        console.error('Error loading products from file, trying embedded data:', error);
        // Fallback to embedded data
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
}

function applyProductTypeChanges() {
    // Apply saved type changes to products
    allProducts.forEach(product => {
        if (productTypeChanges[product.sku]) {
            product.type = productTypeChanges[product.sku];
        }
    });
}

// Filter products based on active filters and search
function filterProducts() {
    filteredProducts = allProducts.filter(product => {
        // Check type filter
        const typeMatch = activeFilters.has('all') || activeFilters.has(product.type);

        // Check search query
        const searchMatch = !searchQuery ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.brand.toLowerCase().includes(searchQuery.toLowerCase());

        return typeMatch && searchMatch;
    });

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
function createProductCard(product) {
    const thcValue = product.manualThc || product.thcMax;

    // Determine card type for styling - 28g products get special type
    const cardType = product.format === CONFIG.FORMATS.LARGE ? CONFIG.TYPES.OZ28 : product.type;

    return `
        <div class="product-card"
             data-type="${cardType}"
             data-sku="${product.sku}"
             role="button"
             tabindex="0"
             aria-label="${product.name}, ${thcValue}% THC, cliquez pour modifier">
            <div class="product-name">${product.name}</div>
            <div class="product-thc">
                <div class="thc-value">${thcValue}%</div>
            </div>
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
        // Check if it's a 28g product
        if (product.format === CONFIG.FORMATS.LARGE) {
            productsByType[CONFIG.TYPES.OZ28]['all'].push(product);
        } else if (productsByType[product.type]) {
            // Check if format is "3,5 g"
            if (product.format === CONFIG.FORMATS.SMALL) {
                productsByType[product.type]['3.5g'].push(product);
            } else {
                productsByType[product.type]['other'].push(product);
            }
        }
    });

    return productsByType;
}

// Helper function: Render a single grid with products
function renderGridSection(grid, products, emptyMessage = 'Aucun produit') {
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    } else {
        // Apply custom order if available
        const orderedProducts = applyCustomOrder(products, grid.id);
        grid.innerHTML = orderedProducts.map(product => createProductCard(product)).join('');
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
    const productsByType = groupProductsByTypeAndFormat(filteredProducts);
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

    filteredProducts.forEach(product => {
        // Count 28g products separately
        if (product.format === CONFIG.FORMATS.LARGE) {
            counts[CONFIG.TYPES.OZ28]++;
        } else if (counts[product.type] !== undefined) {
            counts[product.type]++;
        }
    });

    document.getElementById(CONFIG.COUNT_IDS.INDICA).textContent = counts[CONFIG.TYPES.INDICA];
    document.getElementById(CONFIG.COUNT_IDS.SATIVA).textContent = counts[CONFIG.TYPES.SATIVA];
    document.getElementById(CONFIG.COUNT_IDS.OZ28).textContent = counts[CONFIG.TYPES.OZ28];
    document.getElementById(CONFIG.COUNT_IDS.HYBRIDE).textContent = counts[CONFIG.TYPES.HYBRIDE];
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
    const modalFormat35 = document.getElementById('modalFormat35');
    const modalFormatOther = document.getElementById('modalFormatOther');

    // Store the SKU and previous focus for later use
    modal.dataset.editingSku = sku;
    modal.dataset.previousFocus = sku;

    // Set modal content
    modalProductName.textContent = product.name;

    // Determine current section
    const currentSection = product.format === CONFIG.FORMATS.LARGE ? CONFIG.TYPES.OZ28 : product.type;
    modalSectionSelect.value = currentSection;

    // Set current format radio buttons
    if (product.format === CONFIG.FORMATS.SMALL) {
        modalFormat35.checked = true;
    } else {
        modalFormatOther.checked = true;
    }

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
    const modalFormat35 = document.getElementById('modalFormat35');
    const newFormat = modalFormat35.checked ? CONFIG.FORMATS.SMALL : 'other';

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
        // Moving to 28g section
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

        // Determine target format
        let targetFormat;
        if (newFormat === CONFIG.FORMATS.SMALL) {
            targetFormat = CONFIG.FORMATS.SMALL;
        } else {
            // "other" format - keep current or default to medium
            if (product.format === CONFIG.FORMATS.SMALL || product.format === CONFIG.FORMATS.LARGE) {
                targetFormat = CONFIG.FORMATS.MEDIUM;
            } else {
                targetFormat = product.format;
            }
        }

        if (product.format !== targetFormat) {
            product.format = targetFormat;
            saveProductFormatChange(product.sku, targetFormat);
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
        console.error('Error saving THC changes:', error);
        if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded. Consider clearing old data.');
            showValidationError('Erreur: Espace de stockage insuffisant');
        }
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
        console.error('Error saving CBD changes:', error);
        if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded. Consider clearing old data.');
            showValidationError('Erreur: Espace de stockage insuffisant');
        }
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
        console.error('Error saving product type change:', error);
        if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded. Consider clearing old data.');
        }
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
        console.error('Error saving format change:', error);
        if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded. Consider clearing old data.');
        }
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
        console.error('Error saving product order:', error);
        if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded. Consider clearing old data.');
        }
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
    const card = e.target.closest('.product-card');
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
                const cards = Array.from(grid.querySelectorAll('.product-card'));
                const newOrder = cards.map(c => c.dataset.sku);
                productOrder[dragState.sourceGridId] = newOrder;
                saveProductOrder();
            }
        }
    }

    // Remove all visual feedback
    document.querySelectorAll('.product-card').forEach(c => c.classList.remove('drag-over'));
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

    const card = e.target.closest('.product-card');
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

function handleDragEnter(e) {
    const card = e.target.closest('.product-card');
    if (card && card !== dragState.draggedElement) {
        card.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const card = e.target.closest('.product-card');
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

    // Sort select - removed from UI
    // const sortSelect = document.getElementById('sortSelect');
    // sortSelect.addEventListener('change', (e) => {
    //     sortBy = e.target.value;
    //     filterProducts();
    // });

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

    // Keyboard accessibility: Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('editModal');
            if (modal && modal.classList.contains('active')) {
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
    setupEventListeners();
    loadProducts();

    // Setup scroll arrows for all grids
    document.querySelectorAll('.products-grid').forEach(grid => {
        setupScrollArrows(grid);
    });

    // Setup modal event listeners
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const modalOverlay = document.getElementById('editModal');
    const modalSectionSelect = document.getElementById('modalSectionSelect');

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeEditModal);
    }
    if (modalSaveBtn) {
        modalSaveBtn.addEventListener('click', saveCardChanges);
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
});
