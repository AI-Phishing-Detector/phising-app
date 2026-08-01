import pandas as pd
import numpy as np
from urllib.parse import urlparse
import joblib
import warnings

from sklearn.model_selection import GroupShuffleSplit, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# LightGBM uyarılarını gizlemek için
warnings.filterwarnings("ignore")


def get_domain(url: str) -> str:
    """URL'i standardize edip domain kısmını döndürür."""
    try:
        url_str = str(url).strip()
        if not url_str.startswith(('http://', 'https://')):
            url_str = 'http://' + url_str
        return urlparse(url_str).hostname or "unknown"
    except Exception:
        return "unknown"


def load_and_split_data(filepath: str) -> tuple:
    """Veriyi yükler, bias yaratan özellikleri siler ve GroupShuffleSplit ile böler."""
    print("Temizlenmiş ve standartlaştırılmış veri seti yükleniyor...")
    df = pd.read_csv(filepath)
    df = df.replace([np.inf, -np.inf], np.nan).dropna()
    df['domain_group'] = df['url'].apply(get_domain)

    # Yapısal veri sızıntılarını (Leakage) engellemek için silinen sütunlar
    drop_columns = [
        'url', 'is_phishing', 'domain_group',
        'alt_dizin_sayisi', 'alt_alan_adi_sayisi',
        'https_var_mi', 'kisaltma_servisi_mi',
        'url_uzunlugu', 'alan_adi_uzunlugu', 'alan_adi_uzantisi'
    ]

    X = df.drop(columns=[col for col in drop_columns if col in df.columns])
    y = df['is_phishing']
    groups = df['domain_group']

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups))

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

    print(f"Veri Bölündü -> Eğitim: {len(X_train)} satır | Test: {len(X_test)} satır\n")
    return X_train, X_test, y_train, y_test


def train_and_evaluate_models(X_train, X_test, y_train, y_test) -> tuple:
    """Modelleri eğitir, GridSearch ile optimize eder ve sonuç tablosunu döndürür."""
    models_config = {
        "Random Forest": {
            "model": RandomForestClassifier(random_state=42, n_jobs=-1),
            "params": {"n_estimators": [100, 200], "max_depth": [10, 20, None], "min_samples_split": [2, 5]}
        },
        "LightGBM": {
            "model": LGBMClassifier(random_state=42, n_jobs=-1, verbose=-1),
            "params": {"n_estimators": [100, 200], "learning_rate": [0.05, 0.1], "max_depth": [10, 20, -1]}
        },
        "XGBoost": {
            "model": XGBClassifier(eval_metric='logloss', random_state=42, n_jobs=-1),
            "params": {"n_estimators": [100, 200], "learning_rate": [0.05, 0.1], "max_depth": [3, 6, 9]}
        }
    }

    results = []
    best_overall_model = None
    best_overall_f1 = 0
    best_overall_name = ""

    for model_name, config in models_config.items():
        print(f"{model_name} için GridSearch başlatılıyor...")
        grid_search = GridSearchCV(
            estimator=config["model"],
            param_grid=config["params"],
            cv=3,
            scoring='f1',
            n_jobs=-1
        )
        grid_search.fit(X_train, y_train)

        best_model = grid_search.best_estimator_
        y_pred = best_model.predict(X_test)

        # Metrikler
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)

        print(f"Model: {model_name} | Best Params: {grid_search.best_params_}")
        print(f"Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}\n")

        results.append({
            "Model": model_name, "Accuracy": acc,
            "Precision": prec, "Recall": rec, "F1-score": f1
        })

        # Şampiyonu Güncelle
        if f1 > best_overall_f1:
            best_overall_f1 = f1
            best_overall_model = best_model
            best_overall_name = model_name

    return results, best_overall_model, best_overall_name, best_overall_f1


def print_summary_table(results: list) -> None:
    """Eğitim sonuçlarını tablo formatında terminale yazdırır."""
    print("=" * 70)
    print("MODEL KARŞILAŞTIRMA ÖZET TABLOSU")
    print("=" * 70)
    print(f"{'Model Adı':<18} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1-score':<10}")
    print("-" * 70)

    for res in results:
        print(f"{res['Model']:<18} | {res['Accuracy']:<10.4f} | {res['Precision']:<10.4f} | "
              f"{res['Recall']:<10.4f} | {res['F1-score']:<10.4f}")
    print("=" * 70)


if __name__ == "__main__":
    # 1. Dosya Yolları
    DATASET_PATH = "02_features_extracted.csv"
    OUTPUT_MODEL_PATH = "phishing_detection_model.pkl"

    # 2. Süreci Başlat
    X_train, X_test, y_train, y_test = load_and_split_data(DATASET_PATH)
    results, best_model, best_name, best_f1 = train_and_evaluate_models(X_train, X_test, y_train, y_test)

    # 3. Sonuçları Raporla ve Kaydet
    print_summary_table(results)
    print(f"\n🏆 KAZANAN MODEL: {best_name} (F1-Score: {best_f1:.4f})")

    joblib.dump(best_model, OUTPUT_MODEL_PATH)
    print(f"✅ En iyi model '{OUTPUT_MODEL_PATH}' olarak başarıyla kaydedildi.")