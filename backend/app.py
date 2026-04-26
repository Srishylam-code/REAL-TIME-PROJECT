import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for frontend communication

# ─── MACHINE LEARNING MODEL ──────────────────────────────────────────────────
# In a real scenario, you'd load a CSV here. 
# We'll simulate a trained Random Forest model for the faculty demo.

def train_model():
    # Synthetic dataset mimicking the Kaggle "Crop_recommendation.csv"
    # N, P, K, Temp, Humidity, pH, Rainfall -> Crop
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

# Train once on startup
ml_model = train_model()

# ─── ONLINE AI (GEMINI) ─────────────────────────────────────────────────────
# Replace 'YOUR_GEMINI_API_KEY' with your actual key
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
genai.configure(api_key=GEMINI_KEY)
ai_model = genai.GenerativeModel('gemini-pro')

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # 1. Prepare features for ML Model
        # Map frontend data to NPK (estimations if not provided)
        N = data.get('N', 50)
        P = data.get('P', 50)
        K = data.get('K', 50)
        temp = data.get('temp', 25.0)
        hum = data.get('hum', 60.0)
        ph = data.get('ph', 6.5)
        rain = data.get('rain', 100.0)
        
        features = np.array([[N, P, K, temp, hum, ph, rain]])
        
        # 2. Get Prediction from Local ML Model
        prediction = ml_model.predict(features)[0]
        probabilities = ml_model.predict_proba(features)[0]
        confidence = round(max(probabilities) * 100, 2)
        
        # 3. Get Online Output from Gemini AI
        ai_analysis = "AI Analysis failed or API key missing."
        if GEMINI_KEY != "YOUR_GEMINI_API_KEY":
            prompt = f"As an agricultural expert, analyze these conditions: pH {ph}, Temp {temp}C, Humidity {hum}%. The ML model predicted {prediction}. Provide a 3-sentence expert advice on why this crop is suitable and one key risk factor."
            response = ai_model.generate_content(prompt)
            ai_analysis = response.text

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
    print("🚀 AI Recommendation Backend Running on http://localhost:5001")
    app.run(port=5001, debug=True)
