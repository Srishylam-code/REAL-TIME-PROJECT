/**
 * UI Management Module v3.0
 * Full-screen modal, large card images, stable score rings,
 * premium glassmorphism cards, toast system, skeleton loaders.
 */

import { formatINR } from './utils.js';
import { weatherLabel } from './location.js';
import { i18n } from './i18n.js';

// ─── DOM Selectors ────────────────────────────────────────────────────────────

export const ui = {
    form:                document.getElementById('recommendationForm'),
    resultsContainer:    document.getElementById('resultsContainer'),
    recommendationTitle: document.getElementById('recommendationTitle'),
    loader:              document.getElementById('loader'),
    phLevelRangeInput:   document.getElementById('phLevelRange'),
    phValueDisplay:      document.getElementById('phValueDisplay'),
    phCanvas:            null, // canvas removed
    offlineBanner:       document.getElementById('offlineBanner'),
    toastContainer:      document.getElementById('toastContainer'),
    modal: {
        el:     document.getElementById('aiContentModal'),
        title:  document.getElementById('modalTitle'),
        text:   document.getElementById('modalText'),
        loader: document.getElementById('modalLoader'),
    },

// ─── Loader / Skeleton ────────────────────────────────────────────────────────

    showLoader() { this.loader?.classList.remove('hidden'); },
    hideLoader() { this.loader?.classList.add('hidden'); },

    showSkeleton() {
        this.resultsContainer.innerHTML = `
            <div class="skeleton-grid">
                ${[1,2,3].map(() => `
                <div class="skeleton-card" aria-hidden="true">
                    <div class="skeleton-line w-40 h-6 mb-4"></div>
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-line w-full h-4 mt-4"></div>
                    <div class="skeleton-line w-3/4 h-4 mt-2"></div>
                    <div class="skeleton-line w-1/2 h-4 mt-2"></div>
                </div>`).join('')}
            </div>`;
    },

    hideSkeleton() {
        this.resultsContainer.querySelectorAll('.skeleton-card').forEach(el => el.remove());
    },

// ─── Toast Notifications ──────────────────────────────────────────────────────

    showToast(message, type = 'info', duration = 3500) {
        const container = this.toastContainer;
        if (!container) return;

        const icons = {
            success: `<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clip-rule="evenodd"/></svg>`,
            error:   `<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 102 0V5zm-1 8a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>`,
            info:    `<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 102 0v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('toast-visible'));
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, duration);
    },

// ─── Full-Screen Modal ────────────────────────────────────────────────────────

    showModal(title, content) {
        this.modal.title.textContent = title;
        this.modal.text.innerHTML   = content;
        this.modal.el.classList.remove('hidden');
        this.modal.el.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // lock scroll
        this.modal.el.querySelector('.modal-panel')?.focus();
    },

    closeModal() {
        this.modal.el.classList.add('hidden');
        this.modal.el.setAttribute('aria-hidden', 'true');
        this.modal.text.innerHTML = '';
        document.body.style.overflow = ''; // restore scroll
    },

// ─── pH visualizer CSS-only (canvas removed) ─────────────────────────────────

// ─── Field Validation Feedback ────────────────────────────────────────────────

    setFieldValid(fieldEl) {
        const wrapper = fieldEl.closest('.field-wrapper') || fieldEl.parentElement;
        wrapper?.classList.remove('field-invalid');
        wrapper?.classList.add('field-valid');
        const msg = wrapper?.querySelector('.field-msg');
        if (msg) { msg.textContent = ''; msg.classList.add('hidden'); }
    },

    setFieldInvalid(fieldEl, message) {
        const wrapper = fieldEl.closest('.field-wrapper') || fieldEl.parentElement;
        wrapper?.classList.remove('field-valid');
        wrapper?.classList.add('field-invalid');
        const msg = wrapper?.querySelector('.field-msg');
        if (msg) { msg.textContent = message; msg.classList.remove('hidden'); }
    },

    clearFieldState(fieldEl) {
        const wrapper = fieldEl.closest('.field-wrapper') || fieldEl.parentElement;
        wrapper?.classList.remove('field-valid', 'field-invalid');
    },

// ─── Recommendation Cards ─────────────────────────────────────────────────────

    renderRecommendations(crops, soilType, landArea, onDetailClick, onCompareChange) {
        this.resultsContainer.innerHTML = '';

        if (!crops || crops.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🌱</span>
                    <p>No suitable crops found for these conditions.</p>
                    <p class="empty-hint">Try adjusting the pH level or selecting a different season.</p>
                </div>`;
            return;
        }

        // Reveal Results title
        const titleEl = this.recommendationTitle;
        titleEl.classList.remove('sr-only');
        titleEl.textContent = i18n.get('results_title');
        

        const rankLabels = ['🥇 Best Match', '🥈 2nd Choice', '🥉 3rd Choice'];
        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        crops.forEach((crop, i) => {
            const score    = Math.min(100, Math.max(0, crop.score ?? 75));
            const badge    = score >= 80 ? 'badge-high' : score >= 50 ? 'badge-mod' : 'badge-low';
            const badgeTxt = score >= 80 ? i18n.get('highly_suitable') : score >= 50 ? i18n.get('moderate_fit') : i18n.get('low_fit');
            const ring = this._buildScoreRing(score);

            const totalIncome = crop.netIncomePerAcreINR * (parseFloat(landArea) || 1);

            const card = document.createElement('article');
            card.className = 'crop-card glass animate-fadeIn';
            card.style.animationDelay = `${i * 150}ms`;
            card.setAttribute('aria-label', `${crop.name} recommendation`);
            
            card.setAttribute('data-tilt', '');
            card.setAttribute('data-tilt-max', '7');

            card.innerHTML = `
                <div class="card-rank">${rankLabels[i] || ''}</div>
                <div class="card-header">
                    <div class="crop-icon-wrap" aria-hidden="true">${crop.icon || '🌿'}</div>
                    <div class="card-title-block">
                        <h3 class="crop-name">${crop.name}</h3>
                        <span class="badge ${badge}">${badgeTxt}</span>
                    </div>
                    <div class="score-ring-wrap" title="Suitability score: ${score}/100">
                        ${ring}
                        <span class="score-label">${score}<small>/100</small></span>
                    </div>
                </div>
                
                <!-- Comparison Checkbox -->
                <div class="compare-toggle">
                    <input type="checkbox" id="compare-${i}" class="compare-cb">
                    <label for="compare-${i}">Add to Comparison</label>
                </div>

                <p class="crop-detail-text">${crop.details}</p>
                <div class="metrics-grid">
                    <div class="metric highlight">
                        <span class="metric-icon">💰</span>
                        <span class="metric-label">${i18n.get('total_income')} (${landArea} Acres)</span>
                        <span class="metric-val income">~${formatINR(totalIncome)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-icon">📈</span>
                        <span class="metric-label">Yield Potential</span>
                        <span class="metric-val">${crop.yield}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-icon">🧪</span>
                        <span class="metric-label">Key Fertilizers</span>
                        <span class="metric-val fert-pills">${
                            Array.isArray(crop.fertilizer)
                                ? crop.fertilizer.map(f => `<span class="fert-pill">${f}</span>`).join('')
                                : `<span class="fert-pill">${crop.fertilizer}</span>`
                        }</span>
                    </div>
                    <div class="metric">
                        <span class="metric-icon">🌍</span>
                        <span class="metric-label">Market Insight</span>
                        <span class="metric-val">${crop.marketPriceInsight}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-guide" data-type="fertilizer" data-crop="${crop.name}">🧪 Guide</button>
                    <button class="btn-guide" data-type="pest" data-crop="${crop.name}">🐛 Pest</button>
                    <button class="btn-guide" data-type="sustainable" data-crop="${crop.name}">♻️ Eco</button>
                </div>`;

            card.querySelectorAll('.btn-guide').forEach(btn => {
                btn.onclick = () => onDetailClick(btn.dataset.type, crop.name, soilType);
            });

            const cb = card.querySelector('.compare-cb');
            cb.onchange = () => onCompareChange(cb.checked, crop);

            grid.appendChild(card);
        });

        this.resultsContainer.appendChild(grid);
    },

    /**
     * Builds an SVG circular progress ring.
     * NOTE: No CSS transition on stroke-dashoffset to prevent
     * re-animation / flickering when buttons are clicked later.
     */
    _buildScoreRing(score) {
        const r = 32, cx = 40, cy = 40, stroke = 6;
        const circ  = 2 * Math.PI * r;
        const offset = circ - (score / 100) * circ;
        const color  = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

        return `<svg class="score-svg" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="${stroke}"/>
            <circle class="score-ring-progress" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
                stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${circ.toFixed(2)}"
                data-offset="${offset.toFixed(2)}"
                stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
        </svg>`;
    },

// ─── Soil Guidance ────────────────────────────────────────────────────────────

    renderSoilGuidance(guidance) {
        const { title, points } = guidance;
        const isAlkaline  = title.toLowerCase().includes('alkal') || title.toLowerCase().includes('sodic');
        const isOptimal   = title.toLowerCase().includes('optimal');
        const accentColor = isOptimal ? '#22c55e' : isAlkaline ? '#f97316' : '#ef4444';
        const bgColor     = isOptimal ? '#f0fdf4' : isAlkaline ? '#fff7ed' : '#fef2f2';
        const borderColor = isOptimal ? '#86efac' : isAlkaline ? '#fed7aa' : '#fecaca';

        let html = `
            <div class="soil-guidance-banner" style="background:${bgColor}; border-color:${borderColor};">
                <h3 class="soil-guidance-title" style="color:${accentColor};">${title}</h3>
                <p class="soil-guidance-sub">Complete all steps below before attempting to plant crops.</p>
            </div>
            <ol class="guidance-list">`;

        points.forEach((point, idx) => {
            html += `<li class="guidance-item animate-fadeIn" style="animation-delay:${idx * 60}ms">
                <span class="guidance-num" style="background:${accentColor}">${idx + 1}</span>
                <span>${point}</span>
            </li>`;
        });

        html += `</ol>
            <button class="btn-return" onclick="document.getElementById('recommendationForm').scrollIntoView({behavior:'smooth'})">
                ↩ Return to Form
            </button>`;

        this.resultsContainer.innerHTML = html;
        this.recommendationTitle.classList.remove('sr-only');
    },

// ─── Modal Detail Lists ───────────────────────────────────────────────────────

    renderDetailList(items) {
        let html = '<ul class="detail-list">';
        items.forEach(item => {
            html += `<li class="detail-item"><span class="detail-bullet">✓</span><span>${item}</span></li>`;
        });
        html += '</ul>';
        return html;
    },

// ─── Offline Banner (kept for completeness, hidden by default) ────────────────

    showOfflineBanner() {
        const banner = this.offlineBanner;
        if (banner) { banner.classList.remove('hidden'); banner.classList.add('banner-visible'); }
    },

    hideOfflineBanner() {
        const banner = this.offlineBanner;
        if (banner) { banner.classList.remove('banner-visible'); banner.classList.add('hidden'); }
    },

    renderForecast(forecast) {
        if (!forecast || forecast.length === 0) return '';
        
        let html = `<div class="forecast-title" style="font-weight:700; margin-bottom:10px; color:var(--slate-700); font-size:14px; margin-top:15px;">${i18n.get('forecast_5day')}</div>`;
        html += '<div class="forecast-grid">';
        
        forecast.forEach(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString(i18n.currentLang, { weekday: 'short' });
            const weather = weatherLabel(day.code);
            
            html += `
                <div class="forecast-item">
                    <span class="forecast-day">${dayName}</span>
                    <span class="forecast-icon" title="${weather.label}">${weather.icon}</span>
                    <div class="forecast-temp">
                        <span class="high">${Math.round(day.max)}°</span>
                        <span class="low" style="opacity:0.6; font-size:0.9em; margin-left:3px;">${Math.round(day.min)}°</span>
                    </div>
                    <div class="forecast-prob" style="font-size:10px; margin-top:4px; color:var(--blue-500); font-weight:600;" title="Precipitation Probability">${day.prob}% 💧</div>
                </div>`;
        });
        
        html += '</div>';
        return html;
    }
};
