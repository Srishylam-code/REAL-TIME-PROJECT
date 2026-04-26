# 🌿 AI-Powered Crop Recommendation System v5.0 (Render-Ready)

A professional-grade, full-stack agricultural intelligence platform that combines **Machine Learning**, **Generative AI**, and a **Cinematic UI** to provide data-driven crop recommendations.

![Project Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)
![Tech](https://img.shields.io/badge/Stack-Python%20|%20Flask%20|%20JS-blue)
![AI](https://img.shields.io/badge/Intelligence-Random%20Forest-orange)

---

## 🚀 Key Features

### 💎 Cinematic Crop Showcase
- **High-Fidelity Visuals**: A grid of 12 critical crops with 4K-quality botanical imagery.
- **Dynamic Image Loader**: Integrated **Wikipedia API** bridge that fetches guaranteed-correct botanical thumbnails for academic accuracy.
- **Glassmorphism Design**: Modern, responsive UI with hover-zoom effects and consistent gradient overlays.

### 🧠 Pure ML Backend
- **Random Forest Classifier**: A trained ML model that predicts optimal crops based on NPK (Nitrogen, Phosphorus, Potassium), Temperature, Humidity, pH, and Rainfall.
- **Reliability Fallback**: A local heuristic engine ensures the platform provides basic recommendations even if the server is offline.

### 📍 Intelligent Farm Widgets
- **Location-Aware**: Automatic soil and weather estimation based on the user's GPS or manual search.
- **Soil Remediation**: Generates a 10-point enrichment plan for extreme soil conditions (Highly Acidic/Alkaline).
- **Profit Calculator**: Real-time scalability analysis calculating potential income based on land acreage.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.x, Flask, Gunicorn (Production Server)
- **ML/AI**: Scikit-learn (Random Forest), Pandas, NumPy, Google Generative AI (Gemini Pro)
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS3 (Variables, Grid, Flexbox), HTML5
- **APIs**: Wikipedia REST API, Open-Meteo API, Geolocation API

---

## 📦 Deployment (Render.com)

This project is optimized for a single-service deployment on **Render**.

1. **Push to GitHub**: Ensure all files (including the unified `app.py` and root `requirements.txt`) are pushed.
2. **Create Web Service**:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
3. **Deployment**: Once the build finishes, your site will be live!

---

## 💻 Local Development

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Run Application**:
   ```bash
   python app.py
   ```
3. **Access**:
   Open `http://localhost:5001` in your browser.

---

**Developed for Academic Excellence & Sustainable Agriculture.**
