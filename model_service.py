from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from process_dataset import extract_features


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model_artifacts"

MODEL_PATH = MODEL_DIR / "phishing_model.pkl"
SCALER_PATH = MODEL_DIR / "phishing_scaler.pkl"
FEATURES_PATH = MODEL_DIR / "phishing_features.pkl"

PHISHING_CLASS = 0
SAFE_CLASS = 1

# Model eğitilirken kullanılmayan ham özellikler
EXCLUDED_FEATURE_COLUMNS = {
    "url_uzunlugu",
    "alan_adi_uzunlugu",
    "alt_dizin_sayisi",
    "https_var_mi",
}


def load_artifact(path: Path) -> Any:
    """
    Proje ekibi tarafından oluşturulan güvenilir model dosyasını yükler.
    """
    if not path.is_file():
        raise RuntimeError(
            f"Model dosyası bulunamadı: {path.name}"
        )

    try:
        return joblib.load(path)
    except Exception as error:
        raise RuntimeError(
            f"Model dosyası yüklenemedi: {path.name}"
        ) from error


model = load_artifact(MODEL_PATH)
scaler = load_artifact(SCALER_PATH)
expected_features = list(load_artifact(FEATURES_PATH))

if not expected_features:
    raise RuntimeError("Model özellik listesi boş olamaz.")


def analyze_url(url: str) -> dict[str, Any]:
    """
    URL özelliklerini çıkarır ve eğitilmiş model ile risk analizi yapar.
    """
    raw_features = extract_features(url)
    model_features = dict(raw_features)

    for column in EXCLUDED_FEATURE_COLUMNS:
        model_features.pop(column, None)

    tld_extension = str(
        model_features.pop(
            "alan_adi_uzantisi",
            "bilinmiyor",
        )
    ).lower()

    feature_frame = pd.DataFrame([model_features])
    feature_frame = feature_frame.reindex(
        columns=expected_features,
        fill_value=0,
    )

    target_tld_column = f"tld_{tld_extension}"

    if target_tld_column in expected_features:
        feature_frame.loc[0, target_tld_column] = 1
    elif "tld_diger" in expected_features:
        feature_frame.loc[0, "tld_diger"] = 1

    scaled_values = scaler.transform(feature_frame)
    scaled_features = pd.DataFrame(
        scaled_values,
        columns=expected_features,
    )

    prediction = int(model.predict(scaled_features)[0])
    probabilities = model.predict_proba(scaled_features)[0]

    probability_by_class = {
        int(class_name): float(probability)
        for class_name, probability in zip(
            model.classes_,
            probabilities,
        )
    }

    phishing_probability = round(
        probability_by_class.get(PHISHING_CLASS, 0.0) * 100,
        2,
    )
    safe_probability = round(
        probability_by_class.get(SAFE_CLASS, 0.0) * 100,
        2,
    )

    is_phishing = prediction == PHISHING_CLASS

    return {
        "verdict": "dangerous" if is_phishing else "safe",
        "riskScore": phishing_probability,
        "title": (
            "Şüpheli bağlantı"
            if is_phishing
            else "Güvenli bağlantı"
        ),
        "message": (
            "Bu bağlantıda oltalama saldırısıyla ilişkili "
            "olabilecek şüpheli özellikler bulundu."
            if is_phishing
            else "Bu bağlantıda model tarafından belirlenen "
            "yüksek riskli bir işarete rastlanmadı."
        ),
        "details": {
            "phishingProbability": phishing_probability,
            "safeProbability": safe_probability,
            "entropy": round(
                float(raw_features.get("entropi", 0)),
                3,
            ),
        },
        "features": raw_features,
    }