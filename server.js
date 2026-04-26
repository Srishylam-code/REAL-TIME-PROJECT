import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { calculateSuitability, getDetailedEnrichment } from './modules/engine.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ─── Utility ────────────────────────────────────────────────────────────────

/** Normalize soil names: "Loamy Soil" → "Loamy" */
const normalizeSoil = (s) => (s || '').replace(/\s?[Ss]oil$/, '').trim();

// ─── API Endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Health-check endpoint used by the frontend offline indicator and deployment probes.
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        engine: 'local-heuristic',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/recommend
 * Returns top-3 crop recommendations using the local Heuristic Engine.
 * Zero external API calls. Pure local calculation.
 */
app.post('/api/recommend', (req, res) => {
    const { soilType, season, phLevel, previousCrop } = req.body;

    if (!soilType || !season || isNaN(phLevel)) {
        return res.status(400).json({ error: 'Missing required parameters: soilType, season, phLevel' });
    }

    try {
        const results = calculateSuitability({
            soilType: normalizeSoil(soilType),
            season,
            phLevel: parseFloat(phLevel),
            previousCrop: previousCrop || ''
        });
        res.json(results);
    } catch (err) {
        console.error('[ENGINE ERROR]', err.message);
        res.status(500).json({ error: 'Engine calculation failed. Please try again.' });
    }
});

/**
 * POST /api/details
 * Returns crop-specific advisory for fertilizer, pest control, or sustainable practices.
 */
app.post('/api/details', (req, res) => {
    const { type } = req.body;

    const advisory = {
        fertilizer: [
            'Conduct a soil test before any application to avoid over-fertilizing.',
            'Use split-dose Nitrogen application (3 splits) to maximise uptake efficiency.',
            'Incorporate 10–15 tons/ha of well-composted farmyard manure before planting.',
            'Monitor for micro-nutrient deficiencies — Zinc and Boron are most common.',
            'Apply Phosphorus as basal dose; avoid broadcast on wet soils.',
        ],
        pest: [
            'Scout crops weekly; identify pests before populations reach economic thresholds.',
            'Use biological controls — Trichoderma, Beauveria bassiana before chemicals.',
            'Maintain 20–25 cm plant spacing to ensure proper airflow and reduce humidity.',
            'Rotate crops annually; breaks pest life cycles and reduces soil-borne pathogens.',
            'Choose certified, pest-resistant seed varieties suited for your region.',
        ],
        sustainable: [
            'Implement drip irrigation — saves 40–60% water vs. flood irrigation.',
            'Leave crop residue after harvest to build soil organic carbon over seasons.',
            'Use cover crops (Dhaincha, Clover) during fallow periods to fix Nitrogen.',
            'Solar-powered irrigation pumps reduce costs and carbon footprint significantly.',
            'Adopt Integrated Nutrient Management (INM) to reduce chemical inputs by 30%.',
        ]
    };

    res.json(advisory[type] || advisory.fertilizer);
});

/**
 * POST /api/guidance/soil
 * Returns a 10-point soil enrichment remediation plan for extreme pH conditions.
 */
app.post('/api/guidance/soil', (req, res) => {
    const { phLevel } = req.body;

    if (isNaN(phLevel)) {
        return res.status(400).json({ error: 'phLevel is required' });
    }

    try {
        const { zone, points } = getDetailedEnrichment(parseFloat(phLevel));
        res.json({
            title: `CRITICAL: ${zone} — Soil Enrichment Plan (Priority #1)`,
            points
        });
    } catch (err) {
        console.error('[SOIL ENGINE ERROR]', err.message);
        res.status(500).json({ error: 'Soil guidance calculation failed.' });
    }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n✅ Crop Recommendation System v2.0`);
    console.log(`🌱 Engine: Local Heuristic (Zero AI dependency)`);
    console.log(`🚀 Server running → http://localhost:${PORT}\n`);
});
