// Configuration constants for SQDC Products Portal
const CONFIG = {
    FORMATS: {
        SMALL: '3,5 g',
        LARGE: '28 g',
        MEDIUM: '7 g'
    },
    TYPES: {
        INDICA: 'Indica',
        SATIVA: 'Sativa',
        HYBRIDE: 'Hybride',
        ALL: 'all'
    },
    STORAGE_KEYS: {
        THC_CHANGES: 'sqdcThcChanges',
        CBD_CHANGES: 'sqdcCbdChanges',
        TYPE_CHANGES: 'sqdcProductTypeChanges',
        FORMAT_CHANGES: 'sqdcFormatChanges',
        STORE_ID: 'sqdcStoreId',
        SECTIONS: 'sqdcSectionsConfig',
        SECTION_WIDTH_PREFIX: 'sqdcSectionWidth_',
        ROW_HEIGHT: 'sqdcRowHeight',
        NEW_PRODUCTS: 'sqdcNewProducts',
        HIDDEN_PRODUCTS: 'sqdcHiddenProducts',
        PRODUCT_DISPLAY_MODES: 'sqdcProductDisplayModes',
        SECTION_SLOTS: 'sqdcSectionSlots'
    },
    VALIDATION: {
        THC_MIN: 0,
        THC_MAX: 100,
        CBD_MIN: 0,
        CBD_MAX: 100
    },

    PRINT_LISTS: {
        STORAGE_KEY: 'sqdcPrintLists',
        DEFAULT_LIST_KEY: 'sqdcDefaultPrintListId',
        COLUMNS_KEY: 'sqdcPrintListColumns',
        // Category IDs for all formats and strain types
        CATEGORIES: {
            INDICA_35G: 'indica-3.5g',
            INDICA_1G: 'indica-1g',
            INDICA_7G: 'indica-7g',
            INDICA_15G: 'indica-15g',
            INDICA_28G: 'indica-28g',
            INDICA_PREROLL: 'indica-preroll',
            SATIVA_35G: 'sativa-3.5g',
            SATIVA_1G: 'sativa-1g',
            SATIVA_7G: 'sativa-7g',
            SATIVA_15G: 'sativa-15g',
            SATIVA_28G: 'sativa-28g',
            SATIVA_PREROLL: 'sativa-preroll',
            HYBRIDE_35G: 'hybride-3.5g',
            HYBRIDE_1G: 'hybride-1g',
            HYBRIDE_7G: 'hybride-7g',
            HYBRIDE_15G: 'hybride-15g',
            HYBRIDE_28G: 'hybride-28g',
            HYBRIDE_PREROLL: 'hybride-preroll'
        },
        // Display labels for categories
        CATEGORY_LABELS: {
            'indica-3.5g': 'Indica 3,5 g',
            'indica-1g': 'Indica 1 g',
            'indica-7g': 'Indica 7 g',
            'indica-15g': 'Indica 15 g',
            'indica-28g': 'Indica 28 g',
            'indica-preroll': 'Indica Préroulés',
            'sativa-3.5g': 'Sativa 3,5 g',
            'sativa-1g': 'Sativa 1 g',
            'sativa-7g': 'Sativa 7 g',
            'sativa-15g': 'Sativa 15 g',
            'sativa-28g': 'Sativa 28 g',
            'sativa-preroll': 'Sativa Préroulés',
            'hybride-3.5g': 'Hybride 3,5 g',
            'hybride-1g': 'Hybride 1 g',
            'hybride-7g': 'Hybride 7 g',
            'hybride-15g': 'Hybride 15 g',
            'hybride-28g': 'Hybride 28 g',
            'hybride-preroll': 'Hybride Préroulés'
        },
        DEFAULT_COLUMNS: [
            { id: 'name', label: 'Nom du produit', visible: true, width: '35%', fixed: true },
            { id: 'brand', label: 'Marque', visible: true, width: '20%' },
            { id: 'thc', label: 'THC %', visible: true, width: '15%' },
            { id: 'cbd', label: 'CBD %', visible: false, width: '15%' },
            { id: 'format', label: 'Format', visible: true, width: '15%' },
            { id: 'type', label: 'Type', visible: true, width: '15%' }
        ]
    },
    SECTION_CONFIG: {
        // Section configuration storage
        SECTIONS_KEY: 'sqdcSectionsConfig',
        
        // Available formats for sections
        AVAILABLE_FORMATS: {
            '1g': '1 g',
            '3.5g': '3,5 g',
            '7g': '7 g',
            '15g': '15 g',
            '28g': '28 g',
            'preroll': 'Préroulé',
            'hashish': 'Hashish',
            'edible': 'Mangeable',
            'infused': 'Infusé',
            'oil': 'Huile'
        },
        
        // Available strain types
        STRAIN_TYPES: {
            INDICA: 'Indica',
            SATIVA: 'Sativa',
            HYBRIDE: 'Hybride',
            ALL: 'Tous'
        },
        
        // Storage types
        STORAGE_TYPES: {
            DOOR: 'porte',
            DRAWER: 'tiroir'
        },
        
        // Wall positions
        WALL_POSITIONS: {
            FRONT: 'front',
            SIDE: 'side'
        },
        
        // Default sections configuration
        DEFAULT_SECTIONS: [
            {
                id: 'front-door-35g-28g',
                name: 'Fleur 3,5g et 28g',
                formats: ['3.5g', '28g'],
                strainTypes: ['Indica', 'Sativa', 'Hybride'],
                storageType: 'door',
                storageCount: 26,
                wallPosition: 'front',
                order: 1,
                visible: true
            },
            {
                id: 'front-drawer-multi',
                name: 'Fleur 1g, 15g, 28g et Préroulés',
                formats: ['1g', '15g', '28g', 'preroll'],
                strainTypes: ['Indica', 'Sativa', 'Hybride'],
                storageType: 'drawer',
                storageCount: 78,
                wallPosition: 'front',
                order: 2,
                visible: true
            },
            {
                id: 'side-door-4-concentrates',
                name: 'Concentrés et Huiles - 4 Portes',
                formats: ['hashish', 'edible', 'infused', 'oil'],
                strainTypes: ['Indica', 'Sativa', 'Hybride'],
                storageType: 'door',
                storageCount: 4,
                wallPosition: 'side',
                order: 3,
                visible: true
            },
            {
                id: 'side-door-3-concentrates',
                name: 'Concentrés et Huiles - 3 Portes',
                formats: ['hashish', 'edible', 'infused', 'oil'],
                strainTypes: ['Indica', 'Sativa', 'Hybride'],
                storageType: 'door',
                storageCount: 3,
                wallPosition: 'side',
                order: 4,
                visible: true
            },
            {
                id: 'side-drawer-4-concentrates-1',
                name: 'Concentrés et Huiles - 4 Tiroirs (1)',
                formats: ['hashish', 'edible', 'infused', 'oil'],
                strainTypes: ['Indica', 'Sativa', 'Hybride'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'side',
                order: 5,
                visible: true
            },
            {
                id: 'side-drawer-4-concentrates-2',
                name: 'Concentrés et Huiles - 4 Tiroirs (2)',
                formats: ['hashish', 'edible', 'infused', 'oil'],
                strainTypes: ['Indica', 'Sativa', 'Hybride'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'side',
                order: 6,
                visible: true
            }
        ]
    },
    
    // Display configuration for doors and drawers
    DRAWER_CONFIG: {
        productsPerDrawer: 2
    },
    
    DOOR_CONFIG: {
        productsPerDoor: 6
    }
};
