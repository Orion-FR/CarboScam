/* =========================================================================
 * CarboScam — Données fiscales officielles
 * ========================================================================= */

// ---- Séquence de montants NEDC 2017/2018 (au gramme, à partir du seuil) ----
const SEQ_NEDC = [
  50, 53, 60, 73, 90, 113, 140, 173, 210, 253,
  300, 353, 410, 473, 540, 613, 690, 773, 860, 953,
  1050, 1153, 1260, 1373, 1490, 1613, 1740, 1873, 2010, 2153,
  2300, 2453, 2610, 2773, 2940, 3113, 3290, 3473, 3660, 3853,
  4050, 4253, 4460, 4673, 4890, 5113, 5340, 5573, 5810, 6053,
  6300, 6553, 6810, 7073, 7340, 7613, 7890, 8173, 8460, 8753,
  9050, 9353, 9660, 9973, 10290
];

// ---- Barème 2019 (NEDC, table spécifique avec paliers adoucis) ----
const SEQ_2019 = [
  35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
  85, 90, 113, 140, 173, 210, 253, 300, 353, 410,
  473, 540, 613, 690, 773, 860, 953, 1050, 1101, 1153,
  1260, 1373, 1490, 1613, 1740, 1873, 2010, 2153, 2300, 2453,
  2610, 2773, 2940, 3113, 3290, 3473, 3660, 3756, 3853, 4050,
  4253, 4460, 4673, 4890, 5113, 5340, 5573, 5810, 6053, 6300,
  6553, 6810, 7073, 7340, 7613, 7890, 8173, 8460, 8753, 9050,
  9353, 9660, 9973, 10290
];

// ---- Séquence WLTP 2020–2023 (et NEDC janv–fév 2020) ----
const SEQ_WLTP_OLD = [
  50, 75, 100, 125, 150, 170, 190, 210, 230, 240,
  260, 280, 310, 330, 360, 400, 450, 540, 650, 740,
  818, 898, 983, 1074, 1172, 1276, 1386, 1504, 1629, 1761,
  1901, 2049, 2205, 2370, 2544, 2726, 2918, 3119, 3331, 3552,
  3784, 4026, 4279, 4543, 4818, 5105, 5404, 5715, 6039, 6375,
  6724, 7086, 7462, 7851, 8254, 8671, 9103, 9550, 10011, 10488,
  10980, 11488, 12012, 12552, 13109, 13682, 14273, 14881, 15506, 16149,
  16810, 17490, 18188, 18905, 19641, 20396, 21171, 21966, 22781, 23616,
  24472, 25349, 26247, 27166, 28107, 29070, 30056, 31063, 32094, 33147,
  34224, 35324, 36447, 37595, 38767, 39964, 41185, 42431, 43703, 45000,
  46323, 47672, 49047
];

// ---- Séquence WLTP 2024+ (progression durcie au-delà de 5 715 €) ----
const SEQ_WLTP_NEW = [
  50, 75, 100, 125, 150, 170, 190, 210, 230, 240,
  260, 280, 310, 330, 360, 400, 450, 540, 650, 740,
  818, 898, 983, 1074, 1172, 1276, 1386, 1504, 1629, 1761,
  1901, 2049, 2205, 2370, 2544, 2726, 2918, 3119, 3331, 3552,
  3784, 4026, 4279, 4543, 4818, 5105, 5404, 5715, 6126, 6637,
  7248, 7959, 8770, 9681, 10692, 11803, 13014, 14325, 15736, 17247,
  18858, 20569, 22380, 24291, 26302, 28413, 30624, 32935, 35346, 37857,
  40468, 43179, 45990, 48901, 51912, 55023, 58134, 61245, 64356, 67467,
  70578, 73689, 76800, 79911
];

// ---- Barème 2014–2016 (par tranches) ----
const BRACKETS_2014_2016 = [
  [131, 135, 150], [136, 140, 250], [141, 145, 500], [146, 150, 900],
  [151, 155, 1600], [156, 175, 2200], [176, 180, 3000], [181, 185, 3600],
  [186, 190, 4000], [191, 200, 6500], [201, Infinity, 8000]
];

/* Chaque barème CO2 : { seuil, seq, plafond } ou { brackets }
 * Le montant = seq[g - seuil], plafonné à `plafond`. */
const BAREMES_CO2 = {
  '2014-2016': { brackets: BRACKETS_2014_2016, plafond: 8000 },
  '2017':      { seuil: 127, seq: SEQ_NEDC,     plafond: 10000 },
  '2018':      { seuil: 120, seq: SEQ_NEDC,     plafond: 10500 },
  '2019':      { seuil: 117, seq: SEQ_2019,     plafond: 10500 },
  '2020-nedc': { seuil: 110, seq: SEQ_WLTP_OLD, plafond: 20000 }, // janv–fév 2020
  '2020':      { seuil: 138, seq: SEQ_WLTP_OLD, plafond: 20000 }, // mars+ 2020 (WLTP)
  '2021':      { seuil: 133, seq: SEQ_WLTP_OLD, plafond: 30000 },
  '2022':      { seuil: 128, seq: SEQ_WLTP_OLD, plafond: 40000 },
  '2023':      { seuil: 123, seq: SEQ_WLTP_OLD, plafond: 50000 },
  '2024':      { seuil: 118, seq: SEQ_WLTP_NEW, plafond: 60000 }, // + janv–fév 2025
  '2025':      { seuil: 113, seq: SEQ_WLTP_NEW, plafond: 70000 }, // mars+ 2025
  '2026':      { seuil: 108, seq: SEQ_WLTP_NEW, plafond: 80000 }
};

/* Malus masse : bornes de tranches (kg) + tarif marginal €/kg au-delà de
 * chaque borne. Inexistant avant 2022. */
const BAREMES_MASSE = {
  2022: { bounds: [1800], rates: [10] },
  2023: { bounds: [1800], rates: [10] },
  2024: { bounds: [1600, 1800, 1900, 2000, 2100], rates: [10, 15, 20, 25, 30] },
  2025: { bounds: [1600, 1800, 1900, 2000, 2100], rates: [10, 15, 20, 25, 30] },
  2026: { bounds: [1500, 1700, 1800, 1900, 2000], rates: [10, 15, 20, 25, 30] }
};

/* Coefficient forfaitaire de décote (occasion importée, depuis mars 2025).
 * [ancienneté max en mois, % de réfaction] — mois entamés. */
const DECOTE_IMPORT = [
  [3, 3], [6, 6], [9, 9], [12, 12], [18, 16], [24, 20], [36, 28],
  [48, 33], [60, 38], [72, 43], [84, 48], [96, 53], [108, 58],
  [120, 64], [132, 70], [144, 76], [156, 82], [168, 88], [180, 94],
  [Infinity, 100]
];

/* Réfaction supplémentaire « coefficient d'usage » (km moyens annuels). */
const COEF_USAGE = [
  [20000, 0], [25000, 1], [30000, 1.5], [35000, 2],
  [40000, 2.5], [45000, 3], [Infinity, 3.5]
];

/* Tarif du cheval fiscal 2026 par région (taxe Y1).
 * elec : multiplicateur appliqué aux électriques/hydrogène (1 = plein tarif). */
const REGIONS = {
  'auvergne-rhone-alpes':   { nom: 'Auvergne-Rhône-Alpes',      cv: 43.00, elec: 1 },
  'bourgogne-franche-comte':{ nom: 'Bourgogne-Franche-Comté',   cv: 60.00, elec: 1 },
  'bretagne':               { nom: 'Bretagne',                  cv: 60.00, elec: 1 },
  'centre-val-de-loire':    { nom: 'Centre-Val de Loire',       cv: 60.00, elec: 1 },
  'corse':                  { nom: 'Corse',                     cv: 53.00, elec: 1 },
  'grand-est':              { nom: 'Grand Est',                 cv: 60.00, elec: 1 },
  'hauts-de-france':        { nom: 'Hauts-de-France',           cv: 42.00, elec: 0.5 },
  'ile-de-france':          { nom: 'Île-de-France',             cv: 68.95, elec: 1 },
  'normandie':              { nom: 'Normandie',                 cv: 60.00, elec: 1 },
  'nouvelle-aquitaine':     { nom: 'Nouvelle-Aquitaine',        cv: 58.00, elec: 1 },
  'occitanie':              { nom: 'Occitanie',                 cv: 59.50, elec: 1 },
  'pays-de-la-loire':       { nom: 'Pays de la Loire',          cv: 51.00, elec: 1 },
  'paca':                   { nom: 'Provence-Alpes-Côte d\'Azur', cv: 60.00, elec: 1 },
  'guadeloupe':             { nom: 'Guadeloupe',                cv: 41.00, elec: 1 },
  'guyane':                 { nom: 'Guyane',                    cv: 42.50, elec: 1 },
  'la-reunion':             { nom: 'La Réunion',                cv: 60.00, elec: 1 },
  'martinique':             { nom: 'Martinique',                cv: 53.00, elec: 1 },
  'mayotte':                { nom: 'Mayotte',                   cv: 30.00, elec: 1 }
};

const TAXE_FIXE = 11;        // Y4 — taxe fixe de gestion
const REDEVANCE = 2.76;      // Y5 — redevance d'acheminement

const ADEME_API = 'https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines';
