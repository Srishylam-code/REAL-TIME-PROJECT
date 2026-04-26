/**
 * Utility functions — Crop Recommendation System v2.0
 */

/** Validates form inputs, returns array of error messages (empty = valid) */
export const validateInputs = (data) => {
    const errors = [];
    if (!data.soilType)  errors.push('Please select a Soil Type.');
    if (!data.season)    errors.push('Please select a Season.');
    if (isNaN(data.phLevel) || data.phLevel < 1 || data.phLevel > 14) {
        errors.push('pH Level must be between 1 and 14.');
    }
    return errors;
};

/** Formats a number as Indian Rupee string: 45000 → "₹45,000" */
export const formatINR = (num) => {
    if (!num && num !== 0) return '—';
    return '₹' + Number(num).toLocaleString('en-IN');
};

/** Returns a debounced version of fn (fires after `wait` ms of inactivity) */
export const debounce = (fn, wait = 300) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
};

/**
 * Initialises the smoky cursor particle trail effect.
 * Automatically disabled on touch devices.
 */
export const initSmokyCursor = () => {
    // Skip on touch-only devices
    if (window.matchMedia('(hover: none)').matches) return;

    const body = document.body;

    // Main visible cursor dot
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    cursorDot.setAttribute('aria-hidden', 'true');
    body.appendChild(cursorDot);

    let lastX = 0, lastY = 0, ticking = false;

    body.addEventListener('mousemove', (e) => {
        lastX = e.clientX;
        lastY = e.clientY;

        if (!ticking) {
            requestAnimationFrame(() => {
                cursorDot.style.left = `${lastX}px`;
                cursorDot.style.top  = `${lastY}px`;

                // Spawn green smoke particle
                const particle = document.createElement('div');
                particle.className = 'cursor-smoke';
                particle.setAttribute('aria-hidden', 'true');
                particle.style.left = `${lastX}px`;
                particle.style.top  = `${lastY}px`;
                body.appendChild(particle);
                particle.addEventListener('animationend', () => particle.remove(), { once: true });

                ticking = false;
            });
            ticking = true;
        }
    });

    body.addEventListener('mouseleave', () => { cursorDot.style.opacity = '0'; });
    body.addEventListener('mouseenter', () => { cursorDot.style.opacity = '1'; });
};
