# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**SQDC Products Portal** is a vanilla JavaScript web application for managing and displaying cannabis products for SQDC store #77074. It provides filtering, sorting, and search capabilities with persistent local storage for product customizations.

**Tech Stack:**
- Language: Vanilla JavaScript (ES6+)
- Styling: CSS3 with CSS Variables
- Data: JSON/embedded JavaScript data
- Storage: LocalStorage API
- No build tools or frameworks required

## Project Structure

```
/home/sma/sqdcProductsPortal/
├── index.html           # Main HTML structure and UI layout
├── app.js              # Core application logic (700+ lines)
├── config.js           # Configuration constants and enums
├── style.css           # Complete styling with CSS variables
├── products.json       # Product data (JSON format)
├── products-data.js    # Fallback embedded product data
├── oldPortal.html      # Legacy version (reference only)
└── CLAUDE.md           # This file
```

## Architecture

**State Management:**
- Global state variables in `app.js`
- LocalStorage for persistence (THC changes, type changes, format changes)
- Reactive filtering and rendering pipeline

**Core Functionality:**
1. **Product Loading**: Fetches from `products.json` with fallback to `products-data.js`
2. **Filtering**: By cannabis type (Indica, Sativa, Hybride) and search query
3. **Sorting**: By name, brand, THC (ascending/descending)
4. **Customization**: Manual THC values, type changes, format changes
5. **Grouping**: Products grouped by type and format (3.5g vs other sizes)

**Key Constants** (defined in `config.js`):
- `CONFIG.FORMATS`: Product sizes (3.5g, 7g, 28g)
- `CONFIG.TYPES`: Cannabis types (Indica, Sativa, Hybride, 28g, all)
- `CONFIG.STORAGE_KEYS`: LocalStorage key names
- `CONFIG.GRID_IDS`: DOM element IDs for product grids

## Code Style & Conventions

**JavaScript:**
- Use ES6+ features (arrow functions, destructuring, template literals)
- Prefer `const` over `let`, avoid `var`
- Function names are descriptive and camelCase
- Use `async/await` for asynchronous operations
- Keep functions focused and modular

**CSS:**
- Use CSS custom properties (variables) defined in `:root`
- Follow BEM-like naming for complex components
- Mobile-first responsive design principles
- Color scheme: SQDC black (#000000) with yellow (#FFD700) accents

**DOM Manipulation:**
- Use `querySelector`/`querySelectorAll` over `getElementById`
- Create HTML via template literals for readability
- Event delegation for dynamically created elements

**Data Flow:**
```
Load Products → Apply Filters → Sort → Group by Type/Format → Render → Update Counts
```

## Development Workflow

**Opening the Application:**
```bash
# Option 1: Open directly in browser (file protocol)
open index.html

# Option 2: Use a local server (recommended)
python -m http.server 8000
# or
npx serve .
```

**Testing Changes:**
1. Make changes to HTML/CSS/JS files
2. Refresh browser to see updates
3. Check browser console for errors (F12)
4. Test filtering, sorting, and search functionality
5. Verify LocalStorage persistence (Application tab in DevTools)

**Common Tasks:**
- Add new product: Modify `products.json` or `products-data.js`
- Change styling: Edit CSS variables in `style.css`
- Add new filter: Update filter logic in `app.js` and add UI in `index.html`
- Modify constants: Update `config.js`

## Important Notes

**Do Not:**
- Do not modify `oldPortal.html` (legacy reference only)
- Do not remove LocalStorage integration without user approval
- Do not change color scheme without consulting SQDC brand guidelines
- Do not add external dependencies without discussion (keep it vanilla)
- Do not create new files unless absolutely necessary

**Always:**
- Maintain French language in UI elements
- Preserve existing filter/sort functionality
- Keep mobile responsiveness intact
- Test with both JSON and embedded data sources
- Validate THC values against `CONFIG.VALIDATION` constraints

## Data Structure

**Product Object Schema:**
```javascript
{
  sku: String,           // Unique identifier
  name: String,          // Product name
  brand: String,         // Brand name
  type: String,          // "Indica" | "Sativa" | "Hybride"
  format: String,        // "3,5 g" | "7 g" | "28 g"
  thcMin: Number,        // Minimum THC percentage
  thcMax: Number,        // Maximum THC percentage
  manualThc: Number?,    // Optional user override
  manualFormat: String?  // Optional format override
}
```

## LocalStorage Keys

- `sqdcThcChanges`: Manual THC value overrides (JSON object)
- `sqdcProductTypeChanges`: Product type changes (JSON object)
- `sqdcFormatChanges`: Product format changes (JSON object)

## Browser Compatibility

Target: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
Required APIs: Fetch API, LocalStorage, CSS Grid, CSS Custom Properties
