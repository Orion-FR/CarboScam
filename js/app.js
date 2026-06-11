/* =========================================================================
 * CarboScam — Logique de calcul + interface
 * ========================================================================= */
'use strict';

const $ = (sel) => document.querySelector(sel);
const eur = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 });

/* ------------------------------------------------------------------ */
/*  Sélection du barème CO2 selon la date de 1re immatriculation       */
/* ------------------------------------------------------------------ */
function baremeCO2PourDate(annee, mois) {
  if (annee <= 2016) return BAREMES_CO2['2014-2016'];
  if (annee === 2020) return mois < 3 ? BAREMES_CO2['2020-nedc'] : BAREMES_CO2['2020'];
  if (annee === 2025) return mois < 3 ? BAREMES_CO2['2024'] : BAREMES_CO2['2025'];
  if (annee >= 2026) return BAREMES_CO2['2026'];
  return BAREMES_CO2[String(annee)];
}

function montantCO2(bareme, co2) {
  co2 = Math.round(co2);
  if (bareme.brackets) {
    for (const [lo, hi, m] of bareme.brackets) {
      if (co2 >= lo && co2 <= hi) return m;
    }
    return 0;
  }
  if (co2 < bareme.seuil) return 0;
  const idx = co2 - bareme.seuil;
  if (idx >= bareme.seq.length) return bareme.plafond;
  return Math.min(bareme.seq[idx], bareme.plafond);
}

/* ------------------------------------------------------------------ */
/*  Malus masse                                                        */
/* ------------------------------------------------------------------ */
function montantMasse(annee, masse) {
  const b = BAREMES_MASSE[Math.min(Math.max(annee, 0), 2026)];
  if (annee < 2022 || !b) return 0;
  let total = 0;
  for (let i = 0; i < b.bounds.length; i++) {
    const lo = b.bounds[i];
    const hi = i + 1 < b.bounds.length ? b.bounds[i + 1] : Infinity;
    if (masse > lo) total += b.rates[i] * (Math.min(masse, hi) - lo);
  }
  return total;
}

/* ------------------------------------------------------------------ */
/*  Décote import (mois entamés) + coefficient d'usage                 */
/* ------------------------------------------------------------------ */
function moisEntames(annee, mois) {
  const now = new Date();
  return (now.getFullYear() - annee) * 12 + (now.getMonth() + 1 - mois) + 1;
}

function tauxDecote(nbMois) {
  for (const [max, pct] of DECOTE_IMPORT) if (nbMois <= max) return pct;
  return 100;
}

function tauxUsage(kmAnnuels) {
  for (const [max, pct] of COEF_USAGE) if (kmAnnuels <= max) return pct;
  return 3.5;
}

/* ------------------------------------------------------------------ */
/*  Calcul complet                                                     */
/* ------------------------------------------------------------------ */
function calculer(p) {
  const lignes = [];
  const notes = [];
  const neuf = p.type === 'neuf';
  const annee = neuf ? 2026 : p.annee;
  const mois = neuf ? 6 : p.mois;
  const elec = p.energie === 'electrique' || p.energie === 'hydrogene';

  // ---------- Malus CO2 ----------
  let co2Retenu = p.co2;
  if (p.energie === 'e85' && p.co2 <= 250) {
    co2Retenu = Math.round(p.co2 * 0.6);
    notes.push('Superéthanol E85 : abattement de 40 % sur le CO2 retenu (' + co2Retenu + ' g/km).');
  }
  if (p.enfants >= 3) {
    co2Retenu = Math.max(0, co2Retenu - 20 * p.enfants);
    notes.push('Famille nombreuse (' + p.enfants + ' enfants) : −20 g/km par enfant, soit ' + co2Retenu +
      ' g/km retenus (remboursement à demander après immatriculation, véhicule d\'au moins 5 places).');
  }

  let malusCO2 = 0;
  let malusMasse = 0;

  if (elec) {
    notes.push('Véhicule électrique/hydrogène : exonéré de malus CO2 et de malus au poids.');
  } else if (!neuf && (annee < 2015)) {
    notes.push('Première immatriculation avant le 1er janvier 2015 : aucun malus dû à l\'import. Champagne.');
  } else {
    const bareme = baremeCO2PourDate(annee, mois);
    malusCO2 = montantCO2(bareme, co2Retenu);

    // ---------- Malus masse ----------
    let masseRetenue = p.masse;
    if (p.energie === 'hybride') {
      masseRetenue = Math.max(0, masseRetenue - 100);
      notes.push('Hybride : abattement de 100 kg sur la masse retenue (' + masseRetenue + ' kg).');
    } else if (p.energie === 'phev') {
      if (annee >= 2022 && annee <= 2024) {
        masseRetenue = 0;
        notes.push('Hybride rechargeable immatriculé ' + annee + ' : exonéré de malus masse (autonomie électrique > 50 km supposée).');
      } else {
        const abatt = Math.min(200, Math.round(p.masse * 0.15));
        masseRetenue = Math.max(0, masseRetenue - abatt);
        notes.push('Hybride rechargeable : abattement de ' + abatt + ' kg (max 200 kg ou 15 % de la masse).');
      }
    }
    if (p.enfants >= 3 && masseRetenue > 0) {
      masseRetenue = Math.max(0, masseRetenue - 200 * p.enfants);
      notes.push('Famille nombreuse : −200 kg par enfant sur la masse retenue (' + masseRetenue + ' kg).');
    }
    malusMasse = montantMasse(annee, masseRetenue);
    if (annee < 2022 && !neuf) {
      notes.push('Malus au poids inexistant avant 2022 : non applicable à ce véhicule.');
    }

    // ---------- Plafonnement cumulé ----------
    const plafond = baremeCO2PourDate(annee, mois).plafond;
    if (malusCO2 + malusMasse > plafond) {
      malusMasse = Math.max(0, plafond - malusCO2);
      notes.push('Plafonnement : le cumul CO2 + poids est limité à ' + eur(plafond) + '.');
    }

    // ---------- Décote import ----------
    if (!neuf) {
      const nbMois = moisEntames(annee, mois);
      let refaction = tauxDecote(nbMois);
      const usage = p.km > 0 ? tauxUsage(p.km) : 0;
      if (usage > 0) {
        notes.push('Coefficient d\'usage (' + p.km.toLocaleString('fr-FR') + ' km/an) : réfaction supplémentaire de ' + usage + ' %.');
      }
      refaction = Math.min(100, refaction + usage);
      notes.push('Occasion importée : barème ' + (annee === 2020 && mois < 3 ? 'janv.–févr. 2020' :
        annee === 2025 && mois < 3 ? '2024 (janv.–févr. 2025)' : annee) +
        ' puis décote de ' + refaction + ' % (' + nbMois + ' mois entamés).');
      malusCO2 = Math.round(malusCO2 * (1 - refaction / 100));
      malusMasse = Math.round(malusMasse * (1 - refaction / 100));
    }
  }

  lignes.push({ label: 'Malus CO2 (Y3)', montant: malusCO2 });
  lignes.push({ label: 'Malus au poids', montant: malusMasse });

  // ---------- Carte grise ----------
  const region = REGIONS[p.region];
  const ageAns = neuf ? 0 : (new Date().getFullYear() - annee);
  let tauxCV = region.cv;
  let demiTarif = false;
  if (!neuf && ageAns > 10) { tauxCV /= 2; demiTarif = true; }
  let multElec = 1;
  if (elec && region.elec < 1) {
    multElec = region.elec;
    notes.push(region.nom + ' : réduction de ' + Math.round((1 - region.elec) * 100) + ' % de la taxe régionale pour les électriques.');
  } else if (elec) {
    notes.push('Depuis 2025, ' + region.nom + ' ne fait plus de cadeau aux électriques : taxe régionale plein pot.');
  }
  if (demiTarif) notes.push('Véhicule de plus de 10 ans : taxe régionale à demi-tarif.');

  const y1 = Math.round(p.cv * tauxCV * multElec);
  lignes.push({ label: 'Taxe régionale (Y1) — ' + p.cv + ' CV × ' + (tauxCV * multElec).toLocaleString('fr-FR') + ' €', montant: y1 });
  lignes.push({ label: 'Taxe fixe (Y4)', montant: TAXE_FIXE });
  lignes.push({ label: 'Redevance d\'acheminement (Y5)', montant: REDEVANCE });

  const total = lignes.reduce((s, l) => s + l.montant, 0);
  return { lignes, notes, total, malus: malusCO2 + malusMasse, carteGrise: y1 + TAXE_FIXE + REDEVANCE };
}

/* ------------------------------------------------------------------ */
/*  Verdict humoristique                                               */
/* ------------------------------------------------------------------ */
function verdict(total, prix) {
  let v;
  if (total < 200) v = ['Miracle républicain', 'L\'État vous a presque oublié. Ne faites pas de bruit en sortant.'];
  else if (total < 1000) v = ['Tonte légère', 'Un simple pourboire citoyen. La laine repoussera.'];
  else if (total < 5000) v = ['Tonte réglementaire', 'Bercy vous remercie pour votre contribution volontaire (enfin, presque).'];
  else if (total < 15000) v = ['Partenariat public-privé', 'Vous achetez la voiture, l\'État s\'achète des idées.'];
  else if (total < 40000) v = ['Mécène d\'infrastructure', 'Félicitations, vous venez d\'offrir un demi rond-point à la nation.'];
  else v = ['Légion d\'honneur fiscale', 'À ce niveau, exigez au minimum une plaque commémorative sur l\'A86.'];

  let taux = '';
  if (prix > 0) {
    const pct = (total / prix) * 100;
    taux = 'Taux officiel d\'arnaque : <strong>' + pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) +
      ' %</strong> du prix du véhicule part en taxes.';
  }
  const radars = total / 40000;
  const equiv = radars >= 0.5
    ? 'Soit ' + radars.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' radar(s) tourelle flambant neuf(s). Merci pour eux.'
    : total >= 90 ? 'Soit ' + Math.round(total / 90) + ' plein(s) de SP95-E10. Sans les points de fidélité.' : '';
  return { titre: v[0], texte: v[1], taux, equiv };
}

/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */
function lireFormulaire() {
  return {
    type: $('#type-import').checked ? 'import' : 'neuf',
    annee: parseInt($('#annee').value, 10),
    mois: parseInt($('#mois').value, 10),
    co2: parseFloat($('#co2').value) || 0,
    masse: parseFloat($('#masse').value) || 0,
    cv: parseInt($('#cv').value, 10) || 1,
    energie: $('#energie').value,
    region: $('#region').value,
    enfants: parseInt($('#enfants').value, 10) || 0,
    km: parseInt($('#km').value, 10) || 0,
    prix: parseFloat($('#prix').value) || 0
  };
}

function afficher(res, prix) {
  const zone = $('#resultats');
  zone.hidden = false;

  $('#total-amount').textContent = eur(res.total);
  const v = verdict(res.total, prix);
  $('#verdict-titre').textContent = v.titre;
  $('#verdict-texte').innerHTML = v.texte +
    (v.taux ? '<br>' + v.taux : '') + (v.equiv ? '<br>' + v.equiv : '');

  $('#detail').innerHTML = res.lignes.map(l =>
    '<div class="ligne"><span>' + l.label + '</span><span>' + eur(l.montant) + '</span></div>'
  ).join('') +
    '<div class="ligne total-ligne"><span>Total de la douloureuse</span><span>' + eur(res.total) + '</span></div>';

  $('#notes').innerHTML = res.notes.length
    ? '<ul>' + res.notes.map(n => '<li>' + n + '</li>').join('') + '</ul>' : '';

  zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ------------------------------------------------------------------ */
/*  Recherche ADEME (véhicules neufs du catalogue Car Labelling)       */
/* ------------------------------------------------------------------ */
let searchTimer = null;
let searchAbort = null;

function mapEnergie(e) {
  e = (e || '').toUpperCase();
  if (e.includes('ELEC') && !e.includes('ESS') && !e.includes('GAZ')) return 'electrique';
  if (e.includes('HYDRO')) return 'hydrogene';
  if (e.includes('RECHARGEABLE') || e.includes('HR')) return 'phev';
  if (e.includes('HYBRID') || (e.includes('ELEC') && (e.includes('ESS') || e.includes('GAZ')))) return 'hybride';
  if (e.includes('ETHANOL') || e.includes('E85')) return 'e85';
  if (e.includes('GAZOLE') || e.includes('DIESEL')) return 'diesel';
  return 'essence';
}

async function chercherVehicule(q) {
  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();
  const select = ['Marque', 'Modèle', 'Description_Commerciale', 'CO2_vitesse_mixte_Max',
    'Masse_OM_Max', 'Puissance_fiscale', 'Energie', 'Prix_véhicule', 'Type_de_boite']
    .map(encodeURIComponent).join(',');
  const url = ADEME_API + '?q=' + encodeURIComponent(q) + '&size=40&select=' + select;
  const r = await fetch(url, { signal: searchAbort.signal });
  if (!r.ok) throw new Error('API ADEME indisponible');
  const results = (await r.json()).results || [];
  const vus = new Set();
  const uniques = [];
  for (const it of results) {
    const sig = [
      it['Marque'],
      it['Description_Commerciale'] || it['Modèle'],
      it['CO2_vitesse_mixte_Max'] != null ? Math.round(it['CO2_vitesse_mixte_Max']) : '?',
      it['Masse_OM_Max'] != null ? Math.round(it['Masse_OM_Max']) : '?',
      it['Puissance_fiscale'], it['Energie']
    ].join('|');
    if (vus.has(sig)) continue;
    vus.add(sig);
    uniques.push(it);
    if (uniques.length >= 8) break;
  }
  return uniques;
}

function afficherSuggestions(items) {
  const box = $('#suggestions');
  if (!items.length) {
    box.innerHTML = '<div class="sugg-vide">Aucun résultat — véhicule trop exotique ou trop vieux pour le catalogue ADEME. Saisissez les infos à la main.</div>';
    box.hidden = false;
    return;
  }
  box.innerHTML = items.map((it, i) => {
    const co2 = it['CO2_vitesse_mixte_Max'];
    const masse = it['Masse_OM_Max'];
    return '<button type="button" class="sugg" data-i="' + i + '">' +
      '<strong>' + it['Marque'] + ' ' + (it['Description_Commerciale'] || it['Modèle']) + '</strong>' +
      '<small>' + (co2 != null ? Math.round(co2) + ' g/km' : '? g/km') + ' · ' +
      (masse != null ? Math.round(masse) + ' kg' : '? kg') + ' · ' +
      (it['Puissance_fiscale'] || '?') + ' CV · ' + (it['Energie'] || '') +
      (it['Type_de_boite'] ? ' · ' + it['Type_de_boite'] : '') + '</small></button>';
  }).join('');
  box.hidden = false;
  box.querySelectorAll('.sugg').forEach(btn => {
    btn.addEventListener('click', () => {
      const it = items[parseInt(btn.dataset.i, 10)];
      if (it['CO2_vitesse_mixte_Max'] != null) $('#co2').value = Math.round(it['CO2_vitesse_mixte_Max']);
      if (it['Masse_OM_Max'] != null) $('#masse').value = Math.round(it['Masse_OM_Max']);
      if (it['Puissance_fiscale'] != null) $('#cv').value = it['Puissance_fiscale'];
      if (it['Prix_véhicule'] != null) $('#prix').value = it['Prix_véhicule'];
      $('#energie').value = mapEnergie(it['Energie']);
      $('#recherche').value = it['Marque'] + ' ' + (it['Description_Commerciale'] || it['Modèle']);
      box.hidden = true;
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Initialisation                                                     */
/* ------------------------------------------------------------------ */
function init() {
  // Régions
  $('#region').innerHTML = Object.entries(REGIONS)
    .map(([k, r]) => '<option value="' + k + '">' + r.nom + ' — ' + r.cv.toLocaleString('fr-FR') + ' €/CV</option>')
    .join('');
  $('#region').value = 'ile-de-france';

  // Années
  const now = new Date().getFullYear();
  const annees = [];
  for (let y = now; y >= 2000; y--) annees.push('<option value="' + y + '">' + y + '</option>');
  $('#annee').innerHTML = annees.join('');
  $('#annee').value = String(now - 3);

  // Bascule neuf / import
  const majType = () => {
    const imp = $('#type-import').checked;
    $('#bloc-import').hidden = !imp;
    $('#hint-recherche').textContent = imp
      ? 'Le catalogue ADEME ne couvre que les modèles récents : pour un import plus ancien, remplissez à la main (valeurs du COC / carte grise étrangère).'
      : 'Tapez un modèle pour pré-remplir CO2, poids, CV et prix depuis la base officielle ADEME.';
  };
  $('#type-neuf').addEventListener('change', majType);
  $('#type-import').addEventListener('change', majType);
  majType();

  // Recherche ADEME
  $('#recherche').addEventListener('input', (e) => {
    const q = e.target.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 2) { $('#suggestions').hidden = true; return; }
    searchTimer = setTimeout(async () => {
      try { afficherSuggestions(await chercherVehicule(q)); }
      catch (err) { if (err.name !== 'AbortError') $('#suggestions').hidden = true; }
    }, 250);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.recherche-wrap')) $('#suggestions').hidden = true;
  });

  // Calcul
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = lireFormulaire();
    if (!p.co2 && !['electrique', 'hydrogene'].includes(p.energie)) {
      alert('Renseignez les émissions de CO2 (ou choisissez électrique/hydrogène).');
      return;
    }
    afficher(calculer(p), p.prix);
  });
}

document.addEventListener('DOMContentLoaded', init);
