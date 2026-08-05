"""Backend ile güncel phishing modeli arasındaki bağlantı katmanı."""

from model.model_service import analyze_url

__all__ = ["analyze_url"]