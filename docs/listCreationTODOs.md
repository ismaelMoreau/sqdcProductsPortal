# SQDC Products Portal - Print List Management System - To-Do List

Plan d'implémentation pour le système de gestion de listes d'impression, adapté à l'architecture existante du projet.

## Phase 1: Foundation (MVP)

### 1.1 Project Structure & Configuration

- [ ] **File Setup:** Create new files: `print-lists.html`, `print-lists.js`, and `print-lists.css`.
- [ ] **Navigation Integration:** Add "Listes d'impression" button/link to the main portal header in `index.html` (around line 15-30, near existing navigation).
- [ ] **Config Extension:** Update `config.js` with `CONFIG.PRINT_LISTS` object:
  ```javascript
  PRINT_LISTS: {
    STORAGE_KEY: 'sqdcPrintLists',
    DEFAULT_LIST_KEY: 'sqdcDefaultPrintListId',
    COLUMNS_KEY: 'sqdcPrintListColumns',
    SECTION_IDS: {
      INDICA_35G: 'indica-3.5g',
      INDICA_OTHER: 'indica-other',
      SATIVA_35G: 'sativa-3.5g',
      SATIVA_OTHER: 'sativa-other',
      HYBRIDE_35G: 'hybride-3.5g',
      HYBRIDE_OTHER: 'hybride-other',
      OZ28: '28g'
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
  ```
- [ ] **HTML Structure:** Implement the basic three-panel layout in `print-lists.html`: Lists Sidebar (gauche), List Editor (centre), and Print Preview Placeholder (overlay).
- [ ] **CSS Styling:** Apply initial styling in `print-lists.css` using existing SQDC color scheme (noir #000000, jaune #FFD700) and CSS variables pattern from `style.css`.

### 1.2 List Management (CRUD)

- [ ] **Function: `getAllPrintLists()`:** Fetch all lists from `LocalStorage.getItem(CONFIG.PRINT_LISTS.STORAGE_KEY)`, return parsed array or empty array.
- [ ] **Function: `createPrintList(name, description)`:** Create list object with:
  - `id`: `crypto.randomUUID()` (UUID v4)
  - `name`: String
  - `description`: String
  - `createdAt`: `new Date().toISOString()`
  - `updatedAt`: `new Date().toISOString()`
  - `sections`: Object with keys from `CONFIG.PRINT_LISTS.SECTION_IDS`, each containing empty array `[]`
  - `productOrder`: Object to track manual ordering within sections
  - `columnConfig`: `null` (uses global default until customized)
- [ ] **Function: `updatePrintList(id, data)`:** Save changes to `LocalStorage`, update `updatedAt` timestamp automatically.
- [ ] **Function: `deletePrintList(id)`:** Delete with mandatory `confirm()` dialog: "Supprimer définitivement la liste '{name}' ?"
- [ ] **UI: Lists Sidebar:** Display saved print lists with "Nouvelle liste" button (style: yellow SQDC button).
- [ ] **UI: Actions Menu:** Dropdown menu (⋮) for each list with options: "Renommer", "Dupliquer" (Phase 4), "Supprimer".

### 1.3 Product Management (Basic)

- [ ] **Data Fetching:** Reuse `loadProducts()` logic from `app.js` (lines 20-52) - fetch from `window.PRODUCTS_DATA` or `products.json`, apply all LocalStorage customizations (THC, CBD, type, format changes).
- [ ] **Product Categorization:** Map products to sections using existing logic:
  - Use product `type` field (Indica/Sativa/Hybride) and `format` field (3,5 g vs other)
  - Map to `CONFIG.PRINT_LISTS.SECTION_IDS` keys
  - Handle '28 g' products separately in OZ28 section
- [ ] **Function: `addProductToSection(listId, sectionId, sku)`:** Push SKU to `list.sections[sectionId]` array if not already present, call `updatePrintList()`.
- [ ] **Function: `removeProductFromSection(listId, sectionId, sku)`:** Filter out SKU from `list.sections[sectionId]` array, call `updatePrintList()`.
- [ ] **UI: List Editor:** Display sections as collapsible panels (accordion style), show product cards with name, brand, THC/CBD, format. Use grid layout similar to main portal.
- [ ] **UI: Product Selection:** Modal overlay with:
  - Search/filter input (reuse `filterProducts()` logic from `app.js`)
  - Checkbox selection for each product
  - "Ajouter à la section" button
  - Section selector dropdown

### 1.4 Simple Print Functionality

- [ ] **Function: `generatePrintHTML(listId)`:** Generate print-ready HTML:
  - Fetch current list from LocalStorage
  - For each SKU in list sections, lookup full product details from `allProducts` array (includes all LocalStorage customizations)
  - Build HTML table with columns from `list.columnConfig` or `CONFIG.PRINT_LISTS.DEFAULT_COLUMNS`
  - Include header: List name, "Magasin #77074", timestamp
  - Group products by section with section headers
  - Use only visible columns from column config
- [ ] **Function: `printList(listId)`:**
  - Call `generatePrintHTML(listId)`
  - Inject HTML into hidden print container (`<div id="print-container" class="print-only">`)
  - Call `window.print()`
  - Clear print container after print dialog closes
- [ ] **CSS: `@media print`:** Add to `print-lists.css`:
  - Hide: `.no-print`, sidebars, buttons, navigation, overlays
  - Show: `.print-only` container
  - Page setup: A4, portrait, 10mm margins
  - Black text on white background
  - Border collapse for tables
  - Font: 10pt for content, 12pt for headers

---

## Phase 2: Organization

### 2.1 Product Organization

- [ ] **Function: `reorderProductInSection(listId, sectionId, fromIndex, toIndex)`:**
  - Reorder SKUs in `list.sections[sectionId]` array
  - Use array splice: remove from `fromIndex`, insert at `toIndex`
  - Save via `updatePrintList()`
- [ ] **UI: Drag-and-Drop:** Implement HTML5 Drag API (reference `app.js` drag handlers if present):
  - Add `draggable="true"` to product cards
  - Handle: `dragstart`, `dragover`, `drop`, `dragend` events
  - Visual feedback: reduce opacity on dragged item, show drop indicator line
  - Restrict dragging within same section only
- [ ] **Accessibility:** Add keyboard controls:
  - Up/Down arrow buttons on each product card
  - Move up: `reorderProductInSection(listId, sectionId, currentIndex, currentIndex - 1)`
  - Move down: `reorderProductInSection(listId, sectionId, currentIndex, currentIndex + 1)`
  - Disable buttons at array boundaries
- [ ] **Search/Filter:** Add search input per section:
  - Filter product cards by name/brand in real-time
  - Use `toLowerCase()` and `includes()` for matching
  - Show "Aucun produit trouvé" message when no results

### 2.2 Section Refinement

- [ ] **Product Count:** Display count in section header: `"Indica 3.5g (${list.sections[sectionId].length} produits)"`
- [ ] **Bulk Operations:** Add "Ajouter tous les produits Indica 3.5g" button:
  - Filter `allProducts` by section criteria
  - Add all matching SKUs to section
  - Confirm with user: "Ajouter ${count} produits ?"
- [ ] **Clear Section:** Add "Vider la section" button:
  - Confirm: "Supprimer tous les produits de cette section ?"
  - Set `list.sections[sectionId] = []`
  - Save via `updatePrintList()`

---

## Phase 3: Customization

### 3.1 Column Configuration System

- [ ] **Function: `getColumnConfig(listId)`:**
  - Fetch list from LocalStorage
  - Return `list.columnConfig` if exists
  - Else return `CONFIG.PRINT_LISTS.DEFAULT_COLUMNS` (deep copy)
- [ ] **Function: `updateColumnConfig(listId, columns)`:**
  - Validate: ensure 'name' column is present and visible
  - Set `list.columnConfig = columns` (array of column objects)
  - Call `updatePrintList()`
- [ ] **Function: `resetToDefaultColumns(listId)`:**
  - Set `list.columnConfig = null`
  - Call `updatePrintList()`
  - Refresh UI to show default columns
- [ ] **UI: Column Configuration Modal:** Create modal overlay with "Configurer les colonnes" title:
  - List all columns from current config
  - Each row shows: drag handle (⋮⋮), checkbox (visible/hidden), label, width input
  - Buttons: "Réinitialiser", "Annuler", "Enregistrer"
  - **Drag & Drop:** Use HTML5 Drag API to reorder column rows, update column order array on drop
  - **Checkbox:** Toggle `column.visible` boolean
  - **Width Input:** Number input with unit selector (% or px), update `column.width`
  - **Lock 'name' column:** Disable visibility checkbox and removal for 'name' column (always visible, `fixed: true`)
- [ ] **UI: Live Preview:** Add mini table (3 sample rows) at bottom of modal:
  - Shows only visible columns in configured order
  - Updates in real-time as user changes config
  - Sample data: use first 3 products from current list or placeholder data

### 3.2 Dynamic Print Output

- [ ] **Print Function Update:** Modify `generatePrintHTML(listId)`:
  - Get effective column config via `getColumnConfig(listId)`
  - Filter to only visible columns: `columns.filter(col => col.visible)`
  - Build table headers from `column.label` in configured order
  - Build table cells from product data matching `column.id` in same order
  - Apply column widths via inline styles or `<colgroup>`
- [ ] **Product Name Column:** Enforce in `updateColumnConfig()`:
  - Check if 'name' column exists in submitted config
  - Ensure `column.visible === true` and `column.fixed === true`
  - Reject config updates that remove or hide 'name' column

---

## Phase 4: Polish

### 4.1 List Management Polish

- [ ] **Function: `setDefaultList(id)`:**
  - Save `id` to `localStorage.setItem(CONFIG.PRINT_LISTS.DEFAULT_LIST_KEY, id)`
  - Update UI to show star/indicator on default list
- [ ] **Default List Loading:**
  - On page load (`DOMContentLoaded`), check for default list ID
  - If exists and valid, load that list into editor
  - If not, show empty state: "Créez votre première liste ou sélectionnez-en une"
- [ ] **List Duplication:**
  - Create new list object with `crypto.randomUUID()`
  - Copy all properties from source list: `name: "Copie de {original name}"`, `description`, `sections`, `productOrder`, `columnConfig`
  - Reset timestamps to current date/time
  - Save and open duplicated list
- [ ] **Confirmation Dialogs:** Replace `confirm()` with custom modal:
  - Styled overlay with SQDC branding
  - Clear message with list name
  - Buttons: "Annuler" (secondary), "Supprimer" (danger red/yellow)
  - Close on outside click or ESC key

### 4.2 Print Optimization & UX

- [ ] **Print Layout:** Enhance `@media print` CSS:
  - `page-break-inside: avoid` on product rows
  - `page-break-after: avoid` on section headers
  - `page-break-before: auto` on new sections (except first)
  - Orphan/widow control: `orphans: 3; widows: 3;`
- [ ] **Print Header:** Add to generated HTML:
  - Row 1: List name (bold, 16pt)
  - Row 2: "Magasin SQDC #77074" | Date/time: `new Date().toLocaleString('fr-CA')`
  - Horizontal rule separator
- [ ] **Print Footer:** Add using CSS counter or JavaScript:
  - Left: "Généré le {date}"
  - Right: "Page {current} sur {total}" (Note: CSS counters can show page number, total requires JavaScript)
  - Alternative: Use `@page` CSS with `@bottom-left` and `@bottom-right` pseudo-elements (limited browser support)
- [ ] **Print Preview:** Create preview overlay:
  - Full-screen modal with iframe containing print HTML
  - Buttons: "Fermer", "Imprimer"
  - Matches actual print styling
  - Opens before `window.print()` call

---

## Phase 5: Future Enhancements (Post-MVP)

- [ ] **Export: CSV:** Implement CSV export:
  - Generate CSV string from list data with visible columns
  - Use `Blob` and `URL.createObjectURL()` for download
  - Filename: `"liste-${listName}-${timestamp}.csv"`
  - Encoding: UTF-8 with BOM for Excel compatibility
- [ ] **Export: Excel (.xlsx):** Implement Excel export:
  - Option 1: Use SheetJS (xlsx.js) library via CDN
  - Option 2: Generate XML-based .xlsx manually (complex)
  - Include: formatting, column widths, section grouping
  - Filename: `"liste-${listName}-${timestamp}.xlsx"`
- [ ] **Custom Notes:** Add notes feature:
  - Add `notes` object to list structure: `{ [sku]: "note text" }`
  - Add "Notes" column to `DEFAULT_COLUMNS` (hidden by default)
  - UI: Add note icon/button on product cards in editor
  - Modal: Text area for note entry/editing
  - Print: Include notes column if visible in config
- [ ] **List Sharing - Export:** Add "Exporter la liste" button:
  - Serialize list object to JSON string
  - Create downloadable .json file
  - Filename: `"sqdc-liste-${listName}.json"`
  - Include metadata: version, export date, store number
- [ ] **List Sharing - Import:** Add "Importer une liste" button:
  - File input accepting .json files
  - Parse and validate JSON structure
  - Check for required fields: `name`, `sections`, etc.
  - Generate new UUID (don't import original ID)
  - Confirm: "Importer la liste '{name}' ?"
  - Add imported list to collection

---

## Notes d'implémentation

**Priorités:**
1. Phase 1 = MVP fonctionnel (création, édition, impression simple)
2. Phase 2 = Amélioration UX (organisation, réorganisation)
3. Phase 3 = Personnalisation (colonnes configurables)
4. Phase 4 = Polish (UX raffinée, impression optimisée)
5. Phase 5 = Fonctionnalités bonus (export, notes, partage)

**Dépendances techniques:**
- Aucune librairie externe requise pour Phases 1-4 (vanilla JS)
- Phase 5 Excel export nécessite SheetJS ou autre librairie

**Compatibilité:**
- LocalStorage API (tous navigateurs modernes)
- HTML5 Drag & Drop API (Chrome 90+, Firefox 88+, Safari 14+)
- `crypto.randomUUID()` (Chrome 92+, Firefox 95+, Safari 15.4+)
- Print CSS media queries (tous navigateurs modernes)

**Intégration avec codebase existante:**
- Réutiliser: `loadProducts()`, `filterProducts()`, patterns de drag-and-drop
- Respecter: Structure LocalStorage, schéma de données produits, style SQDC
- Ajouter navigation dans `index.html` sans modifier structure existante