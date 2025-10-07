// Print Lists Management - SQDC Products Portal

// ============================================
// Global State
// ============================================

let allProducts = [];
let currentListId = null;
let modalState = {
    isEditing: false,
    editingListId: null,
    targetSectionId: null
};

// ============================================
// LocalStorage - List Management (CRUD)
// ============================================

/**
 * Get all print lists from localStorage
 * @returns {Array} Array of list objects
 */
function getAllPrintLists() {
    const saved = localStorage.getItem(CONFIG.PRINT_LISTS.STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

/**
 * Create a new print list
 * @param {string} name - List name
 * @param {string} description - List description
 * @param {string} category - Category ID (e.g., 'indica-3.5g')
 * @returns {Object} The created list object
 */
function createPrintList(name, description = '', category = null) {
    const lists = getAllPrintLists();

    // If no category specified, default to first category
    if (!category) {
        category = CONFIG.PRINT_LISTS.CATEGORIES.INDICA_35G;
    }

    const categoryLabel = CONFIG.PRINT_LISTS.CATEGORY_LABELS[category] || category;

    // Create with sections mode enabled by default, with one section matching the category
    const newList = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        category: category,
        products: [], // Empty array (not used in sections mode)
        sections: [{
            id: crypto.randomUUID(),
            name: categoryLabel,
            category: category,
            products: [],
            collapsed: false
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columnConfig: null // null = use default
    };

    lists.push(newList);
    localStorage.setItem(CONFIG.PRINT_LISTS.STORAGE_KEY, JSON.stringify(lists));

    return newList;
}

/**
 * Get a specific print list by ID
 * @param {string} id - List ID
 * @returns {Object|null} The list object or null if not found
 */
function getPrintListById(id) {
    const lists = getAllPrintLists();
    return lists.find(list => list.id === id) || null;
}

/**
 * Update a print list
 * @param {string} id - List ID
 * @param {Object} updates - Object with properties to update
 * @returns {Object|null} The updated list or null if not found
 */
function updatePrintList(id, updates) {
    const lists = getAllPrintLists();
    const index = lists.findIndex(list => list.id === id);

    if (index === -1) return null;

    // Update the list
    lists[index] = {
        ...lists[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(CONFIG.PRINT_LISTS.STORAGE_KEY, JSON.stringify(lists));

    return lists[index];
}

/**
 * Delete a print list
 * @param {string} id - List ID
 * @returns {boolean} True if deleted, false if not found
 */
function deletePrintList(id) {
    const lists = getAllPrintLists();
    const index = lists.findIndex(list => list.id === id);

    if (index === -1) return false;

    lists.splice(index, 1);
    localStorage.setItem(CONFIG.PRINT_LISTS.STORAGE_KEY, JSON.stringify(lists));

    // If deleting the default list, clear the default
    const defaultListId = localStorage.getItem(CONFIG.PRINT_LISTS.DEFAULT_LIST_KEY);
    if (defaultListId === id) {
        localStorage.removeItem(CONFIG.PRINT_LISTS.DEFAULT_LIST_KEY);
    }

    return true;
}

/**
 * Get the default list ID
 * @returns {string|null} The default list ID or null
 */
function getDefaultListId() {
    return localStorage.getItem(CONFIG.PRINT_LISTS.DEFAULT_LIST_KEY);
}

/**
 * Set the default list
 * @param {string} id - List ID
 */
function setDefaultList(id) {
    localStorage.setItem(CONFIG.PRINT_LISTS.DEFAULT_LIST_KEY, id);
    renderListsSidebar();
}

/**
 * Duplicate a print list
 * @param {string} id - List ID to duplicate
 * @returns {Object|null} The new duplicated list or null if source not found
 */
function duplicatePrintList(id) {
    const sourceList = getPrintListById(id);
    if (!sourceList) return null;

    const lists = getAllPrintLists();

    const duplicatedList = {
        ...sourceList,
        id: crypto.randomUUID(),
        name: `Copie de ${sourceList.name}`,
        products: [...sourceList.products], // Copy products array
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    lists.push(duplicatedList);
    localStorage.setItem(CONFIG.PRINT_LISTS.STORAGE_KEY, JSON.stringify(lists));

    return duplicatedList;
}

// ============================================
// Section Management (for sectioned lists)
// ============================================

/**
 * Create a new section in a list
 * @param {string} listId - List ID
 * @param {string} category - Category ID (e.g., 'indica-3.5g')
 * @returns {Object|null} The created section or null if list not found
 */
function createSection(listId, category) {
    const list = getPrintListById(listId);
    if (!list) return null;

    // Initialize sections array if null (enable sections mode)
    if (!list.sections) {
        list.sections = [];
    }

    // Check if category already exists in sections
    if (list.sections.some(s => s.category === category)) {
        alert('Cette catégorie existe déjà dans la liste');
        return null;
    }

    const categoryLabel = CONFIG.PRINT_LISTS.CATEGORY_LABELS[category] || category;

    const newSection = {
        id: crypto.randomUUID(),
        name: categoryLabel,
        category: category,
        products: [],
        collapsed: false
    };

    list.sections.push(newSection);
    updatePrintList(listId, { sections: list.sections });

    return newSection;
}

/**
 * Update a section
 * @param {string} listId - List ID
 * @param {string} sectionId - Section ID
 * @param {Object} updates - Properties to update
 * @returns {Object|null} Updated section or null
 */
function updateSection(listId, sectionId, updates) {
    const list = getPrintListById(listId);
    if (!list || !list.sections) return null;

    const sectionIndex = list.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return null;

    list.sections[sectionIndex] = {
        ...list.sections[sectionIndex],
        ...updates
    };

    updatePrintList(listId, { sections: list.sections });
    return list.sections[sectionIndex];
}

/**
 * Delete a section
 * @param {string} listId - List ID
 * @param {string} sectionId - Section ID
 * @returns {boolean} Success status
 */
function deleteSection(listId, sectionId) {
    const list = getPrintListById(listId);
    if (!list || !list.sections) return false;

    const sectionIndex = list.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return false;

    list.sections.splice(sectionIndex, 1);
    updatePrintList(listId, { sections: list.sections });

    return true;
}

/**
 * Reorder sections
 * @param {string} listId - List ID
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Target index
 * @returns {boolean} Success status
 */
function reorderSections(listId, fromIndex, toIndex) {
    const list = getPrintListById(listId);
    if (!list || !list.sections) return false;

    const [movedSection] = list.sections.splice(fromIndex, 1);
    list.sections.splice(toIndex, 0, movedSection);

    updatePrintList(listId, { sections: list.sections });
    return true;
}

/**
 * Enable sections mode (migrate existing products to a default section)
 * @param {string} listId - List ID
 * @returns {boolean} Success status
 */
function enableSectionsMode(listId) {
    const list = getPrintListById(listId);
    if (!list) return false;

    // Already in sections mode
    if (list.sections) return true;

    // Create default section with existing products using the list's category
    const categoryLabel = CONFIG.PRINT_LISTS.CATEGORY_LABELS[list.category] || 'Produits';

    const sections = [{
        id: crypto.randomUUID(),
        name: categoryLabel,
        category: list.category,
        products: [...list.products],
        collapsed: false
    }];

    updatePrintList(listId, { sections: sections, products: [] });
    return true;
}

/**
 * Disable sections mode (merge all sections into flat list)
 * @param {string} listId - List ID
 * @returns {boolean} Success status
 */
function disableSectionsMode(listId) {
    const list = getPrintListById(listId);
    if (!list) return false;

    // Already in flat list mode
    if (!list.sections) return true;

    // Merge all products from all sections
    const allProducts = [];
    list.sections.forEach(section => {
        allProducts.push(...section.products);
    });

    updatePrintList(listId, { sections: null, products: allProducts });
    return true;
}

/**
 * Get section by ID
 * @param {string} listId - List ID
 * @param {string} sectionId - Section ID
 * @returns {Object|null} Section object or null
 */
function getSectionById(listId, sectionId) {
    const list = getPrintListById(listId);
    if (!list || !list.sections) return null;

    return list.sections.find(s => s.id === sectionId) || null;
}

// ============================================
// Product Management
// ============================================

/**
 * Load products from embedded data with all customizations applied
 */
function loadProducts() {
    if (window.PRODUCTS_DATA && window.PRODUCTS_DATA.length > 0) {
        allProducts = JSON.parse(JSON.stringify(window.PRODUCTS_DATA)); // Deep copy
        applyProductCustomizations();
    } else {
        console.error('No products data available');
    }
}

/**
 * Apply all localStorage customizations to products
 */
function applyProductCustomizations() {
    // Apply THC changes
    const thcChanges = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.THC_CHANGES) || '{}');

    // Apply CBD changes
    const cbdChanges = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CBD_CHANGES) || '{}');

    // Apply type changes
    const typeChanges = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TYPE_CHANGES) || '{}');

    // Apply format changes
    const formatChanges = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.FORMAT_CHANGES) || '{}');

    allProducts.forEach(product => {
        if (thcChanges[product.sku]) {
            product.manualThc = thcChanges[product.sku];
        }
        if (cbdChanges[product.sku]) {
            product.manualCbd = cbdChanges[product.sku];
        }
        if (typeChanges[product.sku]) {
            product.type = typeChanges[product.sku];
        }
        if (formatChanges[product.sku]) {
            product.format = formatChanges[product.sku];
        }
    });
}

/**
 * Get product by SKU
 * @param {string} sku - Product SKU
 * @returns {Object|null} Product object or null
 */
function getProductBySku(sku) {
    return allProducts.find(p => p.sku === sku) || null;
}

/**
 * Add product to list
 * @param {string} listId - List ID
 * @param {string} sku - Product SKU
 * @param {string|null} sectionId - Section ID (null = add to flat list)
 */
function addProductToList(listId, sku, sectionId = null) {
    const list = getPrintListById(listId);
    if (!list) return;

    // If sections mode
    if (list.sections && sectionId) {
        // Find section in current list (not a new reference)
        const section = list.sections.find(s => s.id === sectionId);
        if (!section) return;

        // Don't add if already exists in this section
        if (section.products.includes(sku)) return;

        section.products.push(sku);
        updatePrintList(listId, { sections: list.sections });
    } else if (list.sections) {
        // Sections mode but no section specified - should not happen
        console.error('Cannot add product: sections mode requires a sectionId');
        return;
    } else {
        // Flat list mode
        // Don't add if already exists
        if (list.products.includes(sku)) return;

        list.products.push(sku);
        updatePrintList(listId, { products: list.products });
    }
}

/**
 * Remove product from list
 * @param {string} listId - List ID
 * @param {string} sku - Product SKU
 * @param {string|null} sectionId - Section ID (null = remove from flat list)
 */
function removeProductFromList(listId, sku, sectionId = null) {
    const list = getPrintListById(listId);
    if (!list) return;

    // If sections mode
    if (list.sections && sectionId) {
        // Find section in current list (not a new reference)
        const section = list.sections.find(s => s.id === sectionId);
        if (!section) return;

        section.products = section.products.filter(s => s !== sku);
        updatePrintList(listId, { sections: list.sections });
    } else {
        // Flat list mode
        list.products = list.products.filter(s => s !== sku);
        updatePrintList(listId, { products: list.products });
    }
}

/**
 * Move product between sections or within section
 * @param {string} listId - List ID
 * @param {string} sku - Product SKU
 * @param {string} fromSectionId - Source section ID
 * @param {string} toSectionId - Target section ID
 * @param {number} toIndex - Target index in section
 */
function moveProductBetweenSections(listId, sku, fromSectionId, toSectionId, toIndex = -1) {
    const list = getPrintListById(listId);
    if (!list || !list.sections) return;

    // Find sections in current list (not new references)
    const fromSection = list.sections.find(s => s.id === fromSectionId);
    const toSection = list.sections.find(s => s.id === toSectionId);

    if (!fromSection || !toSection) return;

    // Remove from source
    fromSection.products = fromSection.products.filter(s => s !== sku);

    // Add to target
    if (toIndex >= 0 && toIndex <= toSection.products.length) {
        toSection.products.splice(toIndex, 0, sku);
    } else {
        toSection.products.push(sku);
    }

    updatePrintList(listId, { sections: list.sections });
}

/**
 * Get products for a specific section
 * @param {Array} skuList - Array of SKUs
 * @returns {Array} Array of product objects
 */
function getProductsForSection(skuList) {
    return skuList
        .map(sku => getProductBySku(sku))
        .filter(p => p !== null);
}

/**
 * Categorize a product into its category ID
 * @param {Object} product - Product object
 * @returns {string|null} Category ID or null
 */
function categorizeProduct(product) {
    // 28g products
    if (product.format === CONFIG.FORMATS.LARGE) {
        return CONFIG.PRINT_LISTS.CATEGORIES.OZ28;
    }

    // Indica
    if (product.type === CONFIG.TYPES.INDICA) {
        return product.format === CONFIG.FORMATS.SMALL
            ? CONFIG.PRINT_LISTS.CATEGORIES.INDICA_35G
            : CONFIG.PRINT_LISTS.CATEGORIES.INDICA_OTHER;
    }

    // Sativa
    if (product.type === CONFIG.TYPES.SATIVA) {
        return product.format === CONFIG.FORMATS.SMALL
            ? CONFIG.PRINT_LISTS.CATEGORIES.SATIVA_35G
            : CONFIG.PRINT_LISTS.CATEGORIES.SATIVA_OTHER;
    }

    // Hybride
    if (product.type === CONFIG.TYPES.HYBRIDE) {
        return product.format === CONFIG.FORMATS.SMALL
            ? CONFIG.PRINT_LISTS.CATEGORIES.HYBRIDE_35G
            : CONFIG.PRINT_LISTS.CATEGORIES.HYBRIDE_OTHER;
    }

    return null;
}

/**
 * Get available products for a list's category (not already in the list)
 * @param {string} listId - List ID
 * @param {string|null} sectionId - Optional section ID to filter by section's category
 * @returns {Array} Array of available products
 */
function getAvailableProductsForList(listId, sectionId = null) {
    const list = getPrintListById(listId);
    if (!list) return [];

    let currentSkus = [];
    let targetCategory = list.category;

    // If sections mode and sectionId provided, use section's category and products
    if (list.sections && sectionId) {
        const section = getSectionById(listId, sectionId);
        if (section) {
            currentSkus = section.products || [];
            targetCategory = section.category;
        }
    } else if (list.sections) {
        // Sections mode but no specific section - get all products from all sections
        list.sections.forEach(section => {
            currentSkus.push(...section.products);
        });
        targetCategory = null; // No filtering by category
    } else {
        // Flat list mode
        currentSkus = list.products || [];
    }

    return allProducts.filter(product => {
        // Not already in list/section
        if (currentSkus.includes(product.sku)) return false;

        // Must match the target category (if specified)
        if (targetCategory) {
            return categorizeProduct(product) === targetCategory;
        }

        return true;
    });
}

// ============================================
// UI Rendering - Lists Sidebar
// ============================================

/**
 * Render the lists sidebar
 */
function renderListsSidebar() {
    const container = document.getElementById('listsContainer');
    const lists = getAllPrintLists();
    const defaultListId = getDefaultListId();

    if (lists.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Aucune liste créée</p></div>';
        return;
    }

    container.innerHTML = lists.map(list => {
        const isActive = list.id === currentListId;
        const isDefault = list.id === defaultListId;

        return `
            <div class="list-item ${isActive ? 'active' : ''} ${isDefault ? 'default' : ''}" data-list-id="${list.id}">
                <div class="list-item-header">
                    <div class="list-item-title">${escapeHtml(list.name)}</div>
                    <div class="list-item-menu">
                        <button class="list-menu-btn" data-list-id="${list.id}" aria-label="Menu">⋮</button>
                    </div>
                </div>
                ${list.description ? `<div class="list-item-description">${escapeHtml(list.description)}</div>` : ''}
                <div class="list-item-meta">
                    ${formatDate(list.updatedAt)}
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('list-menu-btn')) return;
            const listId = item.dataset.listId;
            loadList(listId);
        });
    });

    // Add menu button handlers
    container.querySelectorAll('.list-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showListMenu(btn);
        });
    });
}

/**
 * Show list menu dropdown
 * @param {HTMLElement} button - Menu button element
 */
function showListMenu(button) {
    // Close any existing menus
    document.querySelectorAll('.list-menu-dropdown').forEach(menu => menu.remove());

    const listId = button.dataset.listId;
    const isDefault = getDefaultListId() === listId;

    const dropdown = document.createElement('div');
    dropdown.className = 'list-menu-dropdown';
    dropdown.innerHTML = `
        ${!isDefault ? '<button data-action="set-default">Définir par défaut</button>' : ''}
        <button data-action="rename">Renommer</button>
        <button data-action="duplicate">Dupliquer</button>
        <button data-action="delete" class="danger">Supprimer</button>
    `;

    button.parentElement.appendChild(dropdown);

    // Handle actions
    dropdown.querySelectorAll('button').forEach(actionBtn => {
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            dropdown.remove();

            switch(action) {
                case 'set-default':
                    setDefaultList(listId);
                    break;
                case 'rename':
                    openEditListModal(listId);
                    break;
                case 'duplicate':
                    handleDuplicateList(listId);
                    break;
                case 'delete':
                    handleDeleteList(listId);
                    break;
            }
        });
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            dropdown.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 0);
}

/**
 * Load and display a list
 * @param {string} listId - List ID
 */
function loadList(listId) {
    const list = getPrintListById(listId);
    if (!list) return;

    currentListId = listId;

    // Hide empty state, show editor
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('listEditorContent').style.display = 'block';

    // Update header
    document.getElementById('currentListName').textContent = list.name;
    document.getElementById('currentListDescription').textContent = list.description;

    // Update category display
    const categoryLabel = CONFIG.PRINT_LISTS.CATEGORY_LABELS[list.category] || list.category;
    document.getElementById('currentListCategory').textContent = categoryLabel;

    // Render list content (sections or flat list)
    renderListContent();

    // Update sidebar highlighting
    renderListsSidebar();
}

// ============================================
// UI Rendering - List Editor
// ============================================

/**
 * Render list content (sections or flat list)
 */
function renderListContent() {
    const list = getPrintListById(currentListId);
    if (!list) return;

    const sectionsContainer = document.getElementById('sectionsContainer');
    const flatListContainer = document.getElementById('flatListContainer');

    if (list.sections) {
        // Sections mode
        sectionsContainer.style.display = 'block';
        flatListContainer.style.display = 'none';

        renderSections();
    } else {
        // Flat list mode
        sectionsContainer.style.display = 'none';
        flatListContainer.style.display = 'block';

        renderListProducts();
    }
}

/**
 * Render sections
 */
function renderSections() {
    const list = getPrintListById(currentListId);
    if (!list || !list.sections) return;

    const container = document.getElementById('sectionsContainer');

    // Add "New Section" button at the top
    let html = `
        <div class="new-section-btn-container">
            <button id="createSectionBtn" class="btn-primary btn-small">
                + Nouvelle section
            </button>
        </div>
    `;

    // Render each section
    list.sections.forEach((section, index) => {
        const products = getProductsForSection(section.products);
        const isCollapsed = section.collapsed || false;

        html += `
            <div class="list-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="${section.id}" data-section-index="${index}">
                <div class="list-section-header">
                    <button class="collapse-toggle">▼</button>
                    <div class="list-section-title">
                        <h3>${escapeHtml(section.name)}</h3>
                        <span class="product-count">${products.length} produit${products.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="list-section-actions">
                        <button class="btn-small add-products-to-section-btn" data-section-id="${section.id}">+ Ajouter</button>
                        <button class="section-menu-btn" data-section-id="${section.id}">⋮</button>
                    </div>
                </div>
                <div class="list-section-content">
                    <div class="list-section-products" data-section-id="${section.id}">
                        ${renderSectionProducts(products, section.id)}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Add event listeners
    addSectionEventListeners();
}

/**
 * Render products for a section
 * @param {Array} products - Array of product objects
 * @param {string} sectionId - Section ID
 * @returns {string} HTML string
 */
function renderSectionProducts(products, sectionId) {
    if (products.length === 0) {
        return `
            <div class="empty-section-drop-zone" data-section-id="${sectionId}">
                <p>Aucun produit - Glissez des produits ici ou <button class="btn-link add-to-section-btn" data-section-id="${sectionId}">ajoutez-en</button></p>
            </div>
        `;
    }

    return products.map((product, index) =>
        createSectionProductCard(product, index, products.length, sectionId)
    ).join('');
}

/**
 * Create HTML for a product card in a section
 * @param {Object} product - Product object
 * @param {number} index - Product index
 * @param {number} total - Total products in section
 * @param {string} sectionId - Section ID
 * @returns {string} HTML string
 */
function createSectionProductCard(product, index, total, sectionId) {
    const thc = product.manualThc || product.thcMax || 'N/A';
    const cbd = product.manualCbd || product.cbdMax || 'N/A';
    const brand = product.brand || '';
    const format = product.format || '';

    return `
        <div class="list-product-card" draggable="true" data-sku="${product.sku}" data-index="${index}" data-section-id="${sectionId}">
            <div class="product-card-content">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-info">
                    <span>${escapeHtml(brand)}</span>
                    <span>THC: ${thc}%</span>
                    <span>CBD: ${cbd}%</span>
                    <span>${escapeHtml(format)}</span>
                </div>
            </div>
            <div class="product-card-actions">
                <button class="reorder-btn" data-action="up" data-sku="${product.sku}" data-section-id="${sectionId}" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="reorder-btn" data-action="down" data-sku="${product.sku}" data-section-id="${sectionId}" ${index === total - 1 ? 'disabled' : ''}>↓</button>
                <button class="remove-product-btn" data-sku="${product.sku}" data-section-id="${sectionId}" title="Retirer">×</button>
            </div>
        </div>
    `;
}

/**
 * Render products in the flat list
 */
function renderListProducts() {
    const list = getPrintListById(currentListId);
    if (!list) return;

    const grid = document.getElementById('productsGrid');
    const countElement = document.getElementById('productsCount');

    if (!grid) return;

    const products = getProductsForSection(list.products);

    // Update count
    if (countElement) {
        countElement.textContent = `${products.length} produit${products.length !== 1 ? 's' : ''}`;
    }

    // Render products
    if (products.length === 0) {
        grid.innerHTML = '<div class="empty-state">Aucun produit</div>';
    } else {
        grid.innerHTML = products.map((product, index) =>
            createListProductCard(product, index, products.length)
        ).join('');

        // Add event listeners
        addProductCardListeners(grid);
    }
}

/**
 * Create HTML for a product card in the list editor
 * @param {Object} product - Product object
 * @param {number} index - Product index
 * @param {number} total - Total products
 * @returns {string} HTML string
 */
function createListProductCard(product, index, total) {
    const thc = product.manualThc || product.thcMax || 'N/A';
    const cbd = product.manualCbd || product.cbdMax || 'N/A';
    const brand = product.brand || '';
    const format = product.format || '';

    return `
        <div class="list-product-card" draggable="true" data-sku="${product.sku}" data-index="${index}">
            <div class="product-card-content">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-info">
                    <span>${escapeHtml(brand)}</span>
                    <span>THC: ${thc}%</span>
                    <span>CBD: ${cbd}%</span>
                    <span>${escapeHtml(format)}</span>
                </div>
            </div>
            <div class="product-card-actions">
                <button class="reorder-btn" data-action="up" data-sku="${product.sku}" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="reorder-btn" data-action="down" data-sku="${product.sku}" ${index === total - 1 ? 'disabled' : ''}>↓</button>
                <button class="remove-product-btn" data-sku="${product.sku}" title="Retirer">×</button>
            </div>
        </div>
    `;
}

/**
 * Add event listeners to sections
 */
function addSectionEventListeners() {
    const container = document.getElementById('sectionsContainer');

    // Create section button
    const createBtn = document.getElementById('createSectionBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => openSectionModal());
    }

    // Collapse toggles
    container.querySelectorAll('.collapse-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sectionEl = btn.closest('.list-section');
            const sectionId = sectionEl.dataset.sectionId;
            const section = getSectionById(currentListId, sectionId);

            if (section) {
                updateSection(currentListId, sectionId, { collapsed: !section.collapsed });
                sectionEl.classList.toggle('collapsed');
            }
        });
    });

    // Section menu buttons
    container.querySelectorAll('.section-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showSectionMenu(btn);
        });
    });

    // Add to section buttons (in empty sections)
    container.querySelectorAll('.add-to-section-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.sectionId;
            openProductSelectionModal(sectionId);
        });
    });

    // Add products to section buttons (in section header)
    container.querySelectorAll('.add-products-to-section-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.sectionId;
            openProductSelectionModal(sectionId);
        });
    });

    // Product cards in sections
    container.querySelectorAll('.remove-product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sku = btn.dataset.sku;
            const sectionId = btn.dataset.sectionId;
            removeProductFromList(currentListId, sku, sectionId);
            renderListContent();
        });
    });

    // Reorder buttons in sections
    container.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const sku = btn.dataset.sku;
            const sectionId = btn.dataset.sectionId;
            reorderProductInSection(sku, sectionId, action);
        });
    });

    // Drag and drop for sections
    container.querySelectorAll('.list-section').forEach(section => {
        section.addEventListener('dragstart', handleSectionDragStart);
        section.addEventListener('dragend', handleSectionDragEnd);
        section.addEventListener('dragover', handleSectionDragOver);
        section.addEventListener('drop', handleSectionDrop);
    });

    // Drag and drop for products in sections
    container.querySelectorAll('.list-product-card').forEach(card => {
        card.addEventListener('dragstart', handleProductDragStart);
        card.addEventListener('dragend', handleProductDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleProductDropInSection);
    });

    // Drop zones for empty sections
    container.querySelectorAll('.empty-section-drop-zone').forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDropOnEmptySection);
    });
}

/**
 * Show section menu
 * @param {HTMLElement} button - Menu button
 */
function showSectionMenu(button) {
    // Close any existing menus
    document.querySelectorAll('.section-menu-dropdown').forEach(menu => menu.remove());
    document.querySelectorAll('.list-menu-dropdown').forEach(menu => menu.remove());

    const sectionId = button.dataset.sectionId;

    const dropdown = document.createElement('div');
    dropdown.className = 'section-menu-dropdown';
    dropdown.innerHTML = `
        <button data-action="delete" class="danger">Supprimer la section</button>
    `;

    button.parentElement.appendChild(dropdown);

    // Handle actions
    dropdown.querySelectorAll('button').forEach(actionBtn => {
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            dropdown.remove();

            if (action === 'delete') {
                handleDeleteSection(sectionId);
            }
        });
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            dropdown.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 0);
}

/**
 * Reorder product within a section
 * @param {string} sku - Product SKU
 * @param {string} sectionId - Section ID
 * @param {string} direction - 'up' or 'down'
 */
function reorderProductInSection(sku, sectionId, direction) {
    const list = getPrintListById(currentListId);
    if (!list || !list.sections) return;

    // Find section in current list (not a new reference)
    const section = list.sections.find(s => s.id === sectionId);
    if (!section) return;

    const skus = [...section.products];
    const index = skus.indexOf(sku);

    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        [skus[index], skus[index - 1]] = [skus[index - 1], skus[index]];
    } else if (direction === 'down' && index < skus.length - 1) {
        [skus[index], skus[index + 1]] = [skus[index + 1], skus[index]];
    }

    section.products = skus;
    updatePrintList(currentListId, { sections: list.sections });
    renderListContent();
}

/**
 * Add event listeners to product cards
 * @param {HTMLElement} grid - Grid container
 */
function addProductCardListeners(grid) {
    // Remove buttons
    grid.querySelectorAll('.remove-product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sku = btn.dataset.sku;
            removeProductFromList(currentListId, sku);
            renderListProducts();
        });
    });

    // Reorder buttons
    grid.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const sku = btn.dataset.sku;
            reorderProduct(sku, action);
        });
    });

    // Drag and drop
    grid.querySelectorAll('.list-product-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
    });
}

// ============================================
// Drag and Drop Handlers
// ============================================

let dragState = {
    draggedSku: null,
    draggedIndex: -1
};

let sectionDragState = {
    draggedSectionId: null,
    draggedSectionIndex: -1
};

let productSectionDragState = {
    draggedSku: null,
    draggedIndex: -1,
    sourceSectionId: null
};

/**
 * Handle drag start
 * @param {DragEvent} e - Drag event
 */
function handleDragStart(e) {
    const card = e.target;
    dragState.draggedSku = card.dataset.sku;
    dragState.draggedIndex = parseInt(card.dataset.index);

    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragState.draggedSku);
}

/**
 * Handle drag end
 * @param {DragEvent} e - Drag event
 */
function handleDragEnd(e) {
    const card = e.target;
    card.classList.remove('dragging');

    // Clear drag state
    dragState.draggedSku = null;
    dragState.draggedIndex = -1;
}

/**
 * Handle drag over
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drop
 * @param {DragEvent} e - Drag event
 */
function handleDrop(e) {
    e.preventDefault();

    const targetCard = e.target.closest('.list-product-card');
    if (!targetCard) return;

    const targetIndex = parseInt(targetCard.dataset.index);

    // Don't drop on self
    if (dragState.draggedIndex === targetIndex) return;

    // Reorder
    const list = getPrintListById(currentListId);
    if (!list) return;

    const skus = [...list.products];
    const [draggedSku] = skus.splice(dragState.draggedIndex, 1);
    skus.splice(targetIndex, 0, draggedSku);

    updatePrintList(currentListId, { products: skus });
    renderListProducts();
}

/**
 * Reorder a product in the list
 * @param {string} sku - Product SKU
 * @param {string} direction - 'up' or 'down'
 */
function reorderProduct(sku, direction) {
    const list = getPrintListById(currentListId);
    if (!list) return;

    const skus = [...list.products];
    const index = skus.indexOf(sku);

    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        // Swap with previous
        [skus[index], skus[index - 1]] = [skus[index - 1], skus[index]];
    } else if (direction === 'down' && index < skus.length - 1) {
        // Swap with next
        [skus[index], skus[index + 1]] = [skus[index + 1], skus[index]];
    }

    updatePrintList(currentListId, { products: skus });
    renderListProducts();
}

// ============================================
// Section Drag and Drop Handlers
// ============================================

/**
 * Handle section drag start
 */
function handleSectionDragStart(e) {
    const section = e.target.closest('.list-section');
    if (!section) return;

    sectionDragState.draggedSectionId = section.dataset.sectionId;
    sectionDragState.draggedSectionIndex = parseInt(section.dataset.sectionIndex);

    section.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * Handle section drag end
 */
function handleSectionDragEnd(e) {
    const section = e.target.closest('.list-section');
    if (section) {
        section.classList.remove('dragging');
    }

    sectionDragState.draggedSectionId = null;
    sectionDragState.draggedSectionIndex = -1;
}

/**
 * Handle section drag over
 */
function handleSectionDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle section drop
 */
function handleSectionDrop(e) {
    e.preventDefault();

    const targetSection = e.target.closest('.list-section');
    if (!targetSection) return;

    const targetIndex = parseInt(targetSection.dataset.sectionIndex);

    if (sectionDragState.draggedSectionIndex === targetIndex) return;

    reorderSections(currentListId, sectionDragState.draggedSectionIndex, targetIndex);
    renderListContent();
}

/**
 * Handle product drag start in sections
 */
function handleProductDragStart(e) {
    const card = e.target.closest('.list-product-card');
    if (!card) return;

    productSectionDragState.draggedSku = card.dataset.sku;
    productSectionDragState.draggedIndex = parseInt(card.dataset.index);
    productSectionDragState.sourceSectionId = card.dataset.sectionId;

    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * Handle product drag end in sections
 */
function handleProductDragEnd(e) {
    const card = e.target.closest('.list-product-card');
    if (card) {
        card.classList.remove('dragging');
    }

    productSectionDragState.draggedSku = null;
    productSectionDragState.draggedIndex = -1;
    productSectionDragState.sourceSectionId = null;
}

/**
 * Handle product drop in section
 */
function handleProductDropInSection(e) {
    e.preventDefault();
    e.stopPropagation();

    const targetCard = e.target.closest('.list-product-card');
    if (!targetCard) return;

    const targetSectionId = targetCard.dataset.sectionId;
    const targetIndex = parseInt(targetCard.dataset.index);

    if (productSectionDragState.sourceSectionId === targetSectionId &&
        productSectionDragState.draggedIndex === targetIndex) {
        return;
    }

    if (productSectionDragState.sourceSectionId === targetSectionId) {
        // Reordering within same section
        const list = getPrintListById(currentListId);
        if (!list || !list.sections) return;

        const section = list.sections.find(s => s.id === targetSectionId);
        if (!section) return;

        const skus = [...section.products];
        const [draggedSku] = skus.splice(productSectionDragState.draggedIndex, 1);
        skus.splice(targetIndex, 0, draggedSku);
        section.products = skus;
        updatePrintList(currentListId, { sections: list.sections });
    } else {
        // Moving between sections
        moveProductBetweenSections(
            currentListId,
            productSectionDragState.draggedSku,
            productSectionDragState.sourceSectionId,
            targetSectionId,
            targetIndex
        );
    }

    renderListContent();
}

/**
 * Handle drop on empty section
 */
function handleDropOnEmptySection(e) {
    e.preventDefault();
    e.stopPropagation();

    const zone = e.target.closest('.empty-section-drop-zone');
    if (!zone) return;

    const targetSectionId = zone.dataset.sectionId;

    if (productSectionDragState.sourceSectionId) {
        moveProductBetweenSections(
            currentListId,
            productSectionDragState.draggedSku,
            productSectionDragState.sourceSectionId,
            targetSectionId
        );
        renderListContent();
    }
}

// ============================================
// Modal Handlers
// ============================================

/**
 * Open the create/edit list modal
 * @param {string|null} listId - List ID for editing, null for creating
 */
function openEditListModal(listId = null) {
    const modal = document.getElementById('listModal');
    const title = document.getElementById('listModalTitle');
    const nameInput = document.getElementById('listNameInput');
    const descInput = document.getElementById('listDescriptionInput');
    const categorySelect = document.getElementById('listCategorySelect');

    if (listId) {
        // Edit mode
        const list = getPrintListById(listId);
        if (!list) return;

        modalState.isEditing = true;
        modalState.editingListId = listId;
        title.textContent = 'Modifier la liste';
        nameInput.value = list.name;
        descInput.value = list.description;
        categorySelect.value = list.category || CONFIG.PRINT_LISTS.CATEGORIES.INDICA_35G;
    } else {
        // Create mode
        modalState.isEditing = false;
        modalState.editingListId = null;
        title.textContent = 'Nouvelle liste';
        nameInput.value = '';
        descInput.value = '';
        categorySelect.value = CONFIG.PRINT_LISTS.CATEGORIES.INDICA_35G;
    }

    modal.style.display = 'flex';
    nameInput.focus();
}

/**
 * Close the list modal
 */
function closeListModal() {
    document.getElementById('listModal').style.display = 'none';
    modalState.isEditing = false;
    modalState.editingListId = null;
}

/**
 * Save list from modal
 */
function saveListFromModal() {
    const nameInput = document.getElementById('listNameInput');
    const descInput = document.getElementById('listDescriptionInput');
    const categorySelect = document.getElementById('listCategorySelect');

    const name = nameInput.value.trim();

    if (!name) {
        alert('Le nom de la liste est requis');
        return;
    }

    if (modalState.isEditing) {
        // Update existing list
        updatePrintList(modalState.editingListId, {
            name: name,
            description: descInput.value.trim(),
            category: categorySelect.value
        });

        // Reload if currently viewing
        if (currentListId === modalState.editingListId) {
            loadList(currentListId);
        }
    } else {
        // Create new list
        const category = categorySelect.value;
        const newList = createPrintList(name, descInput.value.trim(), category);
        loadList(newList.id);
    }

    renderListsSidebar();
    closeListModal();
}

/**
 * Handle list duplication
 * @param {string} listId - List ID to duplicate
 */
function handleDuplicateList(listId) {
    const duplicated = duplicatePrintList(listId);
    if (duplicated) {
        renderListsSidebar();
        loadList(duplicated.id);
    }
}

/**
 * Handle list deletion
 * @param {string} listId - List ID to delete
 */
function handleDeleteList(listId) {
    const list = getPrintListById(listId);
    if (!list) return;

    showConfirmDialog(
        'Supprimer la liste',
        `Supprimer définitivement la liste "${list.name}" ?`,
        () => {
            deletePrintList(listId);

            // If deleting current list, clear the editor
            if (currentListId === listId) {
                currentListId = null;
                document.getElementById('emptyState').style.display = 'flex';
                document.getElementById('listEditorContent').style.display = 'none';
            }

            renderListsSidebar();
        }
    );
}

/**
 * Show confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Function} onConfirm - Callback on confirm
 */
function showConfirmDialog(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleElement = document.getElementById('confirmModalTitle');
    const messageElement = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    titleElement.textContent = title;
    messageElement.textContent = message;

    modal.style.display = 'flex';

    const handleConfirm = () => {
        onConfirm();
        closeConfirmDialog();
    };

    const handleCancel = () => {
        closeConfirmDialog();
    };

    confirmBtn.onclick = handleConfirm;
    cancelBtn.onclick = handleCancel;
}

/**
 * Close confirmation dialog
 */
function closeConfirmDialog() {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'none';
}

// ============================================
// Section Modal Handlers
// ============================================

let sectionModalState = {
    isEditing: false,
    editingSectionId: null
};

/**
 * Open section create/edit modal
 * @param {string|null} sectionId - Section ID for editing, null for creating
 */
function openSectionModal(sectionId = null) {
    if (!currentListId) return;

    const modal = document.getElementById('sectionModal');
    const title = document.getElementById('sectionModalTitle');
    const categorySelect = document.getElementById('sectionCategorySelect');

    const list = getPrintListById(currentListId);
    const usedCategories = list.sections ? list.sections.map(s => s.category) : [];

    if (sectionId) {
        // Edit mode - disable category change (can't edit category)
        const section = getSectionById(currentListId, sectionId);
        if (!section) return;

        sectionModalState.isEditing = true;
        sectionModalState.editingSectionId = sectionId;
        title.textContent = 'Modifier la section';
        categorySelect.value = section.category;
        categorySelect.disabled = true; // Can't change category in edit mode
    } else {
        // Create mode
        sectionModalState.isEditing = false;
        sectionModalState.editingSectionId = null;
        title.textContent = 'Nouvelle section';
        categorySelect.value = '';
        categorySelect.disabled = false;

        // Disable already used categories
        Array.from(categorySelect.options).forEach(option => {
            if (option.value && usedCategories.includes(option.value)) {
                option.disabled = true;
                option.textContent = option.textContent.replace(' (déjà ajoutée)', '') + ' (déjà ajoutée)';
            } else {
                option.disabled = false;
                option.textContent = option.textContent.replace(' (déjà ajoutée)', '');
            }
        });
    }

    modal.style.display = 'flex';
    categorySelect.focus();
}

/**
 * Close section modal
 */
function closeSectionModal() {
    document.getElementById('sectionModal').style.display = 'none';
    sectionModalState.isEditing = false;
    sectionModalState.editingSectionId = null;
}

/**
 * Save section from modal
 */
function saveSectionFromModal() {
    const categorySelect = document.getElementById('sectionCategorySelect');
    const category = categorySelect.value;

    if (!category) {
        alert('Veuillez sélectionner une catégorie');
        return;
    }

    if (sectionModalState.isEditing) {
        // In edit mode, category can't be changed, so nothing to update
        // (Could be used later for other properties if needed)
        closeSectionModal();
    } else {
        // Create new section
        const newSection = createSection(currentListId, category);
        if (newSection) {
            renderListContent();
            closeSectionModal();
        }
    }
}

/**
 * Toggle sections mode
 */
function toggleSectionsMode() {
    if (!currentListId) return;

    const list = getPrintListById(currentListId);
    if (!list) return;

    if (list.sections) {
        // Disable sections mode
        showConfirmDialog(
            'Désactiver les sections',
            'Tous les produits seront regroupés en une seule liste. Continuer ?',
            () => {
                disableSectionsMode(currentListId);
                renderListContent();
            }
        );
    } else {
        // Enable sections mode
        enableSectionsMode(currentListId);
        renderListContent();
    }
}

/**
 * Handle section deletion
 * @param {string} sectionId - Section ID
 */
function handleDeleteSection(sectionId) {
    const section = getSectionById(currentListId, sectionId);
    if (!section) return;

    const productCount = section.products.length;
    const message = productCount > 0
        ? `Supprimer la section "${section.name}" et ses ${productCount} produit(s) ?`
        : `Supprimer la section "${section.name}" ?`;

    showConfirmDialog(
        'Supprimer la section',
        message,
        () => {
            deleteSection(currentListId, sectionId);
            renderListContent();
        }
    );
}

// ============================================
// Product Selection Modal
// ============================================

let selectedProducts = new Set();
let productSearchQuery = '';
let targetSectionId = null; // Track which section to add products to

/**
 * Open product selection modal
 * @param {string|null} sectionId - Optional section ID to add products to
 */
function openProductSelectionModal(sectionId = null) {
    if (!currentListId) return;

    selectedProducts.clear();
    targetSectionId = sectionId;

    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';

    renderProductSelectionGrid();
    updateSelectedCount();

    document.getElementById('productSearchInput').value = '';
    productSearchQuery = '';
}

/**
 * Close product selection modal
 */
function closeProductSelectionModal() {
    document.getElementById('productModal').style.display = 'none';
    selectedProducts.clear();
    productSearchQuery = '';
}

/**
 * Render product selection grid
 */
function renderProductSelectionGrid() {
    const grid = document.getElementById('productSelectionGrid');

    let availableProducts = getAvailableProductsForList(currentListId, targetSectionId);

    // Apply search filter
    if (productSearchQuery) {
        const query = productSearchQuery.toLowerCase();
        availableProducts = availableProducts.filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.brand.toLowerCase().includes(query)
        );
    }

    if (availableProducts.length === 0) {
        grid.innerHTML = '<div class="empty-state">Aucun produit disponible</div>';
        return;
    }

    grid.innerHTML = availableProducts.map(product => {
        const isSelected = selectedProducts.has(product.sku);
        const thc = product.manualThc || product.thcMax || 'N/A';
        const cbd = product.manualCbd || product.cbdMax || 'N/A';

        return `
            <div class="product-checkbox-card ${isSelected ? 'selected' : ''}" data-sku="${product.sku}">
                <div class="product-checkbox-header">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} data-sku="${product.sku}">
                    <div class="product-name">${escapeHtml(product.name)}</div>
                </div>
                <div class="product-brand">${escapeHtml(product.brand)}</div>
                <div class="product-details">
                    <div class="product-detail-item">
                        <span class="product-detail-label">THC</span>
                        <span class="product-detail-value">${thc}%</span>
                    </div>
                    <div class="product-detail-item">
                        <span class="product-detail-label">CBD</span>
                        <span class="product-detail-value">${cbd}%</span>
                    </div>
                    <div class="product-detail-item">
                        <span class="product-detail-label">Format</span>
                        <span class="product-detail-value">${escapeHtml(product.format)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    grid.querySelectorAll('.product-checkbox-card').forEach(card => {
        card.addEventListener('click', () => {
            const sku = card.dataset.sku;
            toggleProductSelection(sku);
        });
    });

    grid.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent double-toggle from card click
        });
        checkbox.addEventListener('change', (e) => {
            const sku = e.target.dataset.sku;
            if (e.target.checked) {
                selectedProducts.add(sku);
            } else {
                selectedProducts.delete(sku);
            }
            updateSelectedCount();
            updateCardSelection(sku);
        });
    });
}

/**
 * Toggle product selection
 * @param {string} sku - Product SKU
 */
function toggleProductSelection(sku) {
    const checkbox = document.querySelector(`input[type="checkbox"][data-sku="${sku}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
    }
}

/**
 * Update card selection state
 * @param {string} sku - Product SKU
 */
function updateCardSelection(sku) {
    const card = document.querySelector(`.product-checkbox-card[data-sku="${sku}"]`);
    if (card) {
        if (selectedProducts.has(sku)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }
}

/**
 * Update selected products count
 */
function updateSelectedCount() {
    document.getElementById('selectedCount').textContent =
        `${selectedProducts.size} produit(s) sélectionné(s)`;
}

/**
 * Add selected products to list
 */
function addSelectedProductsToList() {
    if (!currentListId) return;

    selectedProducts.forEach(sku => {
        addProductToList(currentListId, sku, targetSectionId);
    });

    renderListContent();
    closeProductSelectionModal();
    targetSectionId = null;
}

// ============================================
// Print Functionality
// ============================================

/**
 * Get column configuration for a list
 * @param {string} listId - List ID
 * @returns {Array} Array of column objects
 */
function getColumnConfig(listId) {
    const list = getPrintListById(listId);
    if (!list) return CONFIG.PRINT_LISTS.DEFAULT_COLUMNS;

    // Return list-specific config or default
    return list.columnConfig || CONFIG.PRINT_LISTS.DEFAULT_COLUMNS;
}

/**
 * Generate print-ready HTML for a list
 * @param {string} listId - List ID
 * @returns {string} HTML string
 */
function generatePrintHTML(listId) {
    const list = getPrintListById(listId);
    if (!list) return '';

    const columns = getColumnConfig(listId).filter(col => col.visible);

    // Check if list uses sections
    if (list.sections && list.sections.length > 0) {
        // Generate multiple tables, one per section
        let html = '';

        list.sections.forEach(section => {
            const products = getProductsForSection(section.products);

            // Section title
            html += `
                <div class="print-section">
                    <h3 class="print-section-title">${escapeHtml(section.name)}</h3>
                    <table class="print-table">
                        <thead>
                            <tr>
                                ${columns.map(col => `<th style="width: ${col.width}">${escapeHtml(col.label)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Product rows
            products.forEach(product => {
                html += '<tr>';
                columns.forEach(col => {
                    html += `<td>${escapeHtml(String(getProductColumnValue(product, col.id)))}</td>`;
                });
                html += '</tr>';
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        return html;
    } else {
        // Flat list - single table
        const products = getProductsForSection(list.products);

        let html = `
            <table class="print-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th style="width: ${col.width}">${escapeHtml(col.label)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        // Product rows
        products.forEach(product => {
            html += '<tr>';
            columns.forEach(col => {
                html += `<td>${escapeHtml(String(getProductColumnValue(product, col.id)))}</td>`;
            });
            html += '</tr>';
        });

        html += `
                </tbody>
            </table>
        `;

        return html;
    }
}

/**
 * Get product column value by column ID
 * @param {Object} product - Product object
 * @param {string} columnId - Column ID
 * @returns {string} Column value
 */
function getProductColumnValue(product, columnId) {
    switch(columnId) {
        case 'name':
            return product.name;
        case 'brand':
            return product.brand;
        case 'thc':
            return `${product.manualThc || product.thcMax || 'N/A'}%`;
        case 'cbd':
            return `${product.manualCbd || product.cbdMax || 'N/A'}%`;
        case 'format':
            return product.format;
        case 'type':
            return product.type;
        default:
            return '';
    }
}

/**
 * Print a list
 * @param {string} listId - List ID
 */
function printList(listId) {
    const list = getPrintListById(listId);
    if (!list) return;

    // Check if list has any products
    let hasProducts = false;
    if (list.sections && list.sections.length > 0) {
        // Check if any section has products
        hasProducts = list.sections.some(section => section.products.length > 0);
    } else {
        // Check flat list
        hasProducts = list.products.length > 0;
    }

    if (!hasProducts) {
        alert('Cette liste ne contient aucun produit à imprimer');
        return;
    }

    // Generate and inject HTML
    const printHTML = generatePrintHTML(listId);
    const printContainer = document.getElementById('printContainer');
    printContainer.innerHTML = printHTML;
    printContainer.style.display = 'block';

    // Save original title and replace with empty string to hide browser header
    const originalTitle = document.title;
    document.title = ' ';

    // Trigger print
    window.print();

    // Restore title and clean up after print
    setTimeout(() => {
        document.title = originalTitle;
        printContainer.innerHTML = '';
        printContainer.style.display = 'none';
    }, 100);
}

// ============================================
// CSV Export Functionality
// ============================================

/**
 * Generate CSV content from list data
 * @param {string} listId - List ID
 * @returns {string} CSV content
 */
function generateCSV(listId) {
    const list = getPrintListById(listId);
    if (!list) return '';

    const columns = getColumnConfig(listId).filter(col => col.visible);
    const headers = columns.map(col => `"${col.label}"`).join(',');

    // Check if list uses sections
    if (list.sections && list.sections.length > 0) {
        // Generate CSV with sections clearly separated
        const csvLines = [];

        list.sections.forEach((section, index) => {
            const products = getProductsForSection(section.products);

            // Section header line
            csvLines.push(`"=== SECTION: ${section.name} ==="`);

            // Column headers for this section
            csvLines.push(headers);

            // Product rows
            products.forEach(product => {
                const row = columns.map(col => {
                    const value = getProductColumnValue(product, col.id);
                    // Escape quotes and wrap in quotes
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',');
                csvLines.push(row);
            });

            // Empty line between sections (except after last section)
            if (index < list.sections.length - 1) {
                csvLines.push('');
            }
        });

        return csvLines.join('\n');
    } else {
        // Flat list - standard CSV
        const products = getProductsForSection(list.products);

        const rows = products.map(product => {
            return columns.map(col => {
                const value = getProductColumnValue(product, col.id);
                // Escape quotes and wrap in quotes
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });

        return [headers, ...rows].join('\n');
    }
}

/**
 * Download a list as CSV
 * @param {string} listId - List ID
 */
function downloadCSV(listId) {
    const list = getPrintListById(listId);
    if (!list) return;

    // Check if list has any products
    let hasProducts = false;
    if (list.sections && list.sections.length > 0) {
        // Check if any section has products
        hasProducts = list.sections.some(section => section.products.length > 0);
    } else {
        // Check flat list
        hasProducts = list.products.length > 0;
    }

    if (!hasProducts) {
        alert('Cette liste ne contient aucun produit à exporter');
        return;
    }

    // Generate CSV content
    const csvContent = generateCSV(listId);

    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Generate filename from list name and date
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${list.name.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.display = 'none';

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// List Actions
// ============================================

/**
 * Clear all products from the list
 */
function handleClearList() {
    if (!currentListId) return;

    const list = getPrintListById(currentListId);
    if (!list) return;

    const productCount = list.products.length;
    if (productCount === 0) return;

    showConfirmDialog(
        'Vider la liste',
        `Supprimer tous les ${productCount} produit(s) de cette liste ?`,
        () => {
            updatePrintList(currentListId, { products: [] });
            renderListProducts();
        }
    );
}


// ============================================
// List Search
// ============================================

/**
 * Handle list search
 * @param {string} query - Search query
 */
function handleListSearch(query) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.list-product-card');
    const lowerQuery = query.toLowerCase();

    cards.forEach(card => {
        const nameElement = card.querySelector('.product-name');
        const productInfo = card.querySelector('.product-info');

        if (!nameElement) return;

        const name = nameElement.textContent.toLowerCase();
        const info = productInfo ? productInfo.textContent.toLowerCase() : '';

        if (name.includes(lowerQuery) || info.includes(lowerQuery)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    // Show "no results" if all hidden
    const visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
    if (visibleCards.length === 0 && cards.length > 0) {
        if (!grid.querySelector('.search-no-results')) {
            const noResults = document.createElement('div');
            noResults.className = 'empty-state search-no-results';
            noResults.textContent = 'Aucun produit trouvé';
            grid.appendChild(noResults);
        }
    } else {
        const noResults = grid.querySelector('.search-no-results');
        if (noResults) noResults.remove();
    }
}

// ============================================
// Column Configuration
// ============================================

let columnConfigState = {
    columns: [],
    listId: null
};

/**
 * Update column configuration for a list
 * @param {string} listId - List ID
 * @param {Array} columns - Array of column objects
 * @returns {boolean} Success status
 */
function updateColumnConfig(listId, columns) {
    // Validate: ensure 'name' column is present and visible
    const nameColumn = columns.find(col => col.id === 'name');
    if (!nameColumn || !nameColumn.visible) {
        alert('La colonne "Nom du produit" doit toujours être visible');
        return false;
    }

    updatePrintList(listId, { columnConfig: columns });
    return true;
}

/**
 * Reset to default columns
 * @param {string} listId - List ID
 */
function resetToDefaultColumns(listId) {
    updatePrintList(listId, { columnConfig: null });
}

/**
 * Open column configuration modal
 */
function openColumnConfigModal() {
    if (!currentListId) return;

    const modal = document.getElementById('columnConfigModal');
    const columns = getColumnConfig(currentListId);

    // Deep copy to avoid mutating original
    columnConfigState.columns = JSON.parse(JSON.stringify(columns));
    columnConfigState.listId = currentListId;

    renderColumnConfigList();
    renderColumnPreview();

    modal.style.display = 'flex';
}

/**
 * Close column configuration modal
 */
function closeColumnConfigModal() {
    document.getElementById('columnConfigModal').style.display = 'none';
    columnConfigState.columns = [];
    columnConfigState.listId = null;
}

/**
 * Render column configuration list
 */
function renderColumnConfigList() {
    const container = document.getElementById('columnConfigList');

    container.innerHTML = columnConfigState.columns.map((col, index) => {
        const isFixed = col.fixed || false;

        return `
            <div class="column-config-item" draggable="${!isFixed}" data-index="${index}" data-col-id="${col.id}">
                <span class="column-drag-handle">${isFixed ? '🔒' : '⋮⋮'}</span>
                <div class="column-config-controls">
                    <input type="checkbox"
                           id="col-visible-${col.id}"
                           ${col.visible ? 'checked' : ''}
                           ${isFixed ? 'disabled' : ''}
                           data-col-id="${col.id}">
                    <label for="col-visible-${col.id}">${escapeHtml(col.label)}</label>
                    <input type="text"
                           class="column-width-input"
                           value="${col.width}"
                           data-col-id="${col.id}"
                           placeholder="ex: 30%">
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const colId = e.target.dataset.colId;
            const column = columnConfigState.columns.find(c => c.id === colId);
            if (column) {
                column.visible = e.target.checked;
                renderColumnPreview();
            }
        });
    });

    container.querySelectorAll('.column-width-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const colId = e.target.dataset.colId;
            const column = columnConfigState.columns.find(c => c.id === colId);
            if (column) {
                column.width = e.target.value;
                renderColumnPreview();
            }
        });
    });

    // Add drag and drop for reordering (non-fixed columns only)
    container.querySelectorAll('.column-config-item[draggable="true"]').forEach(item => {
        item.addEventListener('dragstart', handleColumnDragStart);
        item.addEventListener('dragend', handleColumnDragEnd);
        item.addEventListener('dragover', handleColumnDragOver);
        item.addEventListener('drop', handleColumnDrop);
    });
}

/**
 * Render column preview
 */
function renderColumnPreview() {
    const container = document.getElementById('columnPreview');
    const visibleColumns = columnConfigState.columns.filter(col => col.visible);

    if (visibleColumns.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune colonne visible</p>';
        return;
    }

    // Sample data
    const sampleProducts = allProducts.slice(0, 3);

    let html = '<table class="preview-table"><thead><tr>';

    visibleColumns.forEach(col => {
        html += `<th style="width: ${col.width}">${escapeHtml(col.label)}</th>`;
    });

    html += '</tr></thead><tbody>';

    sampleProducts.forEach(product => {
        html += '<tr>';
        visibleColumns.forEach(col => {
            let value = '';
            switch(col.id) {
                case 'name':
                    value = product.name;
                    break;
                case 'brand':
                    value = product.brand;
                    break;
                case 'thc':
                    value = `${product.manualThc || product.thcMax || 'N/A'}%`;
                    break;
                case 'cbd':
                    value = `${product.manualCbd || product.cbdMax || 'N/A'}%`;
                    break;
                case 'format':
                    value = product.format;
                    break;
                case 'type':
                    value = product.type;
                    break;
                default:
                    value = '';
            }
            html += `<td>${escapeHtml(String(value))}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';

    container.innerHTML = html;
}

/**
 * Save column configuration
 */
function saveColumnConfig() {
    if (!columnConfigState.listId) return;

    const success = updateColumnConfig(columnConfigState.listId, columnConfigState.columns);
    if (success) {
        closeColumnConfigModal();
    }
}

/**
 * Reset column configuration
 */
function handleResetColumns() {
    columnConfigState.columns = JSON.parse(JSON.stringify(CONFIG.PRINT_LISTS.DEFAULT_COLUMNS));
    renderColumnConfigList();
    renderColumnPreview();
}

// Drag and Drop for Column Reordering
let columnDragState = {
    draggedIndex: -1
};

function handleColumnDragStart(e) {
    const item = e.target;
    columnDragState.draggedIndex = parseInt(item.dataset.index);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleColumnDragEnd(e) {
    const item = e.target;
    item.classList.remove('dragging');
    columnDragState.draggedIndex = -1;
}

function handleColumnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleColumnDrop(e) {
    e.preventDefault();

    const targetItem = e.target.closest('.column-config-item');
    if (!targetItem) return;

    const targetIndex = parseInt(targetItem.dataset.index);

    if (columnDragState.draggedIndex === targetIndex) return;

    // Don't allow moving fixed columns
    const draggedCol = columnConfigState.columns[columnDragState.draggedIndex];
    if (draggedCol.fixed) return;

    // Reorder
    const [draggedColumn] = columnConfigState.columns.splice(columnDragState.draggedIndex, 1);
    columnConfigState.columns.splice(targetIndex, 0, draggedColumn);

    renderColumnConfigList();
    renderColumnPreview();
}

// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Format date for display
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load products
    loadProducts();

    // Render lists sidebar
    renderListsSidebar();

    // Load default list if set
    const defaultListId = getDefaultListId();
    if (defaultListId && getPrintListById(defaultListId)) {
        loadList(defaultListId);
    }

    // ============================================
    // Event Listeners - Create List
    // ============================================

    document.getElementById('createListBtn').addEventListener('click', () => {
        openEditListModal();
    });

    document.getElementById('saveListBtn').addEventListener('click', () => {
        saveListFromModal();
    });

    document.getElementById('cancelListBtn').addEventListener('click', () => {
        closeListModal();
    });

    // Close modal on X button
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // ============================================
    // Event Listeners - Edit List
    // ============================================

    document.getElementById('editListBtn').addEventListener('click', () => {
        if (currentListId) {
            openEditListModal(currentListId);
        }
    });

    document.getElementById('printListBtn').addEventListener('click', () => {
        if (currentListId) {
            printList(currentListId);
        }
    });

    document.getElementById('downloadCsvBtn').addEventListener('click', () => {
        if (currentListId) {
            downloadCSV(currentListId);
        }
    });

    document.getElementById('configColumnsBtn').addEventListener('click', () => {
        if (currentListId) {
            openColumnConfigModal();
        }
    });

    // ============================================
    // Event Listeners - Column Configuration Modal
    // ============================================

    document.getElementById('saveColumnConfigBtn').addEventListener('click', () => {
        saveColumnConfig();
    });

    document.getElementById('cancelColumnConfigBtn').addEventListener('click', () => {
        closeColumnConfigModal();
    });

    document.getElementById('resetColumnsBtn').addEventListener('click', () => {
        handleResetColumns();
    });

    // ============================================
    // Event Listeners - Section Management
    // ============================================

    // Section modal buttons
    document.getElementById('saveSectionBtn').addEventListener('click', () => {
        saveSectionFromModal();
    });

    document.getElementById('cancelSectionBtn').addEventListener('click', () => {
        closeSectionModal();
    });

    // ============================================
    // Event Listeners - List Actions
    // ============================================

    // Add products button
    const addProductsBtn = document.getElementById('addProductsBtn');
    if (addProductsBtn) {
        addProductsBtn.addEventListener('click', () => {
            openProductSelectionModal();
        });
    }

    // Clear list button
    const clearListBtn = document.getElementById('clearListBtn');
    if (clearListBtn) {
        clearListBtn.addEventListener('click', () => {
            handleClearList();
        });
    }

    // List search input
    const listSearchInput = document.getElementById('listSearchInput');
    if (listSearchInput) {
        listSearchInput.addEventListener('input', (e) => {
            handleListSearch(e.target.value);
        });
    }

    // ============================================
    // Event Listeners - Product Selection Modal
    // ============================================

    document.getElementById('addSelectedProductsBtn').addEventListener('click', () => {
        addSelectedProductsToList();
    });

    document.getElementById('cancelProductSelectionBtn').addEventListener('click', () => {
        closeProductSelectionModal();
    });

    document.getElementById('productSearchInput').addEventListener('input', (e) => {
        productSearchQuery = e.target.value;
        renderProductSelectionGrid();
    });

    console.log('Print Lists application initialized');
});
