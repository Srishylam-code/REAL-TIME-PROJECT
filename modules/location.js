/**
 * Location Module — GPS, Reverse Geocoding, Weather, Soil & pH Detection
 *
 * APIs used (all free, zero API keys):
 *   • Browser Geolocation API  (built-in)
 *   • Nominatim / OpenStreetMap  (free, no key)
 *   • Open-Meteo weather API     (free, no key)
 *
 * Soil type + pH: data-driven lookup from ICAR / FAO soil survey research.
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  SOIL TYPE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const INDIA_SOIL_MAP = {
    // Alluvial Belt (Indo-Gangetic Plain)
    'punjab':            'Alluvial Soil',
    'haryana':           'Alluvial Soil',
    'uttar pradesh':     'Alluvial Soil',
    'bihar':             'Alluvial Soil',
    'west bengal':       'Alluvial Soil',
    'assam':             'Alluvial Soil',
    'uttarakhand':       'Alluvial Soil',
    'delhi':             'Alluvial Soil',
    'himachal pradesh':  'Loamy Soil',
    // Black Soil
    'maharashtra':       'Black Soil',
    'madhya pradesh':    'Black Soil',
    'gujarat':           'Black Soil',
    'chhattisgarh':      'Black Soil',
    'andhra pradesh':    'Black Soil',
    'telangana':         'Black Soil',
    // Red & Laterite
    'karnataka':         'Red Soil',
    'tamil nadu':        'Red Soil',
    'odisha':            'Red Soil',
    'jharkhand':         'Red Soil',
    'goa':               'Laterite Soil',
    'kerala':            'Laterite Soil',
    'meghalaya':         'Laterite Soil',
    'tripura':           'Laterite Soil',
    // Sandy / Arid
    'rajasthan':         'Sandy Soil',
    'ladakh':            'Sandy Soil',
    // Hilly / Loamy
    'sikkim':            'Loamy Soil',
    'arunachal pradesh': 'Loamy Soil',
    'manipur':           'Loamy Soil',
    'nagaland':          'Loamy Soil',
    'mizoram':           'Loamy Soil',
    'jammu and kashmir': 'Loamy Soil',
};

const WORLD_SOIL_MAP = {
    'china':         'Loamy Soil',
    'usa':           'Loamy Soil',
    'united states': 'Loamy Soil',
    'brazil':        'Laterite Soil',
    'australia':     'Sandy Soil',
    'egypt':         'Sandy Soil',
    'saudi arabia':  'Sandy Soil',
    'pakistan':      'Alluvial Soil',
    'bangladesh':    'Alluvial Soil',
    'nepal':         'Alluvial Soil',
    'sri lanka':     'Laterite Soil',
    'nigeria':       'Laterite Soil',
    'ethiopia':      'Clayey Soil',
    'kenya':         'Red Soil',
    'indonesia':     'Laterite Soil',
    'thailand':      'Clayey Soil',
    'vietnam':       'Alluvial Soil',
    'myanmar':       'Alluvial Soil',
    'mexico':        'Clayey Soil',
    'argentina':     'Loamy Soil',
};

export function guessSoilType(state, country) {
    const s = (state   || '').toLowerCase().trim();
    const c = (country || '').toLowerCase().trim();
    for (const [k, v] of Object.entries(INDIA_SOIL_MAP)) { if (s.includes(k)) return v; }
    for (const [k, v] of Object.entries(WORLD_SOIL_MAP)) { if (c.includes(k)) return v; }
    return 'Loamy Soil';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  pH MAPPING  (Source: ICAR National Bureau Soil Survey · FAO World Soil DB)
//  Values = typical dominant agricultural zone pH (midpoint of surveyed range)
// ═══════════════════════════════════════════════════════════════════════════════

const INDIA_PH_MAP = {
    // Alluvial belt — slightly alkaline from canal irrigation + CaCO3 parent rock
    'punjab':            8.0,
    'haryana':           7.9,
    'uttar pradesh':     7.6,
    'bihar':             7.2,
    'west bengal':       6.0,  // Humid, more leached alluvium
    'assam':             5.2,  // High rainfall, strongly acidic
    'uttarakhand':       6.2,
    'delhi':             7.8,
    'himachal pradesh':  6.0,
    // Black soil (Deccan Trap basalt) — neutral to mildly alkaline
    'maharashtra':       7.8,
    'madhya pradesh':    7.5,
    'gujarat':           7.6,
    'chhattisgarh':      6.5,
    'andhra pradesh':    7.0,
    'telangana':         7.0,
    // Red / Laterite — acidic from high rainfall + leaching
    'karnataka':         6.2,
    'tamil nadu':        6.5,
    'odisha':            5.8,
    'jharkhand':         5.5,
    'goa':               5.5,
    'kerala':            5.0,  // Laterite + high rainfall — most acidic state
    // Northeast — heavily leached under monsoon
    'meghalaya':         4.8,
    'tripura':           5.2,
    'sikkim':            5.5,
    'arunachal pradesh': 5.0,
    'manipur':           5.5,
    'nagaland':          5.0,
    'mizoram':           5.2,
    // Arid / Semi-arid
    'rajasthan':         8.2,  // Alkaline, sometimes saline
    'jammu and kashmir': 7.2,
    'ladakh':            7.8,
};

const WORLD_PH_MAP = {
    'china':         6.8,
    'usa':           6.5,
    'united states': 6.5,
    'brazil':        5.5,  // Highly weathered Oxisols
    'australia':     6.2,
    'egypt':         8.0,  // Arid calcareous
    'saudi arabia':  7.8,
    'pakistan':      7.8,
    'bangladesh':    6.5,
    'nepal':         6.5,
    'sri lanka':     5.8,
    'nigeria':       6.0,
    'ethiopia':      6.2,
    'kenya':         6.0,
    'indonesia':     5.5,  // Tropical, heavily leached
    'thailand':      6.0,
    'vietnam':       5.8,
    'myanmar':       6.5,
    'mexico':        7.0,
    'argentina':     6.5,
};

/**
 * Returns estimated dominant soil pH for a region.
 * Sourced from ICAR / FAO soil survey data.
 * Defaults to 6.8 (global cropland average per FAO 2021).
 */
export function guessPH(state, country) {
    const s = (state   || '').toLowerCase().trim();
    const c = (country || '').toLowerCase().trim();
    for (const [k, v] of Object.entries(INDIA_PH_MAP)) { if (s.includes(k)) return v; }
    for (const [k, v] of Object.entries(WORLD_PH_MAP)) { if (c.includes(k)) return v; }
    return 6.8; // FAO global cropland average
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SEASON DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function detectSeason(lat) {
    const month    = new Date().getMonth() + 1;
    const northern = lat >= 0;
    
    if (northern) {
        // Northern Hemisphere (Optimized for India/Subtropics)
        if (month === 2  || month === 3)  return 'Spring';
        if (month >= 4  && month <= 6)   return 'Summer';
        if (month >= 7  && month <= 9)   return 'Monsoon';
        if (month === 10)                 return 'Autumn';
        if (month === 11)                 return 'Pre-winter';
        return 'Winter'; // Dec, Jan
    } else {
        // Southern Hemisphere (Offset by 6 months)
        if (month === 8  || month === 9)  return 'Spring';
        if (month >= 10 || month <= 12) return 'Summer';
        if (month >= 1  && month <= 3)  return 'Monsoon';
        if (month === 4)                 return 'Autumn';
        if (month === 5)                 return 'Pre-winter';
        return 'Winter'; // Jun, Jul
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REVERSE GEOCODING  (Nominatim / OpenStreetMap)
//  IMPORTANT: No custom User-Agent header — it's CORS-forbidden in browsers.
// ═══════════════════════════════════════════════════════════════════════════════

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
    const data = await res.json();
    const a = data.address || {};
    const city    = a.city || a.town || a.village || a.suburb || a.county || '';
    const state   = a.state || a.region || '';
    const country = a.country || '';
    return { city, state, country, display: [city, state, country].filter(Boolean).join(', ') };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEATHER  (Open-Meteo — free, no API key)
//  humidity + precipitation live in hourly[], pick current-hour index.
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchWeather(lat, lon) {
    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weather_code` +
        `&hourly=relative_humidity_2m,precipitation` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&forecast_days=6&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
    const data = await res.json();
    
    const cur = data.current || {};
    const hr  = data.hourly  || {};
    const day = data.daily   || {};
    
    const idx = Math.min(new Date().getHours(), (hr.time?.length ?? 1) - 1);
    
    // Build 5-day forecast (excluding today if needed, but usually showing today + 4)
    const forecast = [];
    if (day.time) {
        for (let i = 1; i < day.time.length; i++) {
            forecast.push({
                date: day.time[i],
                max:  day.temperature_2m_max[i],
                min:  day.temperature_2m_min[i],
                code: day.weather_code[i],
                prob: day.precipitation_probability_max[i]
            });
        }
    }

    return {
        temp:     cur.temperature_2m               ?? null,
        humidity: hr.relative_humidity_2m?.[idx]   ?? null,
        rain:     hr.precipitation?.[idx]           ?? null,
        code:     cur.weather_code                 ?? 0,
        forecast: forecast
    };
}

export function weatherLabel(code) {
    if (code === 0)  return { icon: '☀️',  label: 'Clear sky' };
    if (code <= 3)   return { icon: '🌤️', label: 'Partly cloudy' };
    if (code <= 48)  return { icon: '🌫️', label: 'Foggy' };
    if (code <= 67)  return { icon: '🌧️', label: 'Rainy' };
    if (code <= 77)  return { icon: '🌨️', label: 'Snow' };
    if (code <= 82)  return { icon: '🌦️', label: 'Showers' };
    if (code <= 99)  return { icon: '⛈️',  label: 'Thunderstorm' };
    return { icon: '🌡️', label: 'Weather data' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export const location = {

    getCoords() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                err => {
                    const msgs = {
                        1: 'Location permission denied. Please allow it in browser settings.',
                        2: 'Unable to detect your location. Check GPS signal.',
                        3: 'Location request timed out. Please try again.',
                    };
                    reject(new Error(msgs[err.code] || 'Location unavailable.'));
                },
                { timeout: 12000, maximumAge: 60000, enableHighAccuracy: false }
            );
        });
    },

    /**
     * Search places by text (Nominatim)
     */
    async searchPlaces(query) {
        if (!query || query.length < 3) return [];
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=en`;
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) return [];
            const data = await res.json();
            return data.map(item => {
                const a = item.address || {};
                const city = a.city || a.town || a.village || a.suburb || a.county || '';
                const state = a.state || a.region || '';
                const country = a.country || '';
                return {
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    city, state, country,
                    display_name: item.display_name,
                };
            });
        } catch (e) {
            console.error('[Location] Search error:', e);
            return [];
        }
    },

    /**
     * Core function returning the full data bundle for ANY coordinates.
     * preGeo is optional {city, state, country, display} to skip reverse geocode.
     */
    async getFarmData(lat, lon, preGeo = null) {
        const [geoResult, weatherResult] = await Promise.allSettled([
            preGeo ? Promise.resolve(preGeo) : reverseGeocode(lat, lon),
            fetchWeather(lat, lon),
        ]);

        if (geoResult.status === 'rejected')     console.warn('[Location] Geocoding failed:', geoResult.reason?.message);
        if (weatherResult.status === 'rejected') console.warn('[Location] Weather failed:',   weatherResult.reason?.message);

        const geo     = geoResult.status === 'fulfilled' ? geoResult.value : (preGeo || {});
        const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : {};
        const { icon: weatherIcon, label: wLabel } = weatherLabel(weather.code ?? 0);

        const soilType = guessSoilType(geo.state, geo.country);
        const season   = detectSeason(lat);
        const ph       = guessPH(geo.state, geo.country);

        return {
            lat, lon,
            city:         geo.city    || '',
            state:        geo.state   || '',
            country:      geo.country || '',
            display:      geo.display || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
            season,
            soilType,
            ph,
            temp:         weather.temp     ?? null,
            humidity:     weather.humidity ?? null,
            rain:         weather.rain     ?? null,
            weatherIcon,
            weatherLabel: wLabel,
        };
    },

    /**
     * Original GPS entry point (kept for backward compatibility, now uses getFarmData)
     */
    async getLocationData() {
        const { lat, lon } = await this.getCoords();
        return this.getFarmData(lat, lon);
    },
};
