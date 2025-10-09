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
        OZ28: '28g',
        ALL: 'all'
    },
    STORAGE_KEYS: {
        THC_CHANGES: 'sqdcThcChanges',
        CBD_CHANGES: 'sqdcCbdChanges',
        TYPE_CHANGES: 'sqdcProductTypeChanges',
        FORMAT_CHANGES: 'sqdcFormatChanges',
        PRODUCT_ORDER: 'sqdcProductOrder',
        DRAWER_COUNT: 'sqdcDrawerCount',
        DOOR_COUNT: 'sqdcDoorCount'
    },
    VALIDATION: {
        THC_MIN: 0,
        THC_MAX: 100,
        CBD_MIN: 0,
        CBD_MAX: 100
    },
    GRID_IDS: {
        INDICA_35G: 'indica-grid-3.5g',
        INDICA_OTHER: 'indica-grid-other',
        SATIVA_35G: 'sativa-grid-3.5g',
        SATIVA_OTHER: 'sativa-grid-other',
        OZ28: 'oz28-grid',
        HYBRIDE_35G: 'hybride-grid-3.5g',
        HYBRIDE_OTHER: 'hybride-grid-other'
    },
    COUNT_IDS: {
        INDICA: 'indica-count',
        SATIVA: 'sativa-count',
        OZ28: 'oz28-count',
        HYBRIDE: 'hybride-count',
        INDICA_35G: 'indica-3.5g-count',
        INDICA_OTHER: 'indica-other-count',
        SATIVA_35G: 'sativa-3.5g-count',
        SATIVA_OTHER: 'sativa-other-count',
        HYBRIDE_35G: 'hybride-3.5g-count',
        HYBRIDE_OTHER: 'hybride-other-count'
    },
    PRINT_LISTS: {
        STORAGE_KEY: 'sqdcPrintLists',
        DEFAULT_LIST_KEY: 'sqdcDefaultPrintListId',
        COLUMNS_KEY: 'sqdcPrintListColumns',
        // Category IDs (now each list has ONE category only)
        CATEGORIES: {
            INDICA_35G: 'indica-3.5g',
            INDICA_OTHER: 'indica-other',
            SATIVA_35G: 'sativa-3.5g',
            SATIVA_OTHER: 'sativa-other',
            HYBRIDE_35G: 'hybride-3.5g',
            HYBRIDE_OTHER: 'hybride-other',
            OZ28: '28g'
        },
        // Display labels for categories
        CATEGORY_LABELS: {
            'indica-3.5g': 'Indica 3,5 g',
            'indica-other': 'Indica - Autres formats',
            'sativa-3.5g': 'Sativa 3,5 g',
            'sativa-other': 'Sativa - Autres formats',
            'hybride-3.5g': 'Hybride 3,5 g',
            'hybride-other': 'Hybride - Autres formats',
            '28g': '28 g'
        },
        DEFAULT_COLUMNS: [
            { id: 'name', label: 'Nom du produit', visible: true, width: '35%', fixed: true },
            { id: 'brand', label: 'Marque', visible: true, width: '20%' },
            { id: 'thc', label: 'THC %', visible: true, width: '15%' },
            { id: 'cbd', label: 'CBD %', visible: false, width: '15%' },
            { id: 'format', label: 'Format', visible: true, width: '15%' },
            { id: 'type', label: 'Type', visible: true, width: '15%' }
        ]
    }
};
