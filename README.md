# SQDC Products Portal

Portail web pour gérer les produits de cannabis de la SQDC succursale #77074.

**Démo:** [https://ismaelmoreau.github.io/sqdcProductsPortal/](https://ismaelmoreau.github.io/sqdcProductsPortal/)

## Fonctionnalités

- Filtrage par type (Indica, Sativa, Hybride)
- Recherche par nom ou marque
- Modification des produits (THC, CBD, type, format)
- Visualisation des fiches produits
- Création de listes d'impression personnalisées
- Toutes les modifications sauvegardées localement

## Installation

```bash
git clone https://github.com/ismaelMoreau/sqdcProductsPortal.git
cd sqdcProductsPortal
```

Ouvrez `index.html` dans votre navigateur.

## Utilisation

### Portail Principal

- Filtrez avec les boutons Indica/Sativa/Hybride/Tous
- Cliquez sur un produit pour le modifier
- Utilisez les flèches < > pour naviguer

### Listes d'Impression

Accédez à `print-lists.html` pour créer et gérer vos listes.

## Technologies

Application 100% frontend - Aucun serveur requis

- JavaScript vanilla ES6+
- HTML5 & CSS3
- LocalStorage pour la persistance

## Structure

```
├── index.html          # Page principale
├── app.js              # Logique du portail
├── style.css           # Styles
├── print-lists.html    # Gestion des listes
├── products.json       # Données produits
└── fiche_produits/     # Fiches PDF/images
```

## Auteur

Ismael Moreau - [GitHub](https://github.com/ismaelMoreau)
