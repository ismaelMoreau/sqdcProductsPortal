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
        ADDED_PRODUCT_SKUS: 'sqdcAddedProductSkus',
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
                id: 'indica-35g',
                name: 'Indica 3,5g',
                formats: ['3.5g'],
                strainTypes: ['Indica'],
                storageType: 'door',
                storageCount: 12,
                wallPosition: 'front',
                order: 1,
                visible: true
            },
            {
                id: 'sativa-35g',
                name: 'Sativa 3,5g',
                formats: ['3.5g'],
                strainTypes: ['Sativa'],
                storageType: 'door',
                storageCount: 12,
                wallPosition: 'front',
                order: 2,
                visible: true
            },
            {
                id: 'hybride-35g',
                name: 'Hybride 3,5g',
                formats: ['3.5g'],
                strainTypes: ['Hybride'],
                storageType: 'door',
                storageCount: 12,
                wallPosition: 'front',
                order: 3,
                visible: true
            },
            {
                id: 'indica-1g',
                name: 'Indica 1g',
                formats: ['1g'],
                strainTypes: ['Indica'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 4,
                visible: true
            },
            {
                id: 'sativa-1g',
                name: 'Sativa 1g',
                formats: ['1g'],
                strainTypes: ['Sativa'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 5,
                visible: true
            },
            {
                id: 'hybride-1g',
                name: 'Hybride 1g',
                formats: ['1g'],
                strainTypes: ['Hybride'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 6,
                visible: true
            },
            {
                id: 'indica-7g',
                name: 'Indica 7g',
                formats: ['7g'],
                strainTypes: ['Indica'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 7,
                visible: true
            },
            {
                id: 'sativa-7g',
                name: 'Sativa 7g',
                formats: ['7g'],
                strainTypes: ['Sativa'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 8,
                visible: true
            },
            {
                id: 'hybride-7g',
                name: 'Hybride 7g',
                formats: ['7g'],
                strainTypes: ['Hybride'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 9,
                visible: true
            },
            {
                id: 'indica-15g',
                name: 'Indica 15g',
                formats: ['15g'],
                strainTypes: ['Indica'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 10,
                visible: true
            },
            {
                id: 'sativa-15g',
                name: 'Sativa 15g',
                formats: ['15g'],
                strainTypes: ['Sativa'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 11,
                visible: true
            },
            {
                id: 'hybride-15g',
                name: 'Hybride 15g',
                formats: ['15g'],
                strainTypes: ['Hybride'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 12,
                visible: true
            },
            {
                id: 'indica-28g',
                name: 'Indica 28g',
                formats: ['28g'],
                strainTypes: ['Indica'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 13,
                visible: true
            },
            {
                id: 'sativa-28g',
                name: 'Sativa 28g',
                formats: ['28g'],
                strainTypes: ['Sativa'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 14,
                visible: true
            },
            {
                id: 'hybride-28g',
                name: 'Hybride 28g',
                formats: ['28g'],
                strainTypes: ['Hybride'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 15,
                visible: true
            },
            {
                id: 'indica-preroll',
                name: 'Indica Préroulés',
                formats: ['preroll'],
                strainTypes: ['Indica'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 16,
                visible: true
            },
            {
                id: 'sativa-preroll',
                name: 'Sativa Préroulés',
                formats: ['preroll'],
                strainTypes: ['Sativa'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 17,
                visible: true
            },
            {
                id: 'hybride-preroll',
                name: 'Hybride Préroulés',
                formats: ['preroll'],
                strainTypes: ['Hybride'],
                storageType: 'drawer',
                storageCount: 12,
                wallPosition: 'front',
                order: 18,
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
