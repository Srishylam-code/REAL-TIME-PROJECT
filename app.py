import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Flask to serve static files from the root directory
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) 

# ─── MACHINE LEARNING MODEL ──────────────────────────────────────────────────
def train_model():
    # Synthetic dataset mimicking the Kaggle "Crop_recommendation.csv"
    data = [
        [90, 42, 43, 20.8, 82.0, 6.5, 202.9, 'Rice'],
        [85, 58, 41, 28.2, 73.3, 7.0, 150.2, 'Maize'],
        [60, 55, 44, 23.0, 92.3, 5.5, 100.0, 'Chickpea'],
        [104, 18, 30, 23.6, 60.3, 6.7, 140.9, 'Cotton'],
        [31, 67, 17, 24.2, 52.3, 7.8, 110.0, 'Pigeonpeas'],
        [100, 30, 50, 25.0, 80.0, 6.5, 200.0, 'Rice'],
        [40, 50, 60, 20.0, 50.0, 5.5, 80.0, 'Wheat'],
        [20, 10, 10, 30.0, 90.0, 4.5, 250.0, 'Coffee'],
        [70, 40, 20, 26.0, 85.0, 6.8, 190.0, 'Banana'],
    ]
    df = pd.DataFrame(data, columns=['N', 'P', 'K', 'temp', 'hum', 'ph', 'rain', 'label'])
    X = df.drop('label', axis=1)
    y = df['label']
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X, y)
    return model

ml_model = train_model()

# ─── ONLINE AI (GEMINI) ─────────────────────────────────────────────────────
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
if GEMINI_KEY != "YOUR_GEMINI_API_KEY":
    genai.configure(api_key=GEMINI_KEY)
    ai_model = genai.GenerativeModel('gemini-pro')
else:
    ai_model = None

# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy", "model": "loaded"})

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        N = data.get('N', 50)
        P = data.get('P', 50)
        K = data.get('K', 50)
        temp = data.get('temp', 25.0)
        hum = data.get('hum', 60.0)
        ph = data.get('ph', 6.5)
        rain = data.get('rain', 100.0)
        
        features = np.array([[N, P, K, temp, hum, ph, rain]])
        prediction = ml_model.predict(features)[0]
        probabilities = ml_model.predict_proba(features)[0]
        confidence = round(max(probabilities) * 100, 2)
        
        ai_analysis = "AI Analysis is currently unavailable. Please set a valid GEMINI_API_KEY."
        if ai_model:
            try:
                prompt = f"As an agricultural expert, analyze these conditions: pH {ph}, Temp {temp}C, Humidity {hum}%. The ML model predicted {prediction}. Provide a 3-sentence expert advice on why this crop is suitable and one key risk factor."
                response = ai_model.generate_content(prompt)
                ai_analysis = response.text
            except Exception as e:
                ai_analysis = f"AI analysis error: {str(e)}"

        return jsonify({
            "status": "success",
            "prediction": prediction,
            "confidence": f"{confidence}%",
            "ai_expert_advice": ai_analysis,
            "source": "Python Random Forest + Google Gemini AI"
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 AI Recommendation Backend Running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
