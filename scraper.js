/**
 * SQDC Product Data Scraper - Two-Step Manual Version
 *
 * Instructions:
 * STEP 1 - Scrape Flowers:
 * 1. Log into https://swint1.sqdc.ca/SQDCEditerProduits?succ=77074&aff=IndOSatOHybOMelNFleOPrRN
 * 2. Check ONLY "Fleurs Séchées" (uncheck Pré-Roulés)
 * 3. Open browser DevTools (F12) → Console tab
 * 4. Paste this script and press Enter
 * 5. You'll see: "✅ Step 1 complete - Flowers saved"
 *
 * STEP 2 - Scrape Pre-Rolls:
 * 6. Uncheck "Fleurs Séchées" and check "Pré-Roulés"
 * 7. Paste this script AGAIN and press Enter
 * 8. Both files will auto-download with combined data!
 *
 * The script stores Step 1 data in sessionStorage and merges it with Step 2.
 */

(function() {
    'use strict';

    console.log('🚀 SQDC Product Scraper starting...');

    // Type icon mapping
    const TYPE_MAP = {
        'F01.svg': 'Indica',
        'F02.svg': 'Sativa',
        'F03.svg': 'Hybride',
        'F04.svg': 'Mélange'
    };

    // Helper function to detect product category based on format
    function detectProductCategory(format) {
        // Pre-rolls have format like "X unité(s) de Y g"
        // Examples: "1 unité de 1 g", "5 unités de 0,5 g", "10 unités de 0,35 g"
        const prerollPattern = /\d+\s*unités?\s*de\s*[\d,]+\s*g/i;

        return prerollPattern.test(format) ? 'preroll' : 'flower';
    }


    // Extract products from the page
    function scrapeProducts() {
        const rows = document.querySelectorAll('tr.EditRowStyle');
        const products = [];
        let errorCount = 0;
        let prerollCount = 0;
        let flowerCount = 0;

        console.log(`📊 Found ${rows.length} product rows`);

        rows.forEach((row, index) => {
            try {
                const cells = row.querySelectorAll('td');

                if (cells.length < 7) {
                    console.warn(`⚠️ Row ${index + 1}: Not enough cells (${cells.length})`);
                    errorCount++;
                    return;
                }

                // Extract type from icon
                const typeIcon = cells[0].querySelector('img');
                const typeSrc = typeIcon ? typeIcon.getAttribute('src') : '';
                const typeKey = typeSrc.split('/').pop(); // Get "F01.svg" from "/images/F01.svg"
                const type = TYPE_MAP[typeKey] || 'Unknown';
                const typeIconCode = typeKey.replace('.svg', '').toUpperCase();

                // Extract store and SKU
                const store = cells[1].textContent.trim();
                const sku = cells[2].textContent.trim();

                // Parse description: "Product Name - Brand (format)"
                const description = cells[3].textContent.trim();
                const descMatch = description.match(/^(.+?)\s+-\s+(.+?)\s+\((.+?)\)$/);

                let name, brand, format;
                if (descMatch) {
                    name = descMatch[1].trim();
                    brand = descMatch[2].trim().replace(/<\/?i>/g, ''); // Remove <i> tags if present
                    format = descMatch[3].trim();
                } else {
                    console.warn(`⚠️ Row ${index + 1}: Could not parse description: "${description}"`);
                    name = description;
                    brand = 'Unknown';
                    format = 'Unknown';
                    errorCount++;
                }

                // Extract THC values
                const thcMin = parseInt(cells[4].textContent.trim()) || 0;
                const thcMax = parseInt(cells[5].textContent.trim()) || 0;

                // Extract manual THC and CBD values from input fields
                const manualInputs = cells[6].querySelectorAll('input');
                let manualThc = '';
                let manualCbd = '';

                manualInputs.forEach(input => {
                    const inputId = input.getAttribute('id') || '';
                    if (inputId.includes('vtTauxTHC')) {
                        manualThc = input.value.trim();
                    } else if (inputId.includes('vtTauxCBD')) {
                        manualCbd = input.value.trim();
                    }
                });

                // Detect product category (flower or preroll) based on format
                const formatCategory = detectProductCategory(format);

                // Track category counts
                if (formatCategory === 'preroll') {
                    prerollCount++;
                } else {
                    flowerCount++;
                }

                // Create product object matching the schema
                const product = {
                    type: type,
                    typeIcon: typeIconCode,
                    store: store,
                    sku: sku,
                    name: name,
                    brand: brand,
                    format: format,
                    formatCategory: formatCategory,
                    thcMin: thcMin,
                    thcMax: thcMax,
                    manualThc: manualThc,
                    manualCbd: manualCbd
                };

                products.push(product);

            } catch (error) {
                console.error(`❌ Error processing row ${index + 1}:`, error);
                errorCount++;
            }
        });

        console.log(`✅ Successfully scraped ${products.length} products`);
        console.log(`🌸 Flower products: ${flowerCount}`);
        console.log(`🚬 Pre-rolled products: ${prerollCount}`);
        if (errorCount > 0) {
            console.warn(`⚠️ ${errorCount} errors or warnings encountered`);
        }

        return products;
    }

    // Copy to clipboard
    function copyToClipboard(text) {
        return navigator.clipboard.writeText(text)
            .then(() => {
                console.log('📋 Data copied to clipboard!');
                return true;
            })
            .catch(err => {
                console.error('❌ Failed to copy to clipboard:', err);
                return false;
            });
    }

    // Download as JSON file
    function downloadJSON(data, filename = 'products.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`💾 Downloaded as ${filename}`);
    }

    // Download as products-data.js file (JavaScript format)
    function downloadProductsDataJS(data, filename = 'products-data.js') {
        const jsContent = `// SQDC Products Data - Generated ${new Date().toISOString()}
// This is a fallback data source when products.json cannot be fetched

window.PRODUCTS_DATA = ${JSON.stringify(data, null, 2)};
`;
        const blob = new Blob([jsContent], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`💾 Downloaded as ${filename}`);
    }

    // Main execution - two-step scrape with sessionStorage
    function runScraper() {
        const STORAGE_KEY = 'sqdc_scraper_step1';

        // Check if we have Step 1 data
        const step1Data = sessionStorage.getItem(STORAGE_KEY);

        if (!step1Data) {
            // STEP 1: Scrape flowers
            console.log('📍 STEP 1: Scraping visible products...');
            const products = scrapeProducts();

            if (products.length === 0) {
                console.error('❌ No products found! Make sure you are on the correct page.');
                return;
            }

            // Save to sessionStorage
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(products));

            console.log(`✅ Step 1 complete - ${products.length} products saved`);
            console.log('\n📝 Next steps:');
            console.log('1. Uncheck "Fleurs Séchées"');
            console.log('2. Check "Pré-Roulés"');
            console.log('3. Paste this script again');
            console.log('\n💡 To restart from Step 1, run: sessionStorage.clear()');

            return;
        }

        // STEP 2: Scrape pre-rolls and merge
        console.log('📍 STEP 2: Scraping visible products...');
        const step2Products = scrapeProducts();

        if (step2Products.length === 0) {
            console.error('❌ No products found! Make sure "Pré-Roulés" is checked.');
            return;
        }

        // Merge with Step 1 data
        const step1Products = JSON.parse(step1Data);
        const allProducts = [...step1Products, ...step2Products];

        console.log(`\n🎉 Merging complete!`);
        console.log(`   Step 1 (flowers): ${step1Products.length} products`);
        console.log(`   Step 2 (pre-rolls): ${step2Products.length} products`);
        console.log(`   Total: ${allProducts.length} products`);

        // Clear storage
        sessionStorage.removeItem(STORAGE_KEY);

        // Display summary
        console.log('\n📈 Summary by Type:');
        const summary = allProducts.reduce((acc, p) => {
            acc[p.type] = (acc[p.type] || 0) + 1;
            return acc;
        }, {});
        console.table(summary);

        // Display category breakdown
        console.log('\n📦 Summary by Category:');
        const categorySummary = allProducts.reduce((acc, p) => {
            acc[p.formatCategory] = (acc[p.formatCategory] || 0) + 1;
            return acc;
        }, {});
        console.table(categorySummary);

        // Display first few products as preview
        console.log('\n🔍 Preview (first 3 products):');
        console.table(allProducts.slice(0, 3));

        // Format as JSON
        const jsonOutput = JSON.stringify(allProducts, null, 2);

        // Copy to clipboard
        copyToClipboard(jsonOutput);

        // Automatically download both files
        console.log('\n💾 Auto-downloading files...');
        downloadJSON(allProducts);
        setTimeout(() => {
            downloadProductsDataJS(allProducts);
            console.log('\n✅ Both files downloaded successfully!');
        }, 500);

        // Make download functions globally available (in case user wants to re-download)
        window.downloadProducts = function() {
            downloadJSON(allProducts);
        };

        window.downloadProductsJS = function() {
            downloadProductsDataJS(allProducts);
        };

        window.downloadBoth = function() {
            downloadJSON(allProducts);
            setTimeout(() => downloadProductsDataJS(allProducts), 500);
        };

        // Store products in window for manual inspection
        window.scrapedProducts = allProducts;
        console.log('\n💡 Products stored in window.scrapedProducts for inspection');
        console.log('💡 To re-download, use: downloadBoth()');

        console.log('\n✨ Scraping complete! Files downloaded and data copied to clipboard.');
    }

    // Start the scraper
    runScraper();

})();
