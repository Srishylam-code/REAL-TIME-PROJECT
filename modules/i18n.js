/**
 * Internationalization Module
 * Simple key-based translation system for English and Hindi.
 */

export const i18n = {
    currentLang: 'en',
    
    translations: {
        en: {
            // General
            results_title: "🌾 Crop Recommendations",
            label_land_area: "Land Area (Acres)",
            help_land_area: "Enter your farm size to calculate total projected profit.",
            btn_get_started: "Get Started →",
            btn_get_recommendations: "🌾 Get Recommendations",
            
            // Stats
            temp: "Temperature",
            humidity: "Humidity",
            precip: "Precipitation",
            season_detected: "Season Detected",
            
            // Results
            total_income: "Total Projected Profit",
            suitability: "Suitability",
            highly_suitable: "Highly Suitable",
            moderate_fit: "Moderate Fit",
            low_fit: "Low Fit",
            
            // Weather
            forecast_5day: "5-Day Forecast",
        },
        hi: {
            // General
            results_title: "🌾 फसल अनुशंसाएँ",
            label_land_area: "भूमि क्षेत्र (एकड़)",
            help_land_area: "कुल अनुमानित लाभ की गणना के लिए अपने खेत का आकार दर्ज करें।",
            btn_get_started: "शुरू करें →",
            btn_get_recommendations: "🌾 अनुशंसाएँ प्राप्त करें",
            
            // Stats
            temp: "तापमान",
            humidity: "नमी",
            precip: "वर्षा",
            season_detected: "पता चला मौसम",
            
            // Results
            total_income: "कुल अनुमानित लाभ",
            suitability: "उपयुक्तता",
            highly_suitable: "अत्यधिक उपयुक्त",
            moderate_fit: "मध्यम उपयुक्त",
            low_fit: "कम उपयुक्त",
            
            // Weather
            forecast_5day: "5-दिवसीय पूर्वानुमान",
        }
    },

    init() {
        const saved = localStorage.getItem('smartcrop_lang');
        if (saved) this.setLanguage(saved);
        this.translatePage();
    },

    setLanguage(lang) {
        if (!this.translations[lang]) return;
        this.currentLang = lang;
        localStorage.setItem('smartcrop_lang', lang);
        document.documentElement.lang = lang;
        
        // Update display name
        const display = document.getElementById('currentLang');
        if (display) display.textContent = lang === 'hi' ? 'हिन्दी' : 'English';
        
        this.translatePage();
    },

    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.get(key);
            if (text) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = text;
                } else {
                    el.textContent = text;
                }
            }
        });
    },

    get(key) {
        return this.translations[this.currentLang][key] || this.translations['en'][key] || key;
    }
};
