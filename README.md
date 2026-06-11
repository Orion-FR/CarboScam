# CarboScam

> Le simulateur *officiel\** de la tonte fiscale automobile française.
> \*pas du tout officiel, mais les barèmes le sont. Hélas.

**👉 [carboscam en ligne](carboscam.paulrobain.fr)**

Calculez en 10 secondes combien l'État va vous réclamer à l'immatriculation :

- **Malus CO2** — barèmes officiels gramme par gramme, **2015 → 2026** (NEDC et WLTP, y compris les bascules de mars 2020 et mars 2025)
- **Malus au poids** — barèmes 2022 → 2026, abattements hybrides / PHEV / familles nombreuses, plafonnement cumulé
- **Carte grise** — tarif 2026 du cheval fiscal des 18 régions, demi-tarif +10 ans, taxes fixes
- **Imports d'occasion** — barème de l'année de 1ʳᵉ immatriculation + coefficient forfaitaire de décote (règle de mars 2025) + coefficient d'usage kilométrique
- **Recherche de véhicules** — autocomplétion via l'API ouverte [ADEME Car Labelling](https://data.ademe.fr/datasets/ademe-car-labelling) (CO2, masse, CV, énergie et prix pré-remplis)

## Stack

HTML + CSS + JS vanilla, zéro dépendance, zéro build, zéro cookie. 100 % statique,
hébergé sur GitHub Pages. Tout le calcul se fait dans votre navigateur.

```bash
# développement local
python3 -m http.server 4173
```

## Sources

Barèmes extraits de [service-public.gouv.fr](https://www.service-public.gouv.fr/particuliers/vosdroits/F35947)
(archives par année), economie.gouv.fr et loi de finances 2026. À jour : juin 2026.

⚠️ Simulation indicative — pas un conseil fiscal. Vérifiez avant d'acheter.

## Licence

MIT — voir [LICENSE](LICENSE).
