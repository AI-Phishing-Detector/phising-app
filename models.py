from sqlalchemy import Column, Integer, String, DateTime, JSON
from database import Base
import datetime

# Sorgulanan siteleri kaydedeceğimiz tablo yapısı
class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    features = Column(JSON, nullable=True)  # Siteden çıkarılan özellikler
    prediction = Column(String, nullable=True, default="Pending")  # Analiz sonucu
    created_at = Column(DateTime, default=datetime.datetime.utcnow)  # Kayıt tarihi