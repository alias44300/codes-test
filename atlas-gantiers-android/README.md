# Atlas des Gantiers — Projet Android

Application Android **hors ligne**, alimentée par les 362 marques uniques et 39 pays du livre.

## Fonctionnalités

- Rechercher et parcourir les fiches par marque et pays d'origine.
- Sélectionner trois photos depuis la galerie Android sans autorisation générale de lecture.
- Photos non étirées : image en **object-fit:cover**, cadrage horizontal / vertical et **zoom réglables**, conservation du ratio et fondu sur les bords.
- Fondus sur les quatre côtés, conservés après changement de photo.
- Rédiger une biographie vierge, sauvegarde automatique dans la mémoire privée de l'application via IndexedDB.
- Sauvegarde/restauration JSON et impression native d'une fiche vers PDF.
- Fonctionnement sans compte ni Internet, sans publicité ni suivi.

## Compilation (APK)

Un APK **n'est pas inclus**, car l'environnement de création ne disposait pas du SDK Android. Pour obtenir l'APK :

1. Ouvrir ce dossier comme projet dans **Android Studio** (JDK 17 ; SDK Android API 35).
2. Laisser Gradle synchroniser le projet (plugin Android 8.8.2).
3. Menu **Build > Build APK(s)**.
4. Récupérer `app/build/outputs/apk/debug/app-debug.apk` pour l'installer sur Android. La version debug n'est pas destinée au Play Store.

Ou publier le projet sur **un dépôt GitHub personnel** avec Actions activées, lancer *Build Android debug APK*, puis télécharger l'artefact de build. Ne pas publier des sauvegardes de photos privées dans le dépôt.

## Fonctionnement et données

L'écran est fourni par une interface de lecture et édition embarquée dans une application native Android : `MainActivity` héberge un WebView **local** sans navigation réseau. Le catalogue est dans `app/src/main/assets/index.html` et contient 362 marques uniques et 39 pages pays. Aucune photo n'est envoyée sur Internet. Les données sont supprimées si l'utilisateur désinstalle l'application sans exporter une sauvegarde.

**Limite** : le pincement tactile pour zoomer n'est pas implémenté : le cadrage est contrôlé par trois curseurs (horizontal, vertical, zoom). Le module PDF utilise l'imprimante Android pour une fiche à la fois, et non un export monobloc des 414 pages. Un vrai APK compilé n'a pas été testé dans cet environnement.

## Vérification effectuée / limitations

- Vérifications web sous Chromium via Playwright et vérification syntaxique JavaScript. Ce n'est PAS un test sur Android.
- Aucun SDK Android ni Gradle installés dans cet environnement, et aucun APK compilé.
- Recherche mobile améliorée : les résultats sont désormais visibles et sélectionnables sur téléphone.
- Les photos sont sauvegardées dans l'espace privé du WebView; sauvegarde Android cloud désactivée.
- La compilation nécessite un environnement Android Studio ou CI GitHub Actions.

## Version 1.0.5 : doublons et origines

- Cinq doublons de marques fusionnés : Tanoshi, Leone Sport/Leone 1947, ARES, BBE et Leaders.
- 40 fiches auditées et corrigées à partir de documents, sites de marques et registres ; pays de création utilisé, jamais simplement le pays de fabrication.
- 83 fiches restent à origine indéterminée, sans drapeau inventé.
- Données locales des anciennes fiches conservées sous leurs identifiants historiques et incluses dans les exports JSON ; toute photo manquant à la fiche principale est transférée vers l'espace libre si disponible.
- Important : les APK debug de runners GitHub distincts peuvent être signés avec des certificats incompatibles, nécessitant une nouvelle installation et l'export préalable d'une sauvegarde.

L'origine de FightCamp est canadienne (Montréal), distincte de l'implantation actuelle américaine. GOAT Boxing et XPRT sont nés aux Pays-Bas, Necalli au Mexique.

## Correctif 1.0.6 — Japon

- TIGRAO : intitulé unique, sans l'ajout « / Chiguron ». Le nom en japonais n'est pas une deuxième marque.
- adidas SHORI (ADISHORI) : gamme fabriquée au Japon, identifiée distinctement de la marque mère adidas, d'origine allemande. La fiche existante a gardé son identifiant et ses photos.
- Test de non-régression sur les neuf fiches du Japon et l'unicité de ces deux noms.
