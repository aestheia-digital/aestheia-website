# AesthéIA — prototype cinématographique de l’accueil

Prototype indépendant, 15 novembre 2026. Aucune autorisation de fusion ou de publication en production.

## Diagnostic et base de travail

- Dépôt effectivement relié à Netlify : `aestheia-digital/aestheia-website` (le dépôt `aestheia-digital/aestheia-digital` du brief renvoie 404).
- Branche de référence : `main`, commit `6e1b3a09ca999690c9cd101d4a12db2924655233`, identique au déploiement de production consulté. Inclut les PR 311 (charte unique) et 312 (finitions mobiles).
- Branche dédiée : `prototype/accueil-cinema-responsive`.
- PR ouvertes consultées : 309 (sécurité), 303 (texte Institut), 301 (ancien bandeau animé), 241/240 (anciennes propositions d’accueil), 234 (ancienne vidéo du header). Elles ne sont pas intégrées : leurs propositions ne remplacent pas la dernière charte validée. La PR 301 repose sur l’ancienne architecture `.home-hero-photo`, absente de l’accueil actuel.
- Accueil statique HTML, CSS et JavaScript sans chaîne de compilation, sans framework ni bibliothèque d’animation chargée. Menu et compteur d’expérience en scripts inline ; simulateur et consentement dans leurs propres fichiers.
- Photos en WebP ; header avec sources 1280/2560 px, priorité haute ; photos des secteurs et portrait en chargement différé. Aucun nouveau visuel nécessaire.
- La page actuelle utilise Playfair Display + **DM Sans**, et non Inter. Ces polices sont conservées pour respecter la charte effectivement validée et les dimensions des cartes. Leur remplacement constituerait une autre modification.
- Le simulateur actuel n’a pas de photo, et l’accueil ne comporte pas de schéma multi-agents ni de galerie d’articles. Aucun bloc absent n’est inventé ou ajouté.

**Conclusion :** une expérience 2.5D légère est possible sans refonte. Une photographie plane ne permet pas de révéler des angles cachés ni de produire une véritable visite volumétrique. L’illusion choisie repose sur des plans photographiques rigides, des rapprochements et des différences de vitesse entre photos, lumière discrète et textes.

## Direction artistique

Un parcours calme, inspiré d’un film de marque hôtelier : entrée dans le lieu, présentation des savoir-faire, découverte des univers métier, réassurance humaine, rencontre avec la fondatrice, puis invitation à échanger. Les scènes suivent **l’ordre commercial existant**, même lorsqu’il diffère de l’ordre illustratif du brief.

Aucun cube, néon, rotation de carte, distorsion de l’eau, des visages ou des mains. La photographie reste entière ; le cadre masque seulement les quelques pixels nécessaires au mouvement. Un voile lumineux très discret utilise les couleurs champagne et bleu nuit déjà présentes. Les textes se stabilisent avant d’entrer dans la zone principale de lecture.

## Storyboard complet

Les amplitudes mobiles représentent 55 % des amplitudes desktop, et les amplitudes tablette 75 %. Ce sont des mouvements au défilement, sans lecture automatique ni durée imposée. Le retour en arrière retrouve le même état.

| Séquence réelle | Visuel / contenu conservé | Mise en scène et transition | Ordinateur | Tablette portrait et paysage | Smartphone | Coût potentiel |
|---|---|---|---|---|---|---|
| 1. Ouverture | Comptoir, jardin et mur d’eau du header | Lent rapprochement du plan photographique sous le voile bleu nuit immobile ; textes et CTA stables | Perspective CSS 1200 px, avance jusqu’à 25 px en profondeur, léger travelling vertical | Mouvement raccourci, source responsive existante | Cadrage vertical existant à droite, mouvement conservé à 55 %, aucun texte entraîné | Une image déjà chargée ; transformation de composition |
| 2. Bénéfices | Quatre pictogrammes et promesses | Élévation et apparition très courtes à l’entrée dans l’écran | Progression selon la position des éléments | Identique, amplitude réduite | Arrivée successive dans la mise en page verticale | Quelques variables CSS |
| 3. Croissance et performance | Les trois familles et toutes leurs cartes | Titres puis cartes entrent dans le champ ; contenu fixe une fois à hauteur de lecture | Profondeur par plans de lecture, sans inclinaison des cartes | Grille existante conservée | Progression carte par carte | Aucun média ni rendu 3D ajouté |
| 4. Simulateur | Curseur, estimation, bouton et textes | Apparition des colonnes à l’entrée ; interaction libre | Mouvement bref | Adaptation aux colonnes existantes | Mouvement plus court ; curseur disponible | Aucun calcul du simulateur modifié |
| 5a. Médecine esthétique | Photo du chirurgien | Rapprochement précis et léger déplacement vertical ; texte sur plan séparé | Zoom très discret, aucune rotation | Même cadre 6/7, amplitude réduite | Cadre existant 4/3 ; gestes et visage non déformés | Photo existante, pas de texture supplémentaire |
| 5b. Spa hôtelier | Photo de la piscine intérieure | Travelling avant vers l’architecture, lumière de premier plan discrète | Perspective 1000 px, profondeur jusqu’à 65 px | Profondeur jusqu’à 48,75 px | Profondeur jusqu’à 35,75 px ; travelling lié au défilement tactile natif | Une transformation et un dégradé |
| 5c. Thalasso | Photo du bain extérieur | Glissement diagonal très court et avancée douce | 12 px horizontaux / 16 px verticaux au maximum sur le parcours complet | Amplitude de 75 % | Amplitude de 55 %, sans ondulation artificielle | Aucun shader |
| 5d. Institut | Photo du soin visage | Rapprochement progressif autour du geste | Zoom de 2,5 à 9,5 %, pas de rotation | Zoom réduit | Rapprochement conservé, plus court | Aucun maillage ni déformation |
| 6. Contrôle humain | Trois cartes de réassurance | Fin trait champagne à l’entrée du chapitre, titres et cartes se posent | Arrivée douce | Même logique dans la grille existante | Parcours vertical sans épinglage | Transformations courtes |
| 7. Offre | Deux audits et leurs livrables | Arrivée des titres puis des deux cartes | Déplacement vertical limité à 14 px | Limité à 10,5 px | Limité à 7,7 px | Aucun changement de tailles ni de liens |
| 8. Fondatrice | Portrait, expérience, signature, certifications | Portrait légèrement rapproché, texte sur un autre plan ; compteur existant conservé | Zoom maximal 3,5 %, trait champagne discret | Zoom réduit | Portrait toujours animé ; aucune modification du visage | Une photo déjà existante |
| 9. FAQ | Dix questions et réponses | Arrivée douce des lignes ; réponses ouvertes immobiles | Texte stabilisé en haut du champ | Identique | Aucune animation de hauteur, aucun blocage de l’accordéon | Calcul actualisé lors de l’ouverture |
| 10. Invitation finale | Titre et deux CTA existants | Dernier trait champagne, apparition courte des contenus | Lecture et boutons stables | Idem | Boutons pleine largeur préservés | Pas de média |
| 11. Footer | Logo, coordonnées, liens et mentions | Dernière transition légère sur les colonnes et mentions | Fin de parcours naturelle | Colonnes existantes | Version compacte existante | Ajout d’un bouton accessible de réduction des animations |

## Choix techniques et coûts

CSS `transform`, `perspective`, propriété individuelle `translate`, `requestAnimationFrame`, `IntersectionObserver` et `ResizeObserver`. Aucun paquet, CDN, Three.js, GSAP, vidéo ou service de génération ajouté ; aucune licence commerciale supplémentaire à acheter. Les licences des polices déjà présentes restent inchangées (`assets/fonts/*OFL*`, `*LICENSE*`).

Le rendu travaille uniquement sur les sections proches de l’écran. Les lectures géométriques sont regroupées avant les écritures CSS. Pas de boucle continue au repos : une image est calculée en réponse au défilement, à un changement de taille ou à une ouverture d’accordéon. `will-change` est limité aux photos des scènes proches. Aucune interception de `wheel`, `touchmove` ou des touches, aucun `preventDefault`, aucun scroll forcé, aucun écran épinglé.

La préférence système `prefers-reduced-motion` désactive les mouvements. Un bouton discret dans le footer permet aussi de les réduire, avec mémorisation locale. Si JavaScript est absent, l’accueil original reste visible et utilisable ; les animations ne sont qu’un enrichissement.

## Périmètre du diff

- `index.html` : uniquement le chargement des deux nouveaux fichiers.
- `css/home-cinema.css` : règles exclusivement appliquées à l’accueil.
- `js/home-cinema.js` : progression, adaptation aux tailles, cadres de recadrage des photos et contrôle de mouvement.
- `docs/accueil-cinema.md` : diagnostic, storyboard et rapport.

Les cadres photographiques sont des éléments ajoutés par le script pour empêcher les images animées de déborder sur les textes. Leur ratio est celui de la page originale : 6/7, puis 4/3 sous 600 px. Le bouton de mouvement est le seul nouveau contrôle visible, ajouté sous les liens du footer. Aucun autre HTML, CSS partagé, contenu, photo, lien, URL, H1, H2, donnée structurée, menu, FAQ ou autre page n’est édité.

## Rapport de tests

Les résultats effectivement observés sont consignés ci-dessous après exécution des contrôles. Les essais réalisés dans Chromium restent des essais de navigateur ; ils ne constituent pas des tests sur appareils Android, iPhone ou iPad physiques. Aucun de ces appareils n’est disponible dans cet environnement. La validation tactile matérielle et l’appréciation artistique finale restent à faire sur le smartphone de Mag.
