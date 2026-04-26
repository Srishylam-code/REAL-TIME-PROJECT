/**
 * Main Application Entry Point — Crop Recommendation System v3.0
 * 100% Offline-capable · Location-Aware · No AI dependencies
 */

import { api }           from './modules/api.js';
import { ui }            from './modules/ui.js';
import { validateInputs, formatINR } from './modules/utils.js';
import { location as loc } from './modules/location.js';
import { i18n }          from './modules/i18n.js';

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // ── Internationalization ──────────────────────────────────────────────────
    i18n.init();

    document.querySelectorAll('.lang-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            i18n.setLanguage(e.target.dataset.lang);
        });
    });

    // ── Application Initialization ─────────────────────────────────────────────

    // ── pH Slider ─────────────────────────────────────────────────────────────

    const phSlider  = document.getElementById('phLevelRange');
    const phDisplay = document.getElementById('phValueDisplay');

    phSlider?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (phDisplay) phDisplay.textContent = val.toFixed(1);
    });

    // ── Real-time Form Validation ─────────────────────────────────────────────

    const soilSelect   = document.getElementById('soilType');
    const seasonSelect = document.getElementById('season');

    soilSelect?.addEventListener('change', () => {
        if (soilSelect.value) ui.setFieldValid(soilSelect);
        else ui.setFieldInvalid(soilSelect, 'Please select a soil type.');
    });

    seasonSelect?.addEventListener('change', () => {
        if (seasonSelect.value) ui.setFieldValid(seasonSelect);
        else ui.setFieldInvalid(seasonSelect, 'Please select a season.');
    });

    // ── Farm Location Widget ──────────────────────────────────────────────────

    // DOM Elements
    const tabGps      = document.getElementById('tab-gps');
    const tabMan      = document.getElementById('tab-manual');
    const panelGps    = document.getElementById('panel-gps');
    const panelMan    = document.getElementById('panel-manual');
    const locBtn      = document.getElementById('locateBtn');
    const locCard     = document.getElementById('locationCard');
    const activeLoc   = document.getElementById('flwActiveLoc');

    const searchInput = document.getElementById('locationSearch');
    const clearBtn    = document.getElementById('clearLocSearch');
    const suggBox     = document.getElementById('locationSuggestions');
    const manLocDisp  = document.getElementById('manualLocDisplay');
    const manLocErr   = document.getElementById('manualLocErr');
    const manLocBtn   = document.getElementById('manualLocBtn');
    
    const recentPanel = document.getElementById('recentLocationsPanel');
    const recentList  = document.getElementById('recentList');

    let currentSelectedLocation = null;
    let searchTimeout = null;
    let selectedCropsForComparison = [];

    const compareFab = document.getElementById('compareFab');
    const updateCompareFab = () => {
        if (!compareFab) return;
        const count = selectedCropsForComparison.length;
        if (count >= 2) {
            compareFab.classList.add('visible');
            compareFab.style.display = 'flex';
            compareFab.querySelector('span').textContent = count;
        } else {
            compareFab.style.display = 'none';
        }
    };

    if (compareFab) {
        compareFab.addEventListener('click', () => {
            if (selectedCropsForComparison.length < 2) return;
            
            const [c1, c2] = selectedCropsForComparison;
            const area = parseFloat(document.getElementById('landArea')?.value || 1);
            
            let html = `<div class="compare-table-wrap" style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; background:white; color:var(--slate-800); font-size:14px;">
                    <thead>
                        <tr style="background:var(--slate-50);">
                            <th style="padding:15px; border:1px solid #eee; text-align:left;">Feature</th>
                            <th style="padding:15px; border:1px solid #eee;">${c1.name} ${c1.icon}</th>
                            <th style="padding:15px; border:1px solid #eee;">${c2.name} ${c2.icon}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="padding:12px; border:1px solid #eee; font-weight:600;">Suitability</td><td style="text-align:center; border:1px solid #eee;">${c1.score}%</td><td style="text-align:center; border:1px solid #eee;">${c2.score}%</td></tr>
                        <tr><td style="padding:12px; border:1px solid #eee; font-weight:600;">Est. Total Profit</td><td style="text-align:center; border:1px solid #eee; color:var(--green-600); font-weight:700;">${formatINR(c1.netIncomePerAcreINR * area)}</td><td style="text-align:center; border:1px solid #eee; color:var(--green-600); font-weight:700;">${formatINR(c2.netIncomePerAcreINR * area)}</td></tr>
                        <tr><td style="padding:12px; border:1px solid #eee; font-weight:600;">Yield</td><td style="text-align:center; border:1px solid #eee;">${c1.yield}</td><td style="text-align:center; border:1px solid #eee;">${c2.yield}</td></tr>
                        <tr><td style="padding:12px; border:1px solid #eee; font-weight:600;">Fertilizers</td><td style="text-align:center; border:1px solid #eee; font-size:12px;">${c1.fertilizer.join(', ')}</td><td style="text-align:center; border:1px solid #eee; font-size:12px;">${c2.fertilizer.join(', ')}</td></tr>
                        <tr><td style="padding:12px; border:1px solid #eee; font-weight:600;">Market Insight</td><td style="text-align:center; border:1px solid #eee;">${c1.marketPriceInsight}</td><td style="text-align:center; border:1px solid #eee;">${c2.marketPriceInsight}</td></tr>
                    </tbody>
                </table>
            </div>`;
            
            ui.showModal('⚖️ Crop Comparison Mode', html);
        });
    }

    // Local Storage for Recent Locations
    const getRecent = () => JSON.parse(localStorage.getItem('smartcrop_recent_locs') || '[]');
    const saveRecent = (locData) => {
        let recs = getRecent();
        recs = recs.filter(r => r.display_name !== locData.display_name); // Dedupe
        recs.unshift(locData);
        if (recs.length > 5) recs.length = 5;
        localStorage.setItem('smartcrop_recent_locs', JSON.stringify(recs));
        renderRecent();
    };

    const renderRecent = () => {
        const recs = getRecent();
        if (recs.length === 0) {
            if (recentPanel) recentPanel.classList.add('hidden');
            return;
        }
        if (recentPanel) recentPanel.classList.remove('hidden');
        if (recentList) {
            recentList.innerHTML = recs.map((r, i) => 
                `<button type="button" class="flw-recent-chip" data-idx="${i}" title="${r.display_name}">
                    🕒 ${r.city || r.display_name.split(',')[0]}
                </button>`
            ).join('');
            
            // Re-bind clicks
            recentList.querySelectorAll('.flw-recent-chip').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.dataset.idx, 10);
                    selectManualLocation(recs[idx]);
                });
            });
        }
    };

    // Shared UI renderer for weather/soil card
    const renderLocationCard = (data, container) => {
        const tempStr  = data.temp     != null ? `${data.temp.toFixed(1)}°C`       : '—';
        const humStr   = data.humidity != null ? `${Math.round(data.humidity)}%`   : '—';
        const rainStr  = data.rain     != null ? `${data.rain.toFixed(1)} mm`      : '—';
        const seasonLabel = { Summer: '☀️ Summer / Zaid', Rainy: '🌧️ Rainy / Kharif', Winter: '❄️ Winter / Rabi' };

        container.innerHTML = `
            <div class="loc-header">
                <span class="loc-pin">📍</span>
                <div class="loc-place">
                    <strong>${data.city || 'Farm Location'}</strong>
                    ${data.state ? `<span class="loc-region">${data.state}${data.country ? ', ' + data.country : ''}</span>` : ''}
                    <em class="loc-coords">${data.lat.toFixed(4)}°N, ${data.lon.toFixed(4)}°E</em>
                </div>
                <div class="loc-weather-bubble" title="${data.weatherLabel}">
                    <span class="loc-weather-icon">${data.weatherIcon}</span>
                    <span class="loc-weather-desc">${data.weatherLabel}</span>
                </div>
            </div>
            <div class="loc-stats">
                <div class="loc-stat">
                    <span class="loc-stat-icon">🌡️</span>
                    <span class="loc-stat-val">${tempStr}</span>
                    <span class="loc-stat-label">Temperature</span>
                </div>
                <div class="loc-stat">
                    <span class="loc-stat-icon">💧</span>
                    <span class="loc-stat-val">${humStr}</span>
                    <span class="loc-stat-label">Humidity</span>
                </div>
                <div class="loc-stat">
                    <span class="loc-stat-icon">🌧️</span>
                    <span class="loc-stat-val">${rainStr}</span>
                    <span class="loc-stat-label">Precipitation</span>
                </div>
                <div class="loc-stat loc-stat-season">
                    <span class="loc-stat-icon">🌱</span>
                    <span class="loc-stat-val loc-season-val">${seasonLabel[data.season] || data.season}</span>
                    <span class="loc-stat-label">Season Detected</span>
                </div>
            </div>
            <div class="loc-soil-row">
                <span class="loc-soil-badge">🪱 Soil: <strong>${data.soilType}</strong></span>
                <span class="loc-ph-badge">🧪 pH: <strong>${data.ph != null ? data.ph.toFixed(1) : '6.8'}</strong></span>
            </div>
            <div id="forecastContainer">${ui.renderForecast(data.forecast)}</div>
            <p class="loc-note">✅ Environmental conditions applied. Calculating recommendations…</p>`;

        container.classList.remove('hidden');
        requestAnimationFrame(() => container.classList.add('loc-card-visible'));
    };

    const applyDataToForm = (data) => {
        if (seasonSelect && data.season) { seasonSelect.value = data.season; ui.setFieldValid(seasonSelect); }
        if (soilSelect && data.soilType) { soilSelect.value = data.soilType; ui.setFieldValid(soilSelect); }
        if (phSlider && data.ph != null) {
            const clampedPh = Math.min(14, Math.max(1, data.ph)).toFixed(1);
            phSlider.value = clampedPh;
            if (phDisplay) phDisplay.textContent = clampedPh;
        }
        if (activeLoc) {
            activeLoc.textContent = data.city || data.state || 'Location Set';
            activeLoc.classList.remove('hidden');
        }
    };

    const switchTab = (toManual) => {
        if (toManual) {
            tabGps?.classList.remove('active');
            tabMan?.classList.add('active');
            panelGps?.classList.add('hidden');
            panelMan?.classList.remove('hidden');
            renderRecent();
        } else {
            tabMan?.classList.remove('active');
            tabGps?.classList.add('active');
            panelMan?.classList.add('hidden');
            panelGps?.classList.remove('hidden');
        }
    };

    tabGps?.addEventListener('click', () => switchTab(false));
    tabMan?.addEventListener('click', () => switchTab(true));

    // GPS Flow
    if (locBtn) {
        locBtn.addEventListener('click', async () => {
            locBtn.disabled = true;
            locBtn.innerHTML = '<span class="loc-spinner"></span> Detecting…';

            try {
                const data = await loc.getLocationData(); // falls back to getFarmData(lat,lon)
                applyDataToForm(data);
                if (locCard) renderLocationCard(data, locCard);
                ui.showToast(`📍 ${data.city || 'Location detected'} — generating recommendations!`, 'success', 3000);

                setTimeout(() => { ui.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }, 700);
            } catch (err) {
                ui.showToast('GPS Denied or Unavailable. Switching to Manual Entry.', 'error', 4000);
                switchTab(true);
            } finally {
                locBtn.disabled = false;
                locBtn.innerHTML = '📍 Use My Location';
            }
        });
    }

    // Manual Entry Flow
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (clearBtn) clearBtn.hidden = query.length === 0;
            
            if (query.length < 3) {
                if (suggBox) suggBox.classList.add('hidden');
                return;
            }

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                if (suggBox) {
                    suggBox.innerHTML = '<div class="flw-sug-spinner"><span class="loc-spinner"></span> Searching…</div>';
                    suggBox.classList.remove('hidden');
                }
                const results = await loc.searchPlaces(query);
                
                if (!suggBox) return;
                if (results.length === 0) {
                    suggBox.innerHTML = '<div class="flw-sug-spinner">No locations found.</div>';
                    return;
                }

                suggBox.innerHTML = results.map((r, i) => `
                    <div class="flw-suggestion-item" role="option" tabindex="0" data-idx="${i}">
                        <span class="flw-sug-pin">🌍</span>
                        <div>
                            <div class="flw-sug-main">${r.city || r.display_name.split(',')[0]}</div>
                            <div class="flw-sug-sub">${r.display_name}</div>
                        </div>
                    </div>
                `).join('');

                suggBox.querySelectorAll('.flw-suggestion-item').forEach(el => {
                    el.addEventListener('click', (e) => {
                        const idx = parseInt(e.currentTarget.dataset.idx, 10);
                        selectManualLocation(results[idx]);
                    });
                });
            }, 600); // 600ms debounce
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) { searchInput.value = ''; searchInput.focus(); }
            clearBtn.hidden = true;
            if (suggBox) suggBox.classList.add('hidden');
            if (manLocDisp) manLocDisp.classList.add('hidden');
            if (manLocBtn) manLocBtn.disabled = true;
            currentSelectedLocation = null;
        });
    }

    const selectManualLocation = (item) => {
        currentSelectedLocation = item;
        saveRecent(item);
        
        if (suggBox) suggBox.classList.add('hidden');
        if (recentPanel) recentPanel.classList.add('hidden');
        if (searchInput) {
            searchInput.value = item.display_name;
            if (clearBtn) clearBtn.hidden = false;
        }

        if (manLocDisp) {
            manLocDisp.innerHTML = `
                <span class="flw-selected-pin">✅</span>
                <div style="flex:1;">
                    <div class="flw-selected-name">${item.city || item.display_name.split(',')[0]}</div>
                    <div class="flw-selected-meta">${item.display_name}</div>
                </div>
                <button type="button" class="flw-selected-change" onclick="document.getElementById('locationSearch').focus();">Change</button>
            `;
            manLocDisp.classList.remove('hidden');
        }
        if (manLocErr) manLocErr.classList.add('hidden');
        if (manLocBtn) manLocBtn.disabled = false;
    };

    if (manLocBtn) {
        manLocBtn.addEventListener('click', async () => {
            if (!currentSelectedLocation) {
                if (manLocErr) { manLocErr.textContent = 'Please select a location first.'; manLocErr.classList.remove('hidden'); }
                return;
            }

            manLocBtn.disabled = true;
            manLocBtn.innerHTML = '<span class="loc-spinner"></span> Gathering data…';
            if (manLocErr) manLocErr.classList.add('hidden');

            try {
                const { lat, lon, display_name, city, state, country } = currentSelectedLocation;
                // Pre-fetch geo string to save Nominatim reverse-geocode ping
                const data = await loc.getFarmData(lat, lon, { city, state, country, display: display_name });
                
                applyDataToForm(data);
                
                // Show card preview directly above button in manual mode
                renderLocationCard(data, locCard);
                // Move locCard into manual panel visually
                panelMan.insertBefore(locCard, manLocBtn);

                ui.showToast(`📍 ${data.city || 'Location selected'} — generating recommendations!`, 'success', 3000);

                setTimeout(() => { ui.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }, 700);

            } catch (err) {
                if (manLocErr) { manLocErr.textContent = 'Failed to fetch weather data for this location.'; manLocErr.classList.remove('hidden'); }
            } finally {
                manLocBtn.disabled = false;
                manLocBtn.innerHTML = '🌾 Use This Location';
            }
        });
    }

    // Init recent locations if they exist
    renderRecent();    // ── Main Recommendation Handler ───────────────────────────────────────────

    const handleRecommendations = async () => {
        const soilType     = soilSelect?.value || '';
        const season       = seasonSelect?.value || '';
        const phLevel      = parseFloat(phSlider?.value ?? 7);
        const previousCrop = document.getElementById('previousCrop')?.value.trim() ?? '';
        const landArea     = document.getElementById('landArea')?.value || '1.0';

        const formData = { soilType, season, phLevel, previousCrop, landArea };

        // Validate
        const errors = validateInputs(formData);
        if (errors.length > 0) {
            if (!soilType) ui.setFieldInvalid(soilSelect, 'Please select a soil type.');
            if (!season)   ui.setFieldInvalid(seasonSelect, 'Please select a season.');
            ui.showToast(errors[0], 'error');
            return;
        }

        // Scroll to results
        document.getElementById('recommendationOutput')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        ui.recommendationTitle.classList.remove('sr-only');
        ui.showSkeleton();

        // ── Extreme pH Interception ───────────────────────────────────────────
        if (phLevel < 5 || phLevel > 8) {
            const isAcidic = phLevel < 5;
            ui.recommendationTitle.textContent = isAcidic
                ? '⚠️ Acidic Soil — Management Required'
                : '⚠️ Alkaline Soil — Management Required';

            await new Promise(r => setTimeout(r, 400));
            ui.resultsContainer.innerHTML = '';

            const warningColor  = isAcidic ? '#ef4444' : '#f97316';
            const warningBg     = isAcidic ? '#fef2f2' : '#fff7ed';
            const warningBorder = isAcidic ? '#fca5a5' : '#fdba74';
            const icon   = isAcidic ? '🧪' : '🌿';
            const action = isAcidic ? 'raise soil pH' : 'lower soil pH';

            ui.resultsContainer.innerHTML = `
                <div class="ph-alert" style="background:${warningBg}; border-color:${warningBorder};">
                    <div class="ph-alert-icon">${icon}</div>
                    <h3 class="ph-alert-title" style="color:${warningColor};">
                        ${isAcidic ? 'Critical: Soil Too Acidic' : 'Critical: Soil Too Alkaline'}
                    </h3>
                    <p class="ph-alert-body">
                        A pH of <strong>${phLevel.toFixed(1)}</strong> is outside the safe planting range (5.0–8.0).
                        You must ${action} before any crops can successfully establish. Get the full remediation plan below.
                    </p>
                    <button id="guidanceBtn" class="btn-primary btn-alert" aria-label="Get soil adjustment guidance">
                        📋 Get 10-Point Remediation Plan
                    </button>
                </div>`;

            document.getElementById('guidanceBtn').onclick = async () => {
                document.getElementById('guidanceBtn').disabled = true;
                document.getElementById('guidanceBtn').textContent = 'Loading plan…';
                try {
                    const guidance = await api.getSoilGuidance({ ...formData, action });
                    ui.recommendationTitle.textContent = '🌱 Soil Remediation Plan';
                    ui.renderSoilGuidance(guidance);
                    ui.showToast('Remediation plan loaded. Complete all steps before planting.', 'info', 5000);
                } catch (err) {
                    ui.showToast('Error loading guidance. Please try again.', 'error');
                    document.getElementById('guidanceBtn').disabled = false;
                    document.getElementById('guidanceBtn').textContent = '📋 Get 10-Point Remediation Plan';
                }
            };
            return;
        }

        // ── Normal Flow ───────────────────────────────────────────────────────
        try {
            ui.recommendationTitle.textContent = '🌾 Crop Recommendations';

            const crops = await api.getRecommendations(formData);

            selectedCropsForComparison = [];
            updateCompareFab();

            ui.renderRecommendations(crops, soilType, landArea, async (type, cropName, soil) => {
                const typeLabel = { fertilizer: 'Fertilizer Guide', pest: 'Pest Control Guide', sustainable: 'Sustainable Practices' };
                const typeIcon  = { fertilizer: '🧪', pest: '🐛', sustainable: '♻️' };
                ui.showModal(`${typeIcon[type] || ''} ${typeLabel[type] || type}: ${cropName}`, '');
                try {
                    const items = await api.getDetails(type, cropName, soil);
                    ui.modal.text.innerHTML = ui.renderDetailList(items);
                } catch (err) {
                    ui.modal.text.innerHTML = '<p class="error-text">Could not load details. Please try again.</p>';
                }
            }, (isSelected, crop) => {
                if (isSelected) {
                    if (selectedCropsForComparison.length >= 2) {
                        ui.showToast('You can only compare 2 crops at a time.', 'info');
                        // Uncheck the latest one? We'll let the user handle it but limit the state
                        selectedCropsForComparison.shift();
                    }
                    selectedCropsForComparison.push(crop);
                } else {
                    selectedCropsForComparison = selectedCropsForComparison.filter(c => c.name !== crop.name);
                }
                updateCompareFab();
            });

            // ── Dynamic 3D Re-init ──────────────────────────────────────────
            if (window.VanillaTilt) {
                const cards = document.querySelectorAll('.crop-card');
                VanillaTilt.init(cards);
            }
            
            // Simple fade-in for cards
            const cards = document.querySelectorAll('.crop-card');
            cards.forEach((c, idx) => {
                c.style.opacity = '1';
                // Animate rings if present
                const ring = c.querySelector('.score-ring-progress');
                if (ring) {
                    ring.style.strokeDashoffset = ring.getAttribute('data-offset');
                }
            });

            ui.showToast(`Found ${crops.length} recommendations for your soil!`, 'success');
        } catch (err) {
            ui.resultsContainer.innerHTML = `
                <div class="error-state">
                    <span>⚠️</span>
                    <p>Something went wrong: ${err.message}</p>
                    <button onclick="location.reload()" class="btn-secondary">Reload Page</button>
                </div>`;
            ui.showToast('Recommendation failed. Please try again.', 'error');
        }
    };

    // ── Form Submit ───────────────────────────────────────────────────────────

    ui.form?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleRecommendations();
    });

    // ── Modal Close (X button + Escape key + backdrop click) ──────────────────

    window.closeModal = () => ui.closeModal();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') ui.closeModal();
    });

    document.getElementById('aiContentModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) ui.closeModal();
    });

    // ── Contact Form ──────────────────────────────────────────────────────────

    const contactForm = document.getElementById('contactForm');
    contactForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = contactForm.querySelector('button[type=submit]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';

        try {
            const res = await fetch('https://formspree.io/f/myzjezyd', {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { Accept: 'application/json' }
            });

            if (res.ok) {
                ui.showToast("Message sent successfully! We'll get back to you soon.", 'success', 5000);
                contactForm.reset();
            } else {
                ui.showToast('Failed to send message. Please try again.', 'error');
            }
        } catch (err) {
            ui.showToast('Network error. Check your connection and try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message ✉️';
        }
    });

});
