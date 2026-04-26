/**
 * API Module — Local-First with Internet Crop Data
 * Fetches live crops from GrowStuff API, falls back to local engine.
 * Score is ALWAYS calculated from real farm conditions — never random.
 */

import { calculateSuitability, getDetailedEnrichment, normalizeSoilName } from './engine.js';

// ─── Market Insight Generator ─────────────────────────────────────────────────

function getMarketInsight(cropName) {
    const n = (cropName || '').toLowerCase();
    if (n.includes('rice'))                             return 'Stable MSP-backed demand; government procurement active. Export quotas impact price in Oct–Jan.';
    if (n.includes('wheat'))                            return 'Strong domestic flour mill demand. Rabi harvest glut in Apr–May; prices recover by Aug.';
    if (n.includes('tomato'))                           return 'High urban demand, volatile pricing. Summer scarcity drives 3–5× price spikes in May–Jun.';
    if (n.includes('potato'))                           return 'Cold-storage arbitrage profitable. Oct–Dec peak demand; processing industry expanding rapidly.';
    if (n.includes('onion'))                            return 'Export-driven with high volatility. South Asian and Middle East export demand spikes Nov–Feb.';
    if (n.includes('maize') || n.includes('corn'))      return 'Poultry feed demand growing 12% YoY. Ethanol blending policy boosts long-term price floor.';
    if (n.includes('soybean') || n.includes('soya'))    return 'Oilseed crushing industry high-demand. Protein meal export to SE Asia growing strongly.';
    if (n.includes('cotton'))                           return 'Textile mill demand stable; Bt-cotton variety market prices tracked by MCX futures.';
    if (n.includes('sugarcane'))                        return 'Guaranteed FRP pricing by government. Ethanol mandate creating additional mill-gate demand.';
    if (n.includes('mango'))                            return 'Premium export variety (Alphonso, Kesar) earns 40% more. Cold-chain infrastructure improving.';
    if (n.includes('banana'))                           return 'Year-round urban retail demand. Cavendish variety dominates; organic premium segment growing.';
    if (n.includes('cucumber'))                         return 'Peak summer salad demand in urban areas. Hotel and restaurant supply chains pay 20% premium.';
    if (n.includes('pepper') || n.includes('capsicum')) return 'Color capsicum (red/yellow) earns 3× green variety. Supermarket and export channels lucrative.';
    if (n.includes('spinach') || n.includes('lettuce') || n.includes('kale')) return 'Niche healthy-eating market growing 15% YoY. High-value restaurant and urban delivery demand.';
    if (n.includes('herb') || n.includes('coriander') || n.includes('basil')) return 'Niche herb market — premium restaurant and organic grocery demand. Short cycle allows 4–5 rotations/year.';
    if (n.includes('pea') || n.includes('lentil') || n.includes('chickpea')) return 'Import substitution policy supports domestic prices. Health-food segment driving premium for certified organic.';
    if (n.includes('sunflower') || n.includes('mustard') || n.includes('groundnut')) return 'Edible oil deficit drives steady government procurement. Crushing industry provides assured offtake at harvest.';
    if (n.includes('grape') || n.includes('strawberry') || n.includes('pomegranate')) return 'Export potential high. Cold-chain logistics critical; pack-house proximity significantly impacts final price.';
    return 'Steady regional mandi demand. Explore FPO aggregation for 15–25% better farmgate pricing and direct buyer access.';
}

// ─── Crop Knowledge Base ──────────────────────────────────────────────────────
// pH optimal ranges, compatible soils, ideal seasons, and typical net income/acre.
// Source: ICAR / FAO crop data, mirrors engine.js CORE_CROPS for consistency.

const CROP_KB = {
    'rice':         { ph:[5.5,7.0], soil:['Clayey','Loamy','Alluvial'],       season:['Monsoon','Summer'],          income:45000  },
    'wheat':        { ph:[6.0,7.5], soil:['Loamy','Clayey','Black'],          season:['Winter','Pre-winter'],       income:38000  },
    'maize':        { ph:[5.8,7.0], soil:['Sandy','Loamy','Alluvial'],        season:['Summer','Monsoon','Spring'], income:35000  },
    'corn':         { ph:[5.8,7.0], soil:['Sandy','Loamy','Alluvial'],        season:['Summer','Monsoon','Spring'], income:35000  },
    'soybean':      { ph:[6.0,7.0], soil:['Loamy','Black'],                   season:['Monsoon'],                   income:42000  },
    'cotton':       { ph:[5.5,8.5], soil:['Black','Alluvial'],                season:['Summer','Monsoon'],          income:65000  },
    'potato':       { ph:[5.0,6.5], soil:['Sandy','Loamy'],                   season:['Winter','Pre-winter'],       income:70000  },
    'sugarcane':    { ph:[6.5,8.0], soil:['Alluvial','Black','Clayey'],       season:['Summer','Monsoon'],          income:85000  },
    'coffee':       { ph:[5.0,6.0], soil:['Laterite','Red','Loamy'],          season:['Monsoon'],                   income:120000 },
    'tea':          { ph:[4.5,5.5], soil:['Red','Laterite'],                  season:['Monsoon'],                   income:110000 },
    'banana':       { ph:[6.5,7.5], soil:['Loamy','Alluvial'],                season:['Summer','Monsoon','Spring'], income:90000  },
    'tomato':       { ph:[6.0,6.8], soil:['Sandy','Loamy'],                   season:['Summer','Winter','Spring','Autumn'], income:60000  },
    'onion':        { ph:[6.0,7.0], soil:['Sandy','Loamy'],                   season:['Winter','Summer','Autumn'],  income:55000  },
    'grapes':       { ph:[6.5,8.5], soil:['Sandy','Loamy'],                   season:['Summer','Winter','Spring'],  income:180000 },
    'apple':        { ph:[6.0,7.0], soil:['Loamy'],                           season:['Winter'],                    income:150000 },
    'mango':        { ph:[5.5,7.5], soil:['Alluvial','Red','Loamy'],          season:['Summer','Spring'],           income:130000 },
    'barley':       { ph:[7.0,8.5], soil:['Clayey','Loamy','Chalky'],         season:['Winter','Pre-winter'],       income:30000  },
    'sorghum':      { ph:[5.5,8.5], soil:['Clayey','Black','Loamy'],          season:['Summer','Monsoon'],          income:28000  },
    'groundnut':    { ph:[6.0,6.5], soil:['Sandy','Loamy'],                   season:['Monsoon','Summer'],          income:48000  },
    'peanut':       { ph:[6.0,6.5], soil:['Sandy','Loamy'],                   season:['Monsoon','Summer'],          income:48000  },
    'chickpea':     { ph:[6.0,8.0], soil:['Black','Loamy'],                   season:['Winter','Pre-winter'],       income:45000  },
    'cassava':      { ph:[4.5,6.5], soil:['Sandy','Laterite'],                season:['Summer','Monsoon'],          income:40000  },
    'pineapple':    { ph:[4.5,5.5], soil:['Sandy','Laterite'],                season:['Monsoon','Summer'],          income:95000  },
    'rubber':       { ph:[4.0,6.0], soil:['Laterite','Red'],                  season:['Monsoon'],                   income:100000 },
    'cabbage':      { ph:[6.0,7.5], soil:['Loamy','Clayey'],                  season:['Winter','Autumn'],           income:65000  },
    'carrot':       { ph:[5.5,7.0], soil:['Sandy','Loamy'],                   season:['Winter','Pre-winter'],       income:58000  },
    'cocoa':        { ph:[5.0,7.5], soil:['Loamy','Alluvial'],                season:['Monsoon'],                   income:160000 },
    'avocado':      { ph:[6.0,7.0], soil:['Loamy','Sandy'],                   season:['Summer','Monsoon'],          income:200000 },
    'lentil':       { ph:[6.0,8.0], soil:['Loamy','Black'],                   season:['Winter','Pre-winter'],       income:40000  },
    'spinach':      { ph:[6.5,7.5], soil:['Loamy','Sandy'],                   season:['Winter','Spring','Autumn'],  income:50000  },
    'sunflower':    { ph:[6.0,7.5], soil:['Loamy','Black','Alluvial'],        season:['Summer','Spring'],           income:62000  },
    'millet':       { ph:[5.5,8.0], soil:['Sandy','Loamy','Red'],             season:['Summer','Monsoon'],          income:25000  },
    'sweet potato': { ph:[5.5,6.5], soil:['Sandy','Loamy'],                   season:['Summer','Monsoon'],          income:68000  },
    'papaya':       { ph:[6.0,7.0], soil:['Loamy','Sandy'],                   season:['Summer','Monsoon'],          income:110000 },
    'garlic':       { ph:[6.0,7.5], soil:['Loamy','Sandy'],                   season:['Winter','Pre-winter'],       income:85000  },
    'olive':        { ph:[6.5,8.5], soil:['Sandy','Chalky','Loamy'],          season:['Summer','Winter'],           income:140000 },
    'strawberry':   { ph:[5.5,6.5], soil:['Loamy','Sandy'],                   season:['Winter','Spring','Summer'],  income:180000 },
    'watermelon':   { ph:[6.0,7.0], soil:['Sandy','Loamy'],                   season:['Summer'],                    income:75000  },
    'pumpkin':      { ph:[6.0,7.5], soil:['Loamy','Alluvial'],                season:['Summer','Monsoon'],          income:55000  },
    'chili':        { ph:[6.0,7.0], soil:['Loamy','Red'],                     season:['Summer','Monsoon','Spring'], income:95000  },
    'pepper':       { ph:[6.0,7.0], soil:['Loamy','Red'],                     season:['Summer','Monsoon','Spring'], income:95000  },
    'mustard':      { ph:[6.0,7.5], soil:['Loamy','Clayey'],                  season:['Winter','Pre-winter'],       income:42000  },
    'cucumber':     { ph:[6.0,7.0], soil:['Sandy','Loamy'],                   season:['Summer','Monsoon'],          income:80000  },
    'eggplant':     { ph:[5.5,6.8], soil:['Loamy','Alluvial'],                season:['Summer','Spring'],           income:65000  },
    'cauliflower':  { ph:[6.0,7.0], soil:['Loamy','Clayey'],                  season:['Winter','Autumn'],           income:70000  },
    'peas':         { ph:[6.0,7.5], soil:['Loamy','Sandy'],                   season:['Winter','Spring'],           income:55000  },
    'oats':         { ph:[5.5,7.0], soil:['Loamy','Clayey'],                  season:['Winter','Pre-winter'],       income:32000  },
    'ginger':       { ph:[5.5,6.5], soil:['Loamy','Alluvial'],                season:['Monsoon'],                   income:140000 },
    'turmeric':     { ph:[5.5,7.5], soil:['Red','Loamy'],                     season:['Monsoon'],                   income:130000 },
    'lemon':        { ph:[5.5,6.5], soil:['Loamy','Sandy','Red'],             season:['Summer','Monsoon','Spring'], income:102000 },
    'orange':       { ph:[5.5,7.0], soil:['Loamy','Sandy'],                   season:['Summer','Winter'],           income:115000 },
    'sorrel':       { ph:[5.5,7.0], soil:['Loamy','Sandy','Alluvial'],        season:['Monsoon','Summer','Winter'], income:68000  },
    'lettuce':      { ph:[6.0,7.0], soil:['Loamy','Sandy'],                   season:['Winter','Spring'],           income:55000  },
    'basil':        { ph:[6.0,7.0], soil:['Loamy','Sandy'],                   season:['Summer','Spring'],           income:72000  },
    'mint':         { ph:[6.0,7.0], soil:['Loamy','Alluvial'],                season:['Summer','Monsoon'],          income:80000  },
    'vanilla':      { ph:[6.0,7.0], soil:['Loamy','Laterite'],                season:['Monsoon'],                   income:300000 },
};

// ─── Real Suitability Scorer ──────────────────────────────────────────────────

/**
 * Calculates a genuine Crop Suitability Score (1–100) from farm conditions.
 * Identical weighting system to engine.js — no randomness.
 *
 * Score breakdown (max 100):
 *   • pH match         up to −50 penalty per unit outside optimal range
 *   • Soil type        +30 match / −40 miss
 *   • Season           +40 match / −60 miss
 *   • Crop rotation    +15 bonus if legume preceded cereal
 *
 * @param {string} cropName  - from GrowStuff API (raw name)
 * @param {object} params    - { soilType, season, phLevel, previousCrop }
 * @returns {{ score: number, income: number, label: string }}
 */
function scoreCrop(cropName, params) {
    const { season, phLevel, previousCrop } = params;
    const soilNorm = normalizeSoilName(params.soilType);

    // Fuzzy-match crop name to our knowledge base key
    const nameLC = (cropName || '').toLowerCase();
    const key    = Object.keys(CROP_KB).find(k => nameLC.includes(k));
    const kb     = key ? CROP_KB[key] : null;

    let score = 50; // Neutral for unknown/unrecognised crops

    if (kb) {
        score = 100;

        // 1. pH penalty — ±25 per unit outside ideal [min, max]
        const [phMin, phMax] = kb.ph;
        if      (phLevel < phMin) score -= (phMin - phLevel) * 25;
        else if (phLevel > phMax) score -= (phLevel - phMax) * 25;

        // 2. Soil match
        if (kb.soil.includes(soilNorm)) score += 30;
        else                            score -= 40;

        // 3. Season match
        if (kb.season.includes(season)) score += 40;
        else                            score -= 60;

        // 4. Crop rotation synergy bonus
        const pulses  = ['soybean','chickpea','lentil','groundnut','peanut'];
        const cereals = ['rice','wheat','maize','corn','sorghum','barley','millet','oats'];
        const prev    = (previousCrop || '').toLowerCase();
        if (pulses.some(p => prev.includes(p)) && cereals.includes(key)) score += 15;
    }

    const finalScore = Math.min(100, Math.max(1, Math.round(score)));

    // Label for the score
    let label = 'Low Suitability';
    if (finalScore >= 75) label = 'Highly Suitable';
    else if (finalScore >= 55) label = 'Moderately Suitable';

    const income = kb ? kb.income : 35000;

    return { score: finalScore, income, label };
}

// ─── Crop-Specific Fertilizer Lookup ─────────────────────────────────────────
// Returns 2 specific fertilizers best suited for each crop.
// Based on ICAR / Fertigation guidelines.

function getFertilizers(cropName) {
    const n = (cropName || '').toLowerCase();
    // Cereals
    if (n.includes('rice'))        return ['Urea (120 kg/ha)', 'DAP (60 kg/ha)'];
    if (n.includes('wheat'))       return ['Urea (120 kg/ha)', 'SSP – Superphosphate'];
    if (n.includes('maize') || n.includes('corn')) return ['Urea (120 kg/ha)', 'MOP – Muriate of Potash'];
    if (n.includes('barley'))      return ['Ammonium Sulphate', 'SSP – Superphosphate'];
    if (n.includes('sorghum') || n.includes('millet')) return ['Urea (80 kg/ha)', 'DAP (40 kg/ha)'];
    if (n.includes('oats'))        return ['Ammonium Nitrate', 'DAP (30 kg/ha)'];
    // Pulses & Oilseeds
    if (n.includes('soybean') || n.includes('soya')) return ['DAP (60 kg/ha)', 'MOP (40 kg/ha)'];
    if (n.includes('chickpea'))    return ['DAP (20 kg/ha)', 'Boron + Rhizobium inoculant'];
    if (n.includes('lentil'))      return ['DAP (20 kg/ha)', 'Sulphur (20 kg/ha)'];
    if (n.includes('groundnut') || n.includes('peanut')) return ['Gypsum (250 kg/ha)', 'DAP (40 kg/ha)'];
    if (n.includes('mustard'))     return ['Urea (60 kg/ha)', 'Sulphur (30 kg/ha)'];
    if (n.includes('sunflower'))   return ['Urea (80 kg/ha)', 'MOP (40 kg/ha)'];
    if (n.includes('flax') || n.includes('linseed')) return ['Urea (50 kg/ha)', 'SSP (30 kg/ha)'];
    // Cash Crops
    if (n.includes('cotton'))      return ['Urea (120 kg/ha)', 'MOP – Muriate of Potash'];
    if (n.includes('sugarcane'))   return ['Urea (250 kg/ha)', 'MOP (100 kg/ha)'];
    if (n.includes('tobacco'))     return ['Potassium Sulphate', 'Calcium Nitrate'];
    // Vegetables
    if (n.includes('tomato'))      return ['NPK 19:19:19', 'Calcium Nitrate'];
    if (n.includes('potato'))      return ['NPK 12:32:16', 'MOP (150 kg/ha)'];
    if (n.includes('onion') || n.includes('garlic')) return ['Urea (100 kg/ha)', 'Sulphate of Potash'];
    if (n.includes('cabbage') || n.includes('cauliflower')) return ['Urea (120 kg/ha)', 'Borax (3 kg/ha)'];
    if (n.includes('carrot'))      return ['NPK 80:40:40', 'Boron (2 kg/ha)'];
    if (n.includes('spinach') || n.includes('lettuce')) return ['Urea (100 kg/ha)', 'NPK 15:15:15'];
    if (n.includes('cucumber'))    return ['NPK 100:50:50', 'Calcium Nitrate'];
    if (n.includes('pumpkin') || n.includes('squash')) return ['NPK 80:40:40', 'MOP (40 kg/ha)'];
    if (n.includes('watermelon'))  return ['NPK 100:80:80', 'Calcium Nitrate'];
    if (n.includes('eggplant') || n.includes('brinjal')) return ['Urea (100 kg/ha)', 'MOP (50 kg/ha)'];
    if (n.includes('chili') || n.includes('pepper') || n.includes('capsicum')) return ['NPK 120:60:60', 'Calcium Nitrate'];
    if (n.includes('peas'))        return ['DAP (20 kg/ha)', 'MOP (20 kg/ha)'];
    // Fruits
    if (n.includes('banana'))      return ['Urea (200 g/plant)', 'MOP (300 g/plant)'];
    if (n.includes('mango'))       return ['NPK 1 kg/tree/year', 'Micronutrient mix (Zn+B)'];
    if (n.includes('apple'))       return ['Urea (2 kg/tree)', 'MOP + Boron spray'];
    if (n.includes('grapes'))      return ['NPK 20:20:20', 'Potassium Sulphate'];
    if (n.includes('papaya'))      return ['NPK 200:200:250 g/plant', 'Calcium Nitrate'];
    if (n.includes('pineapple'))   return ['Urea (12 g/plant)', 'MOP (12 g/plant)'];
    if (n.includes('avocado'))     return ['NPK 8:3:9', 'Zinc Sulphate spray'];
    if (n.includes('strawberry'))  return ['NPK 100:80:120', 'Calcium + Boron'];
    if (n.includes('lemon') || n.includes('orange') || n.includes('citrus')) return ['Urea (500 g/tree)', 'MOP (250 g/tree)'];
    if (n.includes('watermelon'))  return ['NPK 100:80:80', 'Calcium Nitrate'];
    if (n.includes('coconut'))     return ['Urea (1 kg/palm)', 'MOP (2 kg/palm)'];
    // Plantation
    if (n.includes('coffee'))      return ['NPK 160:80:120', 'Zinc + Boron micronutrients'];
    if (n.includes('tea'))         return ['Ammonium Sulphate', 'NPK 15:5:15'];
    if (n.includes('rubber'))      return ['NPK 10:10:10', 'Magnesium Sulphate'];
    if (n.includes('cocoa'))       return ['NPK 13:13:21', 'Organic Compost (5 t/ha)'];
    if (n.includes('vanilla'))     return ['Organic Compost mulch', 'Potassium Sulphate'];
    // Spices
    if (n.includes('ginger'))      return ['NPK 100:50:50', 'Wood ash (1 t/ha)'];
    if (n.includes('turmeric'))    return ['NPK 120:60:60', 'FYM (30 t/ha)'];
    if (n.includes('basil') || n.includes('mint') || n.includes('herb')) return ['NPK 60:30:30', 'Urea (40 kg/ha)'];
    if (n.includes('cassava'))     return ['NPK 60:60:120', 'DAP (60 kg/ha)'];
    if (n.includes('sweet potato')) return ['NPK 60:80:100', 'MOP (50 kg/ha)'];
    if (n.includes('sorrel'))      return ['NPK 80:40:60', 'Organic Compost (3 t/ha)'];
    // Default fallback
    return ['NPK 60:30:30 (balanced)', 'FYM Compost (5 t/ha)'];
}

// ─── Public API Object ────────────────────────────────────────────────────────

export const api = {

    delay(ms = 400) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Fetches real crops from GrowStuff, scores each using real farm conditions,
     * sorts by true suitability score, returns top 3.
     */
    /**
     * Highly Accurate Botanical Image Fetcher.
     * Uses Wikipedia's Global Database to guarantee the correct plant photo.
     */
    async fetchCropImage(crop) {
        try {
            // Use the base crop (e.g., 'Sunflower') rather than a specific cultivar
            const term = crop.baseCrop || crop.name.split(' ')[0];
            
            const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
            const data = await res.json();
            
            if (data && data.thumbnail && data.thumbnail.source) {
                return `<img src="${data.thumbnail.source}" 
                         style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;" 
                         alt="${crop.name}"/>`;
            }
        } catch (e) {
            console.warn("Wikipedia image fetch error for:", crop.name);
        }
        
        // Final fallback: A beautiful, static high-definition farm photo
        return `<img src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=320&q=80" 
                 style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;" 
                 alt="${crop.name}"/>`;
    },

    async getRecommendations(data) {
        let finalResults = [];
        try {
            const mlResponse = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ph:   data.phLevel,
                    temp: data.temp || 25,
                    hum:  data.humidity || 60,
                    rain: data.rain || 100
                })
            });

            if (mlResponse.ok) {
                const mlData = await mlResponse.json();
                const predictedCrop = mlData.prediction;
                
                const localResults = calculateSuitability({ ...data, soilType: normalizeSoilName(data.soilType) });
                const matched = localResults.find(c => (c.baseCrop || c.name).toLowerCase().includes(predictedCrop.toLowerCase())) || localResults[0];

                finalResults = [{
                    ...matched,
                    name: `${matched.baseCrop} (AI Recommended)`,
                    details: mlData.ai_expert_advice,
                    marketPriceInsight: `ML Confidence: ${mlData.confidence}. ${matched.marketPriceInsight}`
                }, ...localResults.filter(c => c.baseCrop !== matched.baseCrop).slice(0, 2).map(c => ({
                    ...c,
                    name: c.baseCrop
                }))];
            } else {
                finalResults = calculateSuitability({ ...data, soilType: normalizeSoilName(data.soilType) }).map(c => ({
                    ...c,
                    name: c.baseCrop
                }));
            }
        } catch (error) {
            console.warn('Online prediction flow failed, using local engine:', error);
            finalResults = calculateSuitability({ ...data, soilType: normalizeSoilName(data.soilType) }).map(c => ({
                ...c,
                name: c.baseCrop
            }));
        }

        // FETCH REAL-TIME IMAGES FOR TOP RESULTS (Runs even if ML server is offline)
        const resultsWithImages = await Promise.all(finalResults.map(async (crop) => {
            const realImageHtml = await this.fetchCropImage(crop);
            return {
                ...crop,
                icon: realImageHtml || crop.icon
            };
        }));

        return resultsWithImages;
    },

    // ─── Advisory Content (crop-specific) ──────────────────────────────────────

    async getDetails(type, cropName, soilType) {
        await this.delay(300);

        const n = (cropName || '').toLowerCase();

        const fertilizerMap = {
            rice:    ['Apply 120:60:60 kg/ha NPK in 3 split doses.', 'Zinc sulphate (25 kg/ha) is essential — apply at transplanting.', 'Avoid over-irrigation after N application to reduce volatilisation.', 'Use green manure crops (Sesbania) to substitute up to 40 kg N/ha.', 'Basal Phosphorus 2–3 days before transplanting gives best root uptake.'],
            wheat:   ['Apply 120:60:40 kg/ha NPK; first N dose at sowing, second at CRI stage.', 'Sulphur (40 kg/ha as gypsum) significantly boosts protein content.', 'Foliar urea spray (2%) at tillering stage corrects mid-season deficiency.', 'Zinc deficiency is common — apply 25 kg ZnSO4/ha once every 3 years.', 'Incorporate Phosphorus 10–15 cm deep for optimal root zone absorption.'],
            tomato:  ['Apply 200:150:150 kg/ha NPK; use drip fertigation every 10–14 days.', 'Calcium and Boron are critical — prevent blossom end rot with foliar Ca spray.', 'Side-dress with 30 kg N/ha at first fruit set for maximum production.', 'Micro-nutrients especially Manganese and Iron are frequently limiting.', 'Drip fertigation saves 40% fertilizer vs. conventional broadcast application.'],
            potato:  ['Apply 180:120:180 kg/ha NPK; high potassium improves tuber dry matter quality.', 'Split N into 2 doses — at planting and at earthing-up stage.', 'Calcium deficiency causes internal browning — conduct soil test before planting.', 'Avoid excessive N after tuber initiation to prevent excessive canopy growth.', 'Boron and Zinc supplements improve starch content and marketable tuber yield.'],
            maize:   ['Apply 120:60:40 kg/ha NPK; topdress 40 kg N/ha at knee-high stage.', 'Sulphur is important for protein quality — apply 20 kg/ha as elemental S.', 'Zinc deficiency is widespread — apply ZnSO4 at sowing in deficient soils.', 'Foliar K spray helps correct potassium deficiency after tasseling.', 'Slow-release urea significantly reduces leaching losses in sandy soils.'],
            default: ['Conduct a soil test before any application to avoid over-fertilizing.', 'Use split-dose Nitrogen (3 applications) to maximise uptake and reduce leaching.', 'Incorporate 10–15 tons/ha of well-composted farmyard manure before planting.', 'Monitor for micro-nutrient deficiencies — Zinc and Boron are most commonly limiting.', 'Apply Phosphorus as basal dose; avoid broadcasting on wet or waterlogged soils.'],
        };

        const pestMap = {
            tomato:  ['Tomato leaf miner — use pheromone traps combined with Spinosad spray.', 'Whitefly vectors TYLCV virus — use reflective mulch and weekly neem oil spray.', 'Early blight (Alternaria) — apply Mancozeb 75 WP at 10-day spray intervals.', 'Remove infected plant debris immediately after harvest to break disease cycle.', 'Introduce Trichogramma wasps as biocontrol against helicoverpa moths at egg stage.'],
            rice:    ['Brown planthopper threshold: 10 hoppers/tiller — drain field to reduce humidity.', 'Blast disease — spray Tricyclazole 75 WP at boot leaf stage in susceptible zones.', 'Stem borer — use light traps for monitoring and Chlorpyrifos granules in whorls.', 'Stagger planting dates within village to break synchronised pest population cycles.', 'Maintain clean bunds and remove rice stubble to destroy overwintering pest populations.'],
            wheat:   ['Yellow rust — apply Propiconazole 25 EC immediately at early infection signs.', 'Aphid colonies on leaves: spray Thiamethoxam or introduce parasitic wasps as biocontrol.', 'Termite damage — apply Chlorpyrifos 20 EC in furrow at sowing as preventative.', 'Powdery mildew — use susceptibility-rated varieties and Sulphur 80 WP protectant spray.', 'Implement burrow fumigation and bait stations in fields for rodent population management.'],
            potato:  ['Late blight (Phytophthora infestans) — spray Metalaxyl+Mancozeb before forecast rain.', 'Colorado beetle — apply Bacillus thuringiensis (Bt) as targeted biological option.', 'Cut worms damage stems at soil level — use Chlorpyrifos dust at planting time.', 'Aphids spread potato virus Y — use certified disease-free seed potato to minimise risk.', 'Maintain 3-year crop rotation schedule to effectively manage soil nematode populations.'],
            default: ['Scout crops weekly; identify pests before they reach economic damage thresholds.', 'Use biological controls — Trichoderma, Beauveria bassiana — before resorting to chemical sprays.', 'Maintain 20–25 cm plant spacing to ensure airflow and reduce humidity-related fungal diseases.', 'Rotate crops annually to break pest life cycles and reduce soil-borne pathogen build-up.', 'Choose certified, pest-resistant seed varieties validated for your specific agro-climatic zone.'],
        };

        const sustainMap = {
            rice:    ['System of Rice Intensification (SRI) reduces water use by 30–50% with higher yields.', 'Alternate Wetting and Drying (AWD) technique cuts methane emissions by 40% per season.', 'Grow Azolla as biofertiliser — fixes 30–40 kg N/ha and naturally suppresses weeds.', 'Direct-seeded rice (DSR) eliminates nursery stage, saves 15–20% water, reduces labor cost.', 'Recycle rice straw via Happy Seeder to avoid stubble burning and build soil organic carbon.'],
            tomato:  ['Drip + mulch combination saves 60% water and simultaneously suppresses weeds effectively.', 'Intercrop with basil to repel aphids and whiteflies as companion plant biocontrol.', 'Use vermicompost (5 t/ha) to reduce chemical fertilizer requirement by 25–30%.', 'Protected cultivation (low tunnels/polyhouses) extends growing season and reduces pesticide use.', 'Collect rooftop rainwater into drip reservoirs — zero-cost supplemental irrigation strategy.'],
            maize:   ['Conservation tillage retains 60% more soil moisture vs. conventional deep ploughing.', 'Strip cropping with legumes (cowpea) improves soil nitrogen levels for subsequent maize crop.', 'Biochar application at 2 t/ha significantly improves water-holding capacity in light sandy soils.', 'Stagger sowing dates by 2–3 weeks to spread labor requirement and diversify market sale period.', 'Use certified drought-tolerant hybrid varieties in rain-fed areas to stabilise yield across seasons.'],
            default: ['Implement drip irrigation — saves 40–60% water vs. conventional flood irrigation methods.', 'Leave crop residue on field after harvest to incrementally build soil organic carbon profile.', 'Plant cover crops (Dhaincha, Clover) during fallow periods to biologically fix atmospheric Nitrogen.', 'Solar-powered irrigation pumps cut operational costs significantly and reduce carbon footprint.', 'Adopt Integrated Nutrient Management (INM) to reduce chemical input requirement by up to 30%.'],
        };

        const match = (map) => {
            for (const [key, val] of Object.entries(map)) {
                if (key !== 'default' && n.includes(key)) return val;
            }
            return map.default;
        };

        const result = { fertilizer: match(fertilizerMap), pest: match(pestMap), sustainable: match(sustainMap) };
        return result[type] || result.fertilizer;
    },

    // ─── Soil Remediation Plan ─────────────────────────────────────────────────

    async getSoilGuidance(data) {
        await this.delay(400);
        const { zone, points } = getDetailedEnrichment(parseFloat(data.phLevel));
        return { title: `CRITICAL: ${zone} — Soil Enrichment Plan`, points };
    },

    // ─── Health Check ──────────────────────────────────────────────────────────

    async healthCheck() {
        try {
            const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
            return res.ok;
        } catch {
            return false;
        }
    },
};
