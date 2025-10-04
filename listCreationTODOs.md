# SQDC Products Portal - Print List Management System - To-Do List (sqdcListTodos.md)

This list follows the phases defined in the PRD, with tasks broken down for clarity and incorporating the requirement for dynamic data fetching on print.

## Phase 1: Foundation (MVP)

### 1.1 Project Structure & Configuration

- [ ] **File Setup:** Create new files: `print-lists.html`, `print-lists.js`, and `print-lists.css`.
- [ ] **Navigation Integration:** Add "Print Lists" button/link to the main portal header (`index.html`).
- [ ] **Config Extension:** Update `config.js` with `CONFIG.PRINT_LISTS` object, including `STORAGE_KEY`, `COLUMNS_KEY`, `DEFAULT_COLUMNS`, and `SECTION_IDS`.
- [ ] **HTML Structure:** Implement the basic three-panel layout in `print-lists.html`: Lists Sidebar, List Editor, and Print Preview Placeholder.
- [ ] **CSS Styling:** Apply initial styling for the new page layout in `print-lists.css`.

### 1.2 List Management (CRUD)

- [ ] **Function: `getAllPrintLists()`:** Implement fetching all lists from `LocalStorage` key `sqdcPrintLists`.
- [ ] **Function: `createPrintList(name, description)`:** Implement creation with a new UUID, timestamps, and default empty `sections` and `productOrder`.
- [ ] **Function: `updatePrintList(id, data)`:** Implement saving changes back to `LocalStorage`, updating `updatedAt`.
- [ ] **Function: `deletePrintList(id)`:** Implement list deletion with mandatory confirmation dialog.
- [ ] **UI: Lists Sidebar:** Implement the UI to display the list of saved print lists, including a **`+ New List`** button.
- [ ] **UI: Actions Menu:** Implement the basic dropdown/menu for **Rename**, **Duplicate** (Phase 4), and **Delete**.

### 1.3 Product Management (Basic)

- [ ] **Data Fetching:** Implement logic in `print-lists.js` to fetch all available products from `products.json` or `products-data.js` and categorize them by the defined `SECTION_IDS`.
- [ ] **Function: `addProductToSection(listId, sectionId, sku)`:** Implement adding a product SKU to a list's section array.
- [ ] **Function: `removeProductFromSection(listId, sectionId, sku)`:** Implement removing a product SKU from a list's section array.
- [ ] **UI: List Editor:** Implement the initial Section View, allowing users to see and manage products within the pre-defined sections.
- [ ] **UI: Product Selection:** Implement the checkbox/modal interface to select and **add** products to a section.

### 1.4 Simple Print Functionality

- [ ] **Function: `generatePrintHTML(listId)`:** Implement logic to generate the print-friendly HTML. **Crucially, this function MUST fetch the latest product details (Name, Brand, THC%, etc.) from the main product data source using the stored SKUs.**
- [ ] **Function: `printList(listId)`:** Implement the call to `window.print()` after dynamically injecting the generated HTML into the Print Preview area.
- [ ] **CSS: `@media print`:** Add basic print-only CSS to `print-lists.css` to hide all UI elements (buttons, sidebars) and optimize for black and white printing.

---

## Phase 2: Organization

### 2.1 Product Organization

- [ ] **Function: `reorderProductInSection(listId, sectionId, fromIndex, toIndex)`:** Implement updating the `productOrder` map within the list's storage object.
- [ ] **UI: Drag-and-Drop:** Implement the **HTML5 Drag API** for reordering products **within** a section, with visual feedback (opacity, placeholder line).
- [ ] **Accessibility:** Implement **Up/Down arrow buttons** as an alternative to drag-and-drop for product reordering.
- [ ] **Search/Filter:** Implement the search/filter input within each section in the List Editor to quickly find products.

### 2.2 Section Refinement

- [ ] **Product Count:** Display the product count next to the section header in the List Editor (e.g., "Indica 3.5g (12 products)").
- [ ] **Bulk Operations:** Implement "Bulk add all products from section" functionality.
- [ ] **Clear Section:** Implement "Clear entire section" button/functionality.

---

## Phase 3: Customization

### 3.1 Column Configuration System

- [ ] **Function: `getColumnConfig(listId)`:** Implement logic to fetch per-list configuration, falling back to global default if none exists.
- [ ] **Function: `updateColumnConfig(listId, columns)`:** Implement saving the custom column configuration to the list's object.
- [ ] **Function: `resetToDefaultColumns(listId)`:** Implement setting a list's column configuration back to the global default (by removing the custom config).
- [ ] **UI: Column Configuration Modal:** Create the modal overlay for column management (per Section 4.2).
    - [ ] **Drag & Drop:** Implement column reordering.
    - [ ] **Checkbox:** Implement show/hide visibility toggles.
    - [ ] **Input:** Implement a field for column width adjustment (percentage or pixels).
    - [ ] **Option:** Implement the "Save column configuration per list OR globally" logic.
- [ ] **UI: Live Preview:** Implement a small, live-updating table preview within the Column Configuration Modal.

### 3.2 Dynamic Print Output

- [ ] **Print Function Update:** Update `generatePrintHTML(listId)` to dynamically construct the print table (headers and content) based *only* on the fields and order specified in the current list's `columnConfig`.
- [ ] **Product Name:** Ensure "Product Name" column is always visible and non-removable.

---

## Phase 4: Polish

### 4.1 List Management Polish

- [ ] **Function: `setDefaultList(id)`:** Implement setting a list ID to a specific `LocalStorage` key (e.g., `sqdcDefaultPrintListId`).
- [ ] **Default List Loading:** Implement logic to load the default list on page open.
- [ ] **List Duplication:** Implement the **`Duplicate list`** operation (creates a new UUID and copies all data).
- [ ] **Confirmation Dialogs:** Implement a robust confirmation modal for the **Delete** operation.

### 4.2 Print Optimization & UX

- [ ] **Print Layout:** Refine `@media print` CSS for **page break control** (`page-break-after`, `page-break-inside: avoid`).
- [ ] **Print Header:** Ensure the page header in the print view includes the **List Name**, **Store #77074**, and the **current Timestamp**.
- [ ] **Print Footer:** Add logic for dynamic **Page Numbers** and the **Generation Date** to the footer of multi-page lists.
- [ ] **Print Preview:** Implement the **Full-page overlay** for a final, non-interactive print preview before triggering the browser dialog.

---

## Phase 5: Future Enhancements (Post-MVP)

- [ ] **Export: CSV/JSON:** Implement functionality to export the product list data to a CSV file.
- [ ] **Export: Excel (.xlsx):** Research and implement a suitable library for generating native Excel files (requires a client-side or server-side library).
- [ ] **Custom Notes:** Add the ability to save a `customNote` field per product SKU within the list's data structure and display it as an optional column.
- [ ] **List Sharing:** Implement an **Export List** button that generates and downloads the list's JSON data.
- [ ] **List Sharing:** Implement an **Import List** function that reads a JSON file and creates a new print list.