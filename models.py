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

# Yeni eklenen Kullanıcı tablosu
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    ad_soyad = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    sifre = Column(String, nullable=False)  # Gerçek projede hash'lenmeli ama şimdilik düz tutabiliriz
    created_at = Column(DateTime, default=datetime.datetime.utcnow)