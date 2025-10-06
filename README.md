# SQDC Products Portal

Portail web pour la gestion et l'affichage des produits de cannabis de la SQDC (Société québécoise du cannabis) pour la succursale #77074.

**Démo en ligne:** [https://ismaelmoreau.github.io/sqdcProductsPortal/](https://ismaelmoreau.github.io/sqdcProductsPortal/)

## Caractéristiques

### Portail Principal
- **Filtrage dynamique** par type de cannabis (Indica, Sativa, Hybride)
- **Recherche** par nom de produit ou marque
- **Organisation** par type et format (3,5g vs autres formats)
- **Modification en temps réel** des informations produit (THC, CBD, type, format)
- **Visualisation** des fiches produits (PDF/images)
- **Persistance locale** de toutes les modifications via LocalStorage

### Système de Listes d'Impression
- **Création** de listes d'impression personnalisées
- **Sections multiples** pour organiser par catégories
- **Drag & Drop** pour réorganiser sections et produits
- **Configuration des colonnes** à afficher
- **Export CSV** et **impression** avec tableaux séparés par section
- **Sauvegarde automatique** dans le navigateur

## Technologies

**Application 100% frontend - Aucun serveur requis**

- **JavaScript**: Vanilla ES6+ (pas de framework)
- **CSS3**: Variables CSS, Grid, Flexbox
- **HTML5**: Sémantique et accessible
- **APIs**: LocalStorage, Fetch API, Drag & Drop API
- **Hébergement**: GitHub Pages (fichiers statiques)

## Installation

### Ouvrir directement dans le navigateur

```bash
# Cloner le dépôt
git clone https://github.com/ismaelMoreau/sqdcProductsPortal.git
cd sqdcProductsPortal

# Ouvrir index.html dans votre navigateur
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

## Utilisation

### Portail Principal (`index.html`)

1. **Filtrer les produits**: Cliquez sur les boutons Indica/Sativa/Hybride/Tous
2. **Rechercher**: Tapez dans la barre de recherche (nom ou marque)
3. **Modifier un produit**: Cliquez sur une carte produit pour ouvrir le modal d'édition
4. **Voir une fiche produit**: Cliquez sur l'icône 👁 pour visualiser le PDF/image
5. **Naviguer**: Utilisez les flèches < > pour faire défiler les grilles

### Listes d'Impression (`print-lists.html`)

1. **Créer une liste**: Cliquez sur "Créer une nouvelle liste"
2. **Ajouter une section**: Cliquez sur "Ajouter une section" dans une liste
3. **Ajouter des produits**: Sélectionnez une catégorie et recherchez des produits
4. **Réorganiser**: Glissez-déposez les sections et les produits
5. **Configurer l'impression**: Cliquez sur "Configurer l'impression" pour choisir les colonnes
6. **Imprimer/Exporter**: Utilisez les boutons "Imprimer" ou "Exporter CSV"

## Structure du Projet

```
sqdcProductsPortal/
├── index.html              # Page principale du portail
├── app.js                  # Logique principale (filtrage, édition, etc.)
├── config.js               # Configuration et constantes
├── style.css               # Styles du portail principal
├── print-lists.html        # Page de gestion des listes d'impression
├── print-lists.js          # Logique des listes d'impression
├── print-lists.css         # Styles des listes d'impression
├── products.json           # Données produits (JSON)
├── products-data.js        # Fallback des données produits
├── files-index-data.js     # Index des fiches produits
├── fiche_produits/         # Fiches produits (PDF/images)
│   └── planogram_2024/     # Organisées par catégorie
├── CLAUDE.md               # Documentation pour Claude Code
└── README.md               # Ce fichier
```

## Données Produits

Les produits sont chargés depuis `products.json` avec fallback vers `products-data.js` si le fichier JSON n'est pas accessible.

**Structure d'un produit:**
```javascript
{
  "sku": "688083012345",
  "name": "Nom du Produit",
  "brand": "Marque",
  "type": "Indica",           // Indica | Sativa | Hybride
  "format": "3,5 g",          // 3,5 g | 7 g | 28 g | Préroulé...
  "thcMin": 20,               // THC minimum %
  "thcMax": 25,               // THC maximum %
  "cbdMin": 0,                // CBD minimum % (optionnel)
  "cbdMax": 1                 // CBD maximum % (optionnel)
}
```

## Persistance des Données

Toutes les modifications sont sauvegardées dans le **LocalStorage** du navigateur:

- `sqdcThcChanges`: Modifications THC/CBD
- `sqdcProductTypeChanges`: Changements de type de produit
- `sqdcFormatChanges`: Changements de format
- `sqdcPrintLists`: Listes d'impression personnalisées

**Note:** Les données sont liées au domaine et au navigateur. Effacer les données du site réinitialisera toutes les modifications.

## Développement

### Prérequis
- Navigateur moderne (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Éditeur de code (VS Code recommandé)

### Workflow de développement
1. Modifier les fichiers HTML/CSS/JS
2. Rafraîchir le navigateur pour voir les changements
3. Utiliser les DevTools (F12) pour déboguer
4. Tester sur différents navigateurs

### Ajouter de nouveaux produits
1. Éditer `products.json`
2. Ajouter les fiches produits dans `fiche_produits/planogram_2024/`
3. Mettre à jour `files-index-data.js` avec les chemins des fiches
4. Rafraîchir l'application

### Conventions de code
- JavaScript: ES6+, `const`/`let`, fonctions fléchées
- CSS: Variables CSS dans `:root`, mobile-first
- Nommage: camelCase pour JS, kebab-case pour CSS
- Langue: Interface en français

## Compatibilité

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile (responsive design)

**APIs requises:**
- Fetch API
- LocalStorage
- CSS Grid & Flexbox
- CSS Custom Properties
- Drag and Drop API

## Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Commiter les changements (`git commit -m 'Ajout de fonctionnalité'`)
4. Pousser vers la branche (`git push origin feature/amelioration`)
5. Ouvrir une Pull Request

## Licence

Ce projet est destiné à un usage interne pour la SQDC succursale #77074.

## Auteur

Ismael Moreau - [GitHub](https://github.com/ismaelMoreau)

---

**Note importante:** Cette application fonctionne entièrement côté client sans serveur backend. Toutes les données sont stockées localement dans le navigateur.
