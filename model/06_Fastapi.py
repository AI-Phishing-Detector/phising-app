import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import model_service

app = FastAPI(title="Phishing Detection API", description="Yapay Zeka Destekli Oltalama Tespiti")


class URLInput(BaseModel):
    url: str


@app.post("/predict")
def predict_phishing(data: URLInput):
    try:
        # 1. Gelen URL'yi doğrudan model_service'e gönderiyoruz
        analysis_result = model_service.analyze_url(data.url)

        # 2. Threshold (Baraj) değerini doğrudan servisin içinden okuyoruz
        threshold = model_service.PHISHING_THRESHOLD

        # 3. Model_service'ten dönen yanıtı (0-100 arası), API'nin beklediği formata (0.0 - 1.0) dönüştürüyoruz
        phishing_prob = analysis_result["details"]["phishingProbability"] / 100.0
        safe_prob = analysis_result["details"]["safeProbability"] / 100.0

        is_phishing = analysis_result["verdict"] == "dangerous"
        confidence = phishing_prob if is_phishing else safe_prob

        # 4. JSON Yanıtını Döndürüyoruz
        return {
            "url": data.url,
            "is_phishing": is_phishing,
            "confidence_score": round(confidence, 4),
            "phishing_probability": round(phishing_prob, 4),
            "threshold_used": threshold,
            "features_analyzed": analysis_result["features"],
            "analysis_report": analysis_result  # Gelişmiş kalibrasyon ve mesaj detayları
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sunucu analiz sırasında bir hata ile karşılaştı: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)