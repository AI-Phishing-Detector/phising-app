from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import joblib
import warnings

# Suppress warnings for cleaner console output
warnings.filterwarnings('ignore')

# -----------------------------------------------------------------
# 1. LOAD FEATURE EXTRACTION SCRIPT
# -----------------------------------------------------------------
try:
    # Ensure your feature extraction file is named 'process_dataset.py'
    from process_dataset import extract_features
except ImportError:
    raise RuntimeError("Could not import 'process_dataset'. Make sure 'process_dataset.py' is in the same folder.")

# -----------------------------------------------------------------
# 2. LOAD ML ARTIFACTS (Brain, Scale, and Map)
# -----------------------------------------------------------------
print("[SYSTEM] Booting up Anti-Phishing AI Engine...")
try:
    model = joblib.load('phishing_model.pkl')
    scaler = joblib.load('phishing_scaler.pkl')
    expected_features = joblib.load('phishing_features.pkl')
    print("[SYSTEM] AI Model and dependencies loaded successfully!")
except FileNotFoundError:
    raise RuntimeError("Missing .pkl files! Please run the training script first.")

# -----------------------------------------------------------------
# 3. INITIALIZE API & DATA MODELS
# -----------------------------------------------------------------
app = FastAPI(
    title="Phishing Detection API",
    description="Real-time URL analysis using Logistic Regression",
    version="1.0.0"
)


# Define the expected JSON payload format
class URLRequest(BaseModel):
    url: str


# -----------------------------------------------------------------
# 4. PREDICTION ENDPOINT
# -----------------------------------------------------------------
@app.post("/predict")
def predict_phishing(request: URLRequest):
    target_url = request.url

    if not target_url:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")

    try:
        # A. Extract raw features from the URL
        raw_features = extract_features(target_url)

        # B. Drop the "cheat columns" exactly as we did in training
        cheat_columns = ['url_uzunlugu', 'alan_adi_uzunlugu', 'alt_dizin_sayisi', 'https_var_mi']
        for col in cheat_columns:
            if col in raw_features:
                del raw_features[col]

        # Handle the TLD before turning into DataFrame
        tld_ext = raw_features.pop('alan_adi_uzantisi', 'bilinmiyor')

        # C. Convert to a single-row DataFrame
        df_live = pd.DataFrame([raw_features])

        # D. Synchronize columns with the expected feature map
        for col in expected_features:
            if col not in df_live.columns:
                df_live[col] = 0  # Fill missing columns with 0

        # E. Process TLD (One-Hot Encoding simulation)
        target_tld_col = f"tld_{tld_ext}"
        if target_tld_col in expected_features:
            df_live[target_tld_col] = 1
        else:
            # If it's a rare/unseen TLD, activate the 'other' (diger) category
            if 'tld_diger' in expected_features:
                df_live['tld_diger'] = 1

        # Force the exact column order the model expects
        df_live = df_live[expected_features]

        # F. Scale the data using the loaded scaler
        scaled_data = scaler.transform(df_live)

        # G. Make the prediction
        prediction = model.predict(scaled_data)[0]
        probabilities = model.predict_proba(scaled_data)[0]

        phishing_prob = round(probabilities[0] * 100, 2)
        safe_prob = round(probabilities[1] * 100, 2)

        # H. Prepare the response
        is_phishing = bool(prediction == 0)

        return {
            "url": target_url,
            "is_phishing": is_phishing,
            "risk_score_percentage": phishing_prob,
            "status": "🚨 DANGER: Phishing Detected!" if is_phishing else "✅ SAFE",
            "details": {
                "safe_probability": f"{safe_prob}%",
                "phishing_probability": f"{phishing_prob}%",
                "entropy": round(raw_features.get('entropi', 0), 3)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Root endpoint just to check if server is alive
@app.get("/")
def read_root():
    return {"message": "Anti-Phishing API is running. Go to /docs to test it."}