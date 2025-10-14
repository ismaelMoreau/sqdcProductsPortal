# Gestionnaire de Sections - Plan d'implémentation

Fonctionnalité pour configurer dynamiquement les sections d'affichage des produits.

> **Note**: Chaque succursale utilise sa propre version locale de l'application, donc pas besoin de gestion du numéro de succursale.

> **Statut** : Phases 1-5 COMPLÈTES ✅ | Phase 6-7 À FAIRE ⏳

---

## 📋 Phase 1: Configuration et Modèle de Données

### ✅ Tâches `config.js`

- [x] **1.1** Ajouter `SECTION_CONFIG` dans `config.js` avec:
  - [ ] Clé `SECTIONS_KEY` pour localStorage
  - [ ] Objet `AVAILABLE_FORMATS` (3.5g, 28g, préroulé, hashish, mangeable, infusé, huile)
  - [ ] Objet `STRAIN_TYPES` (Indica, Sativa, Hybride, Tous)
  - [ ] Objet `STORAGE_TYPES` (porte, tiroir)
  - [ ] Objet `WALL_POSITIONS` (front, side)
  - [ ] Tableau `DEFAULT_SECTIONS` avec les 4 sections par défaut (Indica, Sativa, 28g, Hybride)

**Exemple de structure à ajouter:**

```javascript
SECTION_CONFIG: {
    // Section configuration storage
    SECTIONS_KEY: 'sqdcSectionsConfig',
    
    // Available formats for sections
    AVAILABLE_FORMATS: {
        '3.5g': '3,5 g',
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
        ALL: 'Tous' // Pour sections qui acceptent tous les types
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
            id: 'indica',
            name: 'Indica 3,5g • 28g',  // Auto-generated from selections
            formats: ['3.5g', '28g'],
            strainTypes: ['Indica'],
            storage: {
                doors: { enabled: true, count: 12 },
                drawers: { enabled: true, count: 12 }
            },
            wallPosition: 'front',
            order: 1,
            visible: true
        },
        {
            id: 'sativa',
            name: 'Sativa 3,5g • 28g',  // Auto-generated from selections
            formats: ['3.5g', '28g'],
            strainTypes: ['Sativa'],
            storage: {
                doors: { enabled: true, count: 12 },
                drawers: { enabled: true, count: 12 }
            },
            wallPosition: 'front',
            order: 2,
            visible: true
        },
        {
            id: '28g',
            name: 'Tous types 28g',  // Auto-generated: all strain types + format
            formats: ['28g'],
            strainTypes: ['Indica', 'Sativa', 'Hybride'],
            storage: {
                doors: { enabled: true, count: 12 },
                drawers: { enabled: false, count: 0 }
            },
            wallPosition: 'front',
            order: 3,
            visible: true
        },
        {
            id: 'hybride',
            name: 'Hybride 3,5g • 28g',  // Auto-generated from selections
            formats: ['3.5g', '28g'],
            strainTypes: ['Hybride'],
            storage: {
                doors: { enabled: true, count: 12 },
                drawers: { enabled: true, count: 12 }
            },
            wallPosition: 'front',
            order: 4,
            visible: true
        }
    ]
}
```

---

## 📋 Phase 2: Refactorisation Backend (app.js)

### ✅ Tâches variables globales

- [ ] **2.1** Ajouter variable globale dans `app.js`:
  - [ ] `let sectionsConfig = [];`

### ✅ Tâches fonctions utilitaires (localStorage)

- [ ] **2.2** Créer `loadSectionsConfig()` - charge config depuis localStorage
- [ ] **2.3** Créer `saveSectionsConfig()` - sauvegarde config dans localStorage

### ✅ Tâches fonctions CRUD sections

- [ ] **2.4** Créer `getSectionById(sectionId)` - trouve une section par ID
- [ ] **2.5** Créer `addSection(sectionData)` - ajoute nouvelle section
- [ ] **2.6** Créer `removeSection(sectionId)` - supprime une section
- [ ] **2.7** Créer `updateSection(sectionId, updates)` - met à jour une section
- [ ] **2.8** Créer `generateSectionId()` - génère ID unique pour nouvelle section
- [ ] **2.9** Créer `generateSectionName(formats, strainTypes)` - génère nom automatique
  - [ ] Format: "Type(s) Format(s)"
  - [ ] Exemples: "Sativa 3,5g • 28g", "Tous types Hashish", "Indica • Hybride Préroulé"

### ✅ Tâches génération HTML dynamique

- [ ] **2.10** Créer `generateSectionHTML(sectionConfig)` - génère HTML pour une section
- [ ] **2.11** Créer `regenerateSectionsHTML()` - régénère toutes les sections dans `<main>`
- [ ] **2.12** Refactoriser `getSectionElements()` pour fonctionner avec sections dynamiques
- [ ] **2.13** Refactoriser `renderProducts()` pour itérer sur `sectionsConfig`

### ✅ Tâches navigation murs

- [ ] **2.14** Créer `getSectionsByWall(wallPosition)` - filtre sections par mur
- [ ] **2.15** Créer `switchWallView(wallPosition)` - change vue mur actif
- [ ] **2.16** Créer `renderWallNavigation()` - génère UI navigation murs
- [ ] **2.17** Ajouter variable globale `let currentWall = 'front';`

---

## 📋 Phase 3: Interface Utilisateur HTML

### ✅ Tâches bouton configuration (`index.html`)

- [ ] **3.1** Modifier `<div class="store-info">` dans header:
  - [ ] Remplacer `<span class="store-label">` par `<button class="section-config-btn">`
  - [ ] Ajouter icône config `<span class="config-icon">⚙️</span>`
  - [ ] Texte du bouton: "⚙️ Configurer les sections"

```html
<div class="store-info">
    <a href="print-lists.html" class="print-lists-link" title="Gérer les listes d'impression">
        🖨️ Listes d'impression
    </a>
    <button class="section-config-btn" id="sectionConfigBtn" title="Configurer les sections">
        <span class="config-icon">⚙️</span> Configurer les sections
    </button>
</div>
```

### ✅ Tâches navigation murs (`index.html`)

- [ ] **3.2** Ajouter après `<div class="controls">`:
  - [ ] Créer `<div class="wall-navigation" id="wallNavigation">`
  - [ ] Ajouter bouton "🏠 Mur avant" avec `data-wall="front"`
  - [ ] Ajouter bouton "🔲 Mur latéral" avec `data-wall="side"`

### ✅ Tâches modale gestionnaire (`index.html`)

- [ ] **3.3** Ajouter avant `</body>`:
  - [ ] Créer `<div id="sectionManagerModal" class="modal-overlay">`
  - [ ] Ajouter header avec titre "Gestionnaire de Sections"
  - [ ] Ajouter onglets murs (front/side) avec classe `.wall-tab`
  - [ ] Ajouter section liste sections avec `#sectionsList`
  - [ ] Ajouter bouton "+ Ajouter une section" (`#addSectionBtn`)
  - [ ] Ajouter footer avec boutons Annuler et Sauvegarder

### ✅ Tâches modale éditeur section (`index.html`)

- [ ] **3.4** Ajouter modale éditeur de section:
  - [ ] Créer `<div id="sectionEditorModal" class="modal-overlay">`
  - [ ] Ajouter affichage nom auto-généré (readonly) avec `#sectionNameDisplay`
  - [ ] Ajouter texte aide: "Le nom est généré automatiquement selon les sélections"
  - [ ] Ajouter groupe checkboxes formats (`#formatCheckboxes`) - **multiples sélections**
  - [ ] Ajouter groupe checkboxes types souches (`#strainTypeCheckboxes`) - **multiples sélections**
  - [ ] Ajouter config stockage:
    - [ ] Checkbox + input nombre portes (`#enableDoors`, `#doorsCount`)
    - [ ] Checkbox + input nombre tiroirs (`#enableDrawers`, `#drawersCount`)
  - [ ] Ajouter radio buttons position mur (front/side)
  - [ ] Ajouter footer avec boutons Annuler, Supprimer, Sauvegarder

---

## 📋 Phase 4: Styles CSS

### ✅ Tâches styles bouton configuration (`style.css`)

- [ ] **4.1** Créer `.section-config-btn`:
  - [ ] Style bouton avec bordure jaune
  - [ ] Hover effect avec transformation
  - [ ] Animation rotation icône config au hover

```css
.store-manager-btn {
    background-color: var(--sqdc-gray);
    border: 2px solid var(--sqdc-yellow);
    border-radius: 4px;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
}

.store-manager-btn:hover {
    background-color: var(--sqdc-light-gray);
    border-color: var(--sqdc-light-yellow);
    transform: translateY(-1px);
}

.config-icon {
    font-size: 1rem;
    transition: transform 0.3s ease;
}

.store-manager-btn:hover .config-icon {
    transform: rotate(90deg);
}
```

### 2.2 Créer la fenêtre modale du gestionnaire

**Fichier**: `index.html`

Ajouter avant la fermeture de `</body>`:

```html
<!-- Store Manager Modal -->
<div class="modal-overlay" id="storeManagerModal" role="dialog" aria-modal="true" aria-labelledby="storeManagerTitle">
    <div class="modal-content store-manager-modal">
        <div class="modal-header">
            <h3 id="storeManagerTitle">Gestionnaire de Succursale</h3>
            <button class="modal-close" id="storeManagerCloseBtn" aria-label="Fermer">&times;</button>
        </div>
        
        <div class="modal-body">
            <!-- Store ID Section -->
            <div class="manager-section">
                <h4>Numéro de succursale</h4>
                <div class="form-group">
                    <input type="text" id="storeIdInput" placeholder="Ex: 77074" maxlength="10">
                </div>
            </div>

            <!-- Wall Navigation Tabs -->
            <div class="manager-section">
                <h4>Organisation par mur</h4>
                <div class="wall-tabs">
                    <button class="wall-tab active" data-wall="front">Mur avant</button>
                    <button class="wall-tab" data-wall="side">Mur latéral</button>
                </div>
            </div>

            <!-- Sections List -->
            <div class="manager-section">
                <div class="section-header-bar">
                    <h4>Sections</h4>
                    <button class="btn-add-section" id="addSectionBtn">
                        <span>+</span> Ajouter une section
                    </button>
                </div>
                
                <div class="sections-list" id="sectionsList">
                    <!-- Dynamic section items will be inserted here -->
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button class="modal-btn modal-btn-cancel" id="storeManagerCancelBtn">Annuler</button>
            <button class="modal-btn modal-btn-save" id="storeManagerSaveBtn">Sauvegarder</button>
        </div>
    </div>
</div>

<!-- Section Editor Modal (nested) -->
<div class="modal-overlay" id="sectionEditorModal" role="dialog" aria-modal="true">
    <div class="modal-content section-editor-modal">
        <div class="modal-header">
            <h3 id="sectionEditorTitle">Éditer la section</h3>
            <button class="modal-close" id="sectionEditorCloseBtn">&times;</button>
        </div>
        
        <div class="modal-body">
            <!-- Section Name -->
            <div class="form-group">
                <label for="sectionNameInput">Nom de la section</label>
                <input type="text" id="sectionNameInput" placeholder="Ex: Indica, Sativa, Préroulés...">
            </div>

            <!-- Format Selection -->
            <div class="form-group">
                <label>Formats inclus</label>
                <div class="checkbox-group" id="formatCheckboxes">
                    <!-- Dynamically generated checkboxes -->
                </div>
            </div>

            <!-- Strain Type Selection -->
            <div class="form-group">
                <label>Types de souches</label>
                <div class="checkbox-group" id="strainTypeCheckboxes">
                    <!-- Dynamically generated checkboxes -->
                </div>
            </div>

            <!-- Storage Type -->
            <div class="form-group">
                <label>Type de rangement</label>
                <div class="storage-config">
                    <!-- Doors -->
                    <div class="storage-option">
                        <div class="storage-header">
                            <input type="checkbox" id="enableDoors" class="storage-toggle">
                            <label for="enableDoors">Portes</label>
                        </div>
                        <div class="storage-count" id="doorsCountSection">
                            <label for="doorsCount">Nombre:</label>
                            <input type="number" id="doorsCount" min="0" max="30" value="12">
                        </div>
                    </div>

                    <!-- Drawers -->
                    <div class="storage-option">
                        <div class="storage-header">
                            <input type="checkbox" id="enableDrawers" class="storage-toggle">
                            <label for="enableDrawers">Tiroirs</label>
                        </div>
                        <div class="storage-count" id="drawersCountSection">
                            <label for="drawersCount">Nombre:</label>
                            <input type="number" id="drawersCount" min="0" max="30" value="12">
                        </div>
                    </div>
                </div>
                <p class="help-text">
                    💡 Les portes vont en haut, les tiroirs vont en bas
                </p>
            </div>

            <!-- Wall Position -->
            <div class="form-group">
                <label>Position</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="wallPosition" value="front" checked>
                        Mur avant
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="wallPosition" value="side">
                        Mur latéral
                    </label>
                </div>
                <p class="help-text">
                    💡 Utilisé pour organiser l'interface et éviter le défilement
                </p>
            </div>
        </div>

        <div class="modal-footer">
            <button class="modal-btn modal-btn-cancel" id="sectionEditorCancelBtn">Annuler</button>
            <button class="modal-btn modal-btn-delete" id="sectionEditorDeleteBtn" style="margin-right: auto;">
                🗑️ Supprimer
            </button>
            <button class="modal-btn modal-btn-save" id="sectionEditorSaveBtn">Sauvegarder</button>
        </div>
    </div>
</div>
```

### 2.3 Styles CSS pour la modale

**Fichier**: `style.css`

```css
### ✅ Tâches styles navigation murs (`style.css`)

- [ ] **4.2** Créer `.wall-navigation`:
  - [ ] Layout flex centré
  - [ ] Background gris SQDC
  - [ ] Border bottom

- [ ] **4.3** Créer `.wall-nav-btn`:
  - [ ] Style bouton avec état actif
  - [ ] Hover effect
  - [ ] Couleur jaune pour actif

### ✅ Tâches styles modale gestionnaire (`style.css`)

- [ ] **4.4** Créer `.section-manager-modal`:
  - [ ] Max-width 700px
  - [ ] Overflow scroll si nécessaire

- [ ] **4.5** Créer `.manager-section`:
  - [ ] Espacement sections
  - [ ] Border bottom entre sections

- [ ] **4.6** Créer `.section-header-bar`:
  - [ ] Flex layout entre titre et bouton add

- [ ] **4.7** Créer `.btn-add-section`:
  - [ ] Background jaune
  - [ ] Hover effect
  - [ ] Icône "+" visible

- [ ] **4.8** Créer `.wall-tabs`:
  - [ ] Layout flex pour onglets

- [ ] **4.9** Créer `.wall-tab`:
  - [ ] Style onglet
  - [ ] État actif jaune

- [ ] **4.10** Créer `.sections-list`:
  - [ ] Layout column flex

- [ ] **4.11** Créer `.section-item`:
  - [ ] Card style pour chaque section
  - [ ] Hover effect
  - [ ] Layout info + actions

### ✅ Tâches styles éditeur section (`style.css`)

- [ ] **4.12** Créer `.section-editor-modal`:
  - [ ] Max-width 600px
  - [ ] Overflow scroll

- [ ] **4.13** Créer `.form-group`:
  - [ ] Espacement formulaire
  - [ ] Labels stylés

- [ ] **4.14** Créer `.checkbox-group`:
  - [ ] Grid layout responsive
  - [ ] Style checkboxes

- [ ] **4.15** Créer `.storage-config`:
  - [ ] Layout vertical portes/tiroirs

- [ ] **4.16** Créer `.storage-option`:
  - [ ] Background gris clair
  - [ ] Padding

- [ ] **4.17** Créer `.storage-header`:
  - [ ] Flex layout checkbox + label

- [ ] **4.18** Créer `.storage-count`:
  - [ ] Input nombre portes/tiroirs
  - [ ] État disabled

- [ ] **4.19** Créer `.help-text`:
  - [ ] Style texte aide gris italique

- [ ] **4.20** Créer `.modal-btn-delete`:
  - [ ] Background rouge
  - [ ] Hover effect

---

## 📋 Phase 5: Logique JavaScript Modales

### ✅ Tâches gestionnaire modale principal (`app.js`)

- [ ] **5.1** Créer `openSectionManagerModal()`:
  - [ ] Appeler `renderSectionsList()`
  - [ ] Afficher modale

- [ ] **5.2** Créer `closeSectionManagerModal()`:
  - [ ] Cacher modale

- [ ] **5.3** Créer `saveSectionManagerChanges()`:
  - [ ] Sauvegarder config sections
  - [ ] Appeler `regenerateSectionsHTML()`
  - [ ] Re-render produits
  - [ ] Fermer modale

- [ ] **5.4** Créer `renderSectionsList()`:
  - [ ] Filtrer sections par mur actif
  - [ ] Générer liste items sections
  - [ ] Ajouter event listeners édition

- [ ] **5.5** Créer `createSectionItemHTML(section)`:
  - [ ] Générer HTML card section
  - [ ] Afficher formats, types, stockage
  - [ ] Bouton éditer

### ✅ Tâches éditeur de section (`app.js`)

- [ ] **5.6** Créer variable `let currentEditingSectionId = null;`

- [ ] **5.7** Créer `openSectionEditorModal(sectionId)`:
  - [ ] Mode création (sectionId = null) ou édition
  - [ ] Appeler `populateSectionEditor()` ou `resetSectionEditor()`
  - [ ] Afficher/cacher bouton supprimer
  - [ ] Afficher modale

- [ ] **5.8** Créer `closeSectionEditorModal()`:
  - [ ] Cacher modale
  - [ ] Reset currentEditingSectionId

- [ ] **5.9** Créer `populateSectionEditor(section)`:
  - [ ] Cocher formats sélectionnés
  - [ ] Cocher types souches sélectionnés
  - [ ] Mettre à jour affichage nom auto-généré
  - [ ] Remplir config portes/tiroirs
  - [ ] Sélectionner position mur

- [ ] **5.10** Créer `resetSectionEditor()`:
  - [ ] Décocher tous les checkboxes
  - [ ] Vider affichage nom
  - [ ] Valeurs par défaut (12 portes, 0 tiroirs, front)

- [ ] **5.11** Créer `updateStorageCountsState()`:
  - [ ] Enable/disable inputs nombre selon checkboxes

- [ ] **5.12** Créer `updateSectionNamePreview()`:
  - [ ] Lire formats sélectionnés
  - [ ] Lire types souches sélectionnés
  - [ ] Appeler `generateSectionName()`
  - [ ] Afficher dans `#sectionNameDisplay`
  - [ ] Déclenché par changement de checkbox

- [ ] **5.13** Créer `saveSectionEditor()`:
  - [ ] Valider formats (min 1)
  - [ ] Valider types souches (min 1)
  - [ ] Collecter config stockage
  - [ ] Générer nom automatiquement avec `generateSectionName()`
  - [ ] Créer objet sectionData (nom auto-généré)
  - [ ] Appeler `addSection()` ou `updateSection()`
  - [ ] Re-render liste sections
  - [ ] Fermer modale

- [ ] **5.14** Créer `deleteSectionEditor()`:
  - [ ] Confirmer suppression
  - [ ] Appeler `removeSection()`
  - [ ] Re-render liste sections
  - [ ] Fermer modale

- [ ] **5.15** Créer `generateFormCheckboxes()`:
  - [ ] Générer checkboxes formats dynamiquement
  - [ ] Générer checkboxes types souches dynamiquement

### ✅ Tâches event listeners (`app.js`)

- [ ] **5.16** Dans `DOMContentLoaded`, ajouter:
  - [ ] Event listener bouton `#sectionConfigBtn` → `openSectionManagerModal()`
  - [ ] Event listener `#sectionManagerCloseBtn` → `closeSectionManagerModal()`
  - [ ] Event listener `#sectionManagerCancelBtn` → `closeSectionManagerModal()`
  - [ ] Event listener `#sectionManagerSaveBtn` → `saveSectionManagerChanges()`
  - [ ] Event listener `#addSectionBtn` → `openSectionEditorModal()`
  - [ ] Event listeners onglets murs → toggle active + re-render liste
  - [ ] Event listener `#sectionEditorCloseBtn` → `closeSectionEditorModal()`
  - [ ] Event listener `#sectionEditorCancelBtn` → `closeSectionEditorModal()`
  - [ ] Event listener `#sectionEditorSaveBtn` → `saveSectionEditor()`
  - [ ] Event listener `#sectionEditorDeleteBtn` → `deleteSectionEditor()`
  - [ ] Event listeners checkboxes portes/tiroirs → `updateStorageCountsState()`
  - [ ] Event listeners checkboxes formats/souches → `updateSectionNamePreview()`
  - [ ] Appeler `generateFormCheckboxes()`
  - [ ] Appeler `loadSectionsConfig()` au démarrage

- [ ] **5.17** Event listeners navigation murs:
  - [ ] Click sur `.wall-nav-btn` → `switchWallView()`
  - [ ] Toggle classe active
  - [ ] Filtrer sections affichées

---

## 📋 Phase 6: Migration et Compatibilité

### ✅ Tâches migration données (`app.js`)

- [ ] **6.1** Créer `migrateToNewConfig()`:
  - [ ] Vérifier si ancienne config existe (DOOR_COUNT, DRAWER_COUNT)
  - [ ] Charger anciennes valeurs
  - [ ] Mapper vers DEFAULT_SECTIONS
  - [ ] Sauvegarder nouvelle config
  - [ ] Logger migration

- [ ] **6.2** Appeler `migrateToNewConfig()` au démarrage (dans `DOMContentLoaded`)

- [ ] **6.3** Tester compatibilité backwards:
  - [ ] Anciennes données localStorage fonctionnent
  - [ ] Migration automatique sans perte de données

---

## 📋 Phase 7: Documentation et Finalisation

### ✅ Tâches documentation

- [ ] **7.1** Documenter structure données `SECTION_CONFIG`
- [ ] **7.2** Documenter fonctions API sections
- [ ] **7.3** Ajouter commentaires code clés
- [ ] **7.4** Créer guide utilisateur (comment configurer sections)

### ✅ Tâches nettoyage

- [ ] **7.5** Supprimer code obsolète (si applicable)
- [ ] **7.6** Vérifier console.log/debug statements
- [ ] **7.7** Optimiser performances rendering
- [ ] **7.8** Vérifier accessibilité (aria-labels, keyboard nav)

---

## 🎯 Résumé Progression

**Total tâches**: ~90
**Phases**: 7

### Priorités
1. **Phase 1-2**: Configuration et backend (critique)
2. **Phase 3-4**: Interface HTML/CSS (critique)  
3. **Phase 5**: Logique modales (critique)
4. **Phase 6**: Migration (important)
5. **Phase 7**: Documentation (nice-to-have)

### Notes
- Tests unitaires seront implémentés dans une future phase
- Pas de gestion du numéro de succursale (chaque succursale = version locale distincte)
- **Noms de sections auto-générés** basés sur les formats et types sélectionnés
- **Sélections multiples** possibles pour formats ET types de souches

### Exemples de noms auto-générés:
- `Sativa 3,5g • 28g`
- `Tous types Hashish`
- `Indica • Hybride Préroulé`
- `Sativa • Indica 3,5g • 28g • Préroulé`

.manager-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--sqdc-light-gray);
}

.manager-section:last-child {
    border-bottom: none;
}

.manager-section h4 {
    color: var(--sqdc-yellow);
    font-size: 1rem;
    margin-bottom: 1rem;
}

.section-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.btn-add-section {
    background-color: var(--sqdc-yellow);
    color: var(--sqdc-black);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
}

.btn-add-section:hover {
    background-color: var(--sqdc-light-yellow);
    transform: translateY(-1px);
}

.btn-add-section span {
    font-size: 1.2rem;
    font-weight: bold;
}

/* Wall Tabs */
.wall-tabs {
    display: flex;
    gap: 0.5rem;
}

.wall-tab {
    flex: 1;
    padding: 0.75rem 1rem;
    background-color: var(--sqdc-light-gray);
    color: white;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
}

.wall-tab:hover {
    background-color: var(--sqdc-gray);
}

.wall-tab.active {
    background-color: var(--sqdc-yellow);
    color: var(--sqdc-black);
    border-color: var(--sqdc-yellow);
}

/* Sections List */
.sections-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.section-item {
    background-color: var(--sqdc-light-gray);
    border: 1px solid var(--sqdc-gray);
    border-radius: 4px;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
    cursor: pointer;
}

.section-item:hover {
    border-color: var(--sqdc-yellow);
    transform: translateX(4px);
}

.section-item-info {
    flex: 1;
}

.section-item-name {
    font-size: 1rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.25rem;
}

.section-item-details {
    font-size: 0.85rem;
    color: #999;
}

.section-item-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-edit-section,
.btn-delete-section {
    background-color: var(--sqdc-gray);
    color: white;
    border: 1px solid var(--sqdc-light-gray);
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
}

.btn-edit-section:hover {
    background-color: var(--sqdc-yellow);
    color: var(--sqdc-black);
    border-color: var(--sqdc-yellow);
}

.btn-delete-section:hover {
    background-color: #ff6b6b;
    color: white;
    border-color: #ff6b6b;
}

/* Section Editor Modal */
.section-editor-modal {
    max-width: 600px;
    max-height: 85vh;
    overflow-y: auto;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    color: var(--sqdc-light-yellow);
    font-size: 0.95rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.form-group input[type="text"],
.form-group input[type="number"] {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--sqdc-light-gray);
    border: 2px solid var(--sqdc-gray);
    border-radius: 4px;
    color: white;
    font-size: 1rem;
}

.form-group input:focus {
    outline: none;
    border-color: var(--sqdc-yellow);
}

.checkbox-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
}

.checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    cursor: pointer;
    padding: 0.5rem;
    background-color: var(--sqdc-light-gray);
    border-radius: 4px;
    transition: all 0.2s ease;
}

.checkbox-group label:hover {
    background-color: var(--sqdc-gray);
}

.checkbox-group input[type="checkbox"] {
    cursor: pointer;
    accent-color: var(--sqdc-yellow);
}

.storage-config {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.storage-option {
    background-color: var(--sqdc-light-gray);
    padding: 1rem;
    border-radius: 4px;
}

.storage-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.storage-toggle {
    cursor: pointer;
    accent-color: var(--sqdc-yellow);
    width: 20px;
    height: 20px;
}

.storage-header label {
    font-size: 1rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0;
    cursor: pointer;
}

.storage-count {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 1.75rem;
}

.storage-count label {
    font-size: 0.9rem;
    color: #999;
    margin-bottom: 0;
}

.storage-count input {
    width: 80px;
}

.storage-count.disabled {
    opacity: 0.5;
    pointer-events: none;
}

.help-text {
    font-size: 0.85rem;
    color: #999;
    font-style: italic;
    margin-top: 0.5rem;
}

.modal-btn-delete {
    background-color: #ff6b6b;
    color: white;
}

.modal-btn-delete:hover {
    background-color: #ff5252;
}
```

---

## Phase 3: Logique JavaScript

### 3.1 Gestionnaire de modale principal

**Fichier**: `app.js`

Ajouter les fonctions suivantes:

```javascript
// ============================================
// Store Manager Modal
// ============================================

function openStoreManagerModal() {
    const modal = document.getElementById('storeManagerModal');
    const storeIdInput = document.getElementById('storeIdInput');
    
    // Load current store ID
    storeIdInput.value = storeId;
    
    // Render sections list
    renderSectionsList();
    
    // Show modal
    modal.classList.add('active');
}

function closeStoreManagerModal() {
    const modal = document.getElementById('storeManagerModal');
    modal.classList.remove('active');
}

function saveStoreManagerChanges() {
    const storeIdInput = document.getElementById('storeIdInput');
    const newStoreId = storeIdInput.value.trim();
    
    // Validate store ID
    if (!newStoreId) {
        showValidationError('Le numéro de succursale est requis');
        return;
    }
    
    // Save store ID
    storeId = newStoreId;
    saveStoreId(storeId);
    
    // Update display
    document.getElementById('storeIdDisplay').textContent = storeId;
    
    // Save sections config
    saveSectionsConfig();
    
    // Regenerate HTML structure
    regenerateSectionsHTML();
    
    // Re-render products
    renderProducts();
    
    closeStoreManagerModal();
}

function renderSectionsList() {
    const sectionsList = document.getElementById('sectionsList');
    sectionsList.innerHTML = '';
    
    // Get sections for current wall (default to 'front')
    const currentWall = document.querySelector('.wall-tab.active')?.dataset.wall || 'front';
    const filteredSections = sectionsConfig.filter(s => s.wallPosition === currentWall);
    
    filteredSections.forEach(section => {
        const sectionItem = createSectionItemHTML(section);
        sectionsList.appendChild(sectionItem);
    });
}

function createSectionItemHTML(section) {
    const item = document.createElement('div');
    item.className = 'section-item';
    item.dataset.sectionId = section.id;
    
    // Build details string
    const formats = section.format.map(f => CONFIG.SECTION_CONFIG.AVAILABLE_FORMATS[f]).join(', ');
    const strains = section.strainTypes.join(', ');
    const storage = [];
    if (section.storage.doors.enabled) storage.push(`${section.storage.doors.count} portes`);
    if (section.storage.drawers.enabled) storage.push(`${section.storage.drawers.count} tiroirs`);
    
    item.innerHTML = `
        <div class="section-item-info">
            <div class="section-item-name">${section.name}</div>
            <div class="section-item-details">
                ${formats} • ${strains} • ${storage.join(' + ')}
            </div>
        </div>
        <div class="section-item-actions">
            <button class="btn-edit-section" data-section-id="${section.id}">✏️ Éditer</button>
        </div>
    `;
    
    // Add click handler
    item.querySelector('.btn-edit-section').addEventListener('click', (e) => {
        e.stopPropagation();
        openSectionEditorModal(section.id);
    });
    
    return item;
}
```

### 3.2 Éditeur de section

```javascript
// ============================================
// Section Editor Modal
// ============================================

let currentEditingSectionId = null;

function openSectionEditorModal(sectionId = null) {
    const modal = document.getElementById('sectionEditorModal');
    const title = document.getElementById('sectionEditorTitle');
    const deleteBtn = document.getElementById('sectionEditorDeleteBtn');
    
    currentEditingSectionId = sectionId;
    
    if (sectionId) {
        // Edit existing section
        const section = getSectionById(sectionId);
        title.textContent = 'Éditer la section';
        deleteBtn.style.display = 'block';
        populateSectionEditor(section);
    } else {
        // Create new section
        title.textContent = 'Nouvelle section';
        deleteBtn.style.display = 'none';
        resetSectionEditor();
    }
    
    modal.classList.add('active');
}

function closeSectionEditorModal() {
    const modal = document.getElementById('sectionEditorModal');
    modal.classList.remove('active');
    currentEditingSectionId = null;
}

function populateSectionEditor(section) {
    // Name
    document.getElementById('sectionNameInput').value = section.name;
    
    // Formats
    section.format.forEach(format => {
        const checkbox = document.querySelector(`#formatCheckboxes input[value="${format}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    // Strain types
    section.strainTypes.forEach(type => {
        const checkbox = document.querySelector(`#strainTypeCheckboxes input[value="${type}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    // Storage
    document.getElementById('enableDoors').checked = section.storage.doors.enabled;
    document.getElementById('doorsCount').value = section.storage.doors.count;
    document.getElementById('enableDrawers').checked = section.storage.drawers.enabled;
    document.getElementById('drawersCount').value = section.storage.drawers.count;
    
    // Wall position
    document.querySelector(`input[name="wallPosition"][value="${section.wallPosition}"]`).checked = true;
    
    updateStorageCountsState();
}

function resetSectionEditor() {
    document.getElementById('sectionNameInput').value = '';
    document.querySelectorAll('#formatCheckboxes input').forEach(cb => cb.checked = false);
    document.querySelectorAll('#strainTypeCheckboxes input').forEach(cb => cb.checked = false);
    document.getElementById('enableDoors').checked = true;
    document.getElementById('doorsCount').value = 12;
    document.getElementById('enableDrawers').checked = false;
    document.getElementById('drawersCount').value = 0;
    document.querySelector('input[name="wallPosition"][value="front"]').checked = true;
    updateStorageCountsState();
}

function updateStorageCountsState() {
    const doorsEnabled = document.getElementById('enableDoors').checked;
    const drawersEnabled = document.getElementById('enableDrawers').checked;
    
    const doorsCountSection = document.getElementById('doorsCountSection');
    const drawersCountSection = document.getElementById('drawersCountSection');
    
    if (doorsEnabled) {
        doorsCountSection.classList.remove('disabled');
    } else {
        doorsCountSection.classList.add('disabled');
    }
    
    if (drawersEnabled) {
        drawersCountSection.classList.remove('disabled');
    } else {
        drawersCountSection.classList.add('disabled');
    }
}

function saveSectionEditor() {
    // Gather form data
    const name = document.getElementById('sectionNameInput').value.trim();
    
    // Validate
    if (!name) {
        alert('Le nom de la section est requis');
        return;
    }
    
    // Get selected formats
    const formats = Array.from(document.querySelectorAll('#formatCheckboxes input:checked'))
        .map(cb => cb.value);
    
    if (formats.length === 0) {
        alert('Au moins un format doit être sélectionné');
        return;
    }
    
    // Get selected strain types
    const strainTypes = Array.from(document.querySelectorAll('#strainTypeCheckboxes input:checked'))
        .map(cb => cb.value);
    
    if (strainTypes.length === 0) {
        alert('Au moins un type de souche doit être sélectionné');
        return;
    }
    
    // Get storage config
    const storage = {
        doors: {
            enabled: document.getElementById('enableDoors').checked,
            count: parseInt(document.getElementById('doorsCount').value) || 0
        },
        drawers: {
            enabled: document.getElementById('enableDrawers').checked,
            count: parseInt(document.getElementById('drawersCount').value) || 0
        }
    };
    
    // Get wall position
    const wallPosition = document.querySelector('input[name="wallPosition"]:checked').value;
    
    // Create section data
    const sectionData = {
        id: currentEditingSectionId || generateSectionId(),
        name,
        format: formats,
        strainTypes,
        storage,
        wallPosition,
        visible: true,
        order: currentEditingSectionId ? 
            getSectionById(currentEditingSectionId).order : 
            sectionsConfig.length + 1
    };
    
    if (currentEditingSectionId) {
        // Update existing
        updateSection(currentEditingSectionId, sectionData);
    } else {
        // Add new
        addSection(sectionData);
    }
    
    // Re-render sections list
    renderSectionsList();
    
    closeSectionEditorModal();
}

function deleteSectionEditor() {
    if (!currentEditingSectionId) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette section?')) {
        removeSection(currentEditingSectionId);
        renderSectionsList();
        closeSectionEditorModal();
    }
}

function generateSectionId() {
    return 'section_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
```

### 3.3 Initialisation des gestionnaires d'événements

```javascript
// Add to DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // ... existing initialization ...
    
    // Load store configuration
    loadStoreId();
    loadSectionsConfig();
    
    // Update store ID display
    document.getElementById('storeIdDisplay').textContent = storeId;
    
    // Store Manager Modal handlers
    const storeManagerBtn = document.getElementById('storeManagerBtn');
    const storeManagerCloseBtn = document.getElementById('storeManagerCloseBtn');
    const storeManagerCancelBtn = document.getElementById('storeManagerCancelBtn');
    const storeManagerSaveBtn = document.getElementById('storeManagerSaveBtn');
    const addSectionBtn = document.getElementById('addSectionBtn');
    
    if (storeManagerBtn) {
        storeManagerBtn.addEventListener('click', openStoreManagerModal);
    }
    if (storeManagerCloseBtn) {
        storeManagerCloseBtn.addEventListener('click', closeStoreManagerModal);
    }
    if (storeManagerCancelBtn) {
        storeManagerCancelBtn.addEventListener('click', closeStoreManagerModal);
    }
    if (storeManagerSaveBtn) {
        storeManagerSaveBtn.addEventListener('click', saveStoreManagerChanges);
    }
    if (addSectionBtn) {
        addSectionBtn.addEventListener('click', () => openSectionEditorModal());
    }
    
    // Wall tabs
    document.querySelectorAll('.wall-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.wall-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderSectionsList();
        });
    });
    
    // Section Editor Modal handlers
    const sectionEditorCloseBtn = document.getElementById('sectionEditorCloseBtn');
    const sectionEditorCancelBtn = document.getElementById('sectionEditorCancelBtn');
    const sectionEditorSaveBtn = document.getElementById('sectionEditorSaveBtn');
    const sectionEditorDeleteBtn = document.getElementById('sectionEditorDeleteBtn');
    
    if (sectionEditorCloseBtn) {
        sectionEditorCloseBtn.addEventListener('click', closeSectionEditorModal);
    }
    if (sectionEditorCancelBtn) {
        sectionEditorCancelBtn.addEventListener('click', closeSectionEditorModal);
    }
    if (sectionEditorSaveBtn) {
        sectionEditorSaveBtn.addEventListener('click', saveSectionEditor);
    }
    if (sectionEditorDeleteBtn) {
        sectionEditorDeleteBtn.addEventListener('click', deleteSectionEditor);
    }
    
    // Storage toggles
    document.getElementById('enableDoors')?.addEventListener('change', updateStorageCountsState);
    document.getElementById('enableDrawers')?.addEventListener('change', updateStorageCountsState);
    
    // Generate format and strain type checkboxes
    generateFormCheckboxes();
});

function generateFormCheckboxes() {
    // Formats
    const formatCheckboxes = document.getElementById('formatCheckboxes');
    if (formatCheckboxes) {
        Object.entries(CONFIG.SECTION_CONFIG.AVAILABLE_FORMATS).forEach(([key, label]) => {
            const labelEl = document.createElement('label');
            labelEl.innerHTML = `
                <input type="checkbox" value="${key}">
                ${label}
            `;
            formatCheckboxes.appendChild(labelEl);
        });
    }
    
    // Strain types
    const strainTypeCheckboxes = document.getElementById('strainTypeCheckboxes');
    if (strainTypeCheckboxes) {
        Object.entries(CONFIG.SECTION_CONFIG.STRAIN_TYPES).forEach(([key, label]) => {
            const labelEl = document.createElement('label');
            labelEl.innerHTML = `
                <input type="checkbox" value="${label}">
                ${label}
            `;
            strainTypeCheckboxes.appendChild(labelEl);
        });
    }
}
```

---

## Phase 4: Navigation par murs (Front/Side)

### 4.1 Créer l'interface de navigation

**Fichier**: `index.html`

Ajouter après `<div class="controls">`:

```html
<div class="wall-navigation" id="wallNavigation">
    <button class="wall-nav-btn active" data-wall="front">
        🏠 Mur avant
    </button>
    <button class="wall-nav-btn" data-wall="side">
        🔲 Mur latéral
    </button>
</div>
```

### 4.2 Styles pour navigation

**Fichier**: `style.css`

```css
.wall-navigation {
    background-color: var(--sqdc-gray);
    padding: 0.75rem 2rem;
    display: flex;
    justify-content: center;
    gap: 1rem;
    border-bottom: 2px solid var(--sqdc-light-gray);
}

.wall-nav-btn {
    background-color: var(--sqdc-light-gray);
    color: white;
    border: 2px solid transparent;
    padding: 0.75rem 2rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.wall-nav-btn:hover {
    background-color: var(--sqdc-gray);
    transform: translateY(-2px);
}

.wall-nav-btn.active {
    background-color: var(--sqdc-yellow);
    color: var(--sqdc-black);
    border-color: var(--sqdc-yellow);
}
```

### 4.3 Logique de navigation

**Fichier**: `app.js`

```javascript
let currentWall = 'front';

function switchWallView(wallPosition) {
    currentWall = wallPosition;
    
    // Update button states
    document.querySelectorAll('.wall-nav-btn').forEach(btn => {
        if (btn.dataset.wall === wallPosition) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide sections based on wall position
    sectionsConfig.forEach(section => {
        const sectionElement = document.querySelector(`[data-section-id="${section.id}"]`);
        if (sectionElement) {
            if (section.wallPosition === wallPosition) {
                sectionElement.style.display = 'flex';
            } else {
                sectionElement.style.display = 'none';
            }
        }
    });
}

// Add event listener to wall navigation buttons
document.querySelectorAll('.wall-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchWallView(btn.dataset.wall);
    });
});
```

---

## Phase 5: Tests et validation

### 5.1 Checklist de tests

- [ ] Le bouton de succursale ouvre la modale
- [ ] Le numéro de succursale peut être modifié
- [ ] Les sections peuvent être ajoutées
- [ ] Les sections peuvent être éditées
- [ ] Les sections peuvent être supprimées
- [ ] La configuration est sauvegardée dans localStorage
- [ ] La configuration persiste après rechargement
- [ ] Les produits s'affichent correctement dans les nouvelles sections
- [ ] Les portes et tiroirs fonctionnent correctement
- [ ] La navigation mur avant/latéral fonctionne
- [ ] Les formats multiples sont supportés
- [ ] Les types de souches multiples sont supportés
- [ ] L'interface responsive fonctionne

### 5.2 Cas limites à tester

1. Section sans porte ni tiroir
2. Section avec seulement des portes
3. Section avec seulement des tiroirs
4. Section avec tous les formats
5. Section avec tous les types de souches
6. Migration depuis l'ancienne configuration
7. Suppression de toutes les sections
8. Ajout de plus de 10 sections

---

## Phase 6: Migration et compatibilité

### 6.1 Script de migration

**Fichier**: `app.js`

```javascript
function migrateToNewConfig() {
    // Check if old config exists
    const oldDoorCounts = localStorage.getItem(CONFIG.STORAGE_KEYS.DOOR_COUNT);
    const oldDrawerCounts = localStorage.getItem(CONFIG.STORAGE_KEYS.DRAWER_COUNT);
    
    if (oldDoorCounts || oldDrawerCounts) {
        console.log('Migrating old configuration...');
        
        const doorCounts = oldDoorCounts ? JSON.parse(oldDoorCounts) : {};
        const drawerCounts = oldDrawerCounts ? JSON.parse(oldDrawerCounts) : {};
        
        // Update default sections with old counts
        sectionsConfig = CONFIG.SECTION_CONFIG.DEFAULT_SECTIONS.map(section => {
            const sectionId = section.id;
            
            if (doorCounts[sectionId]) {
                section.storage.doors.count = doorCounts[sectionId];
            }
            if (drawerCounts[sectionId]) {
                section.storage.drawers.count = drawerCounts[sectionId];
            }
            
            return section;
        });
        
        // Save migrated config
        saveSectionsConfig();
        
        console.log('Migration complete!');
    }
}
```

---

## Résumé des fichiers à modifier

### Nouveaux fichiers
Aucun nouveau fichier nécessaire.

### Fichiers à modifier
1. **config.js** - Ajouter `SECTION_CONFIG`
2. **index.html** - Ajouter modales et navigation
3. **style.css** - Ajouter styles pour modales et navigation
4. **app.js** - Ajouter toute la logique de gestion des sections

---

## Ordre d'implémentation recommandé

1. ✅ **Phase 1.1**: Créer le modèle de données dans `config.js`
2. ✅ **Phase 1.2**: Créer les fonctions utilitaires dans `app.js`
3. ✅ **Phase 2.1**: Créer le bouton cliquable
4. ✅ **Phase 2.2**: Créer la structure HTML des modales
5. ✅ **Phase 2.3**: Ajouter les styles CSS
6. ✅ **Phase 3.1**: Implémenter le gestionnaire de modale principal
7. ✅ **Phase 3.2**: Implémenter l'éditeur de section
8. ✅ **Phase 3.3**: Ajouter les gestionnaires d'événements
9. ✅ **Phase 4**: Implémenter la navigation par murs
10. ✅ **Phase 5**: Tests et validation
11. ✅ **Phase 6**: Migration et compatibilité

---

## Notes importantes

- La configuration est sauvegardée dans **localStorage** (client-side uniquement)
- Les sections sont **dynamiques** et configurables par l'utilisateur
- Le système de **portes/tiroirs** est préservé et amélioré
- La navigation **mur avant/latéral** évite le défilement vertical
- Compatible avec le système de **drag-and-drop** existant
- Respecte les contraintes du projet (pas de serveur, vanilla JS)
