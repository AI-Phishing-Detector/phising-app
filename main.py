from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from process_dataset import extract_features
import models
from database import engine, get_db

# Veritabanında tabloları otomatik oluşturur
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Ön yüzün (Next.js) sunucuya bağlanabilmesi için gerekli izinler
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gelen verinin düzgün bir URL olmasını zorunlu tutuyoruz
class URLSorgu(BaseModel):
    url: HttpUrl

@app.get("/")
def ana_sayfa():
    return {"durum": "Backend aktif"}

@app.post("/api/v1/scan-url")
def url_tara(veri: URLSorgu, db: Session = Depends(get_db)):
    url_str = str(veri.url)
    
    # Özellik çıkarma fonksiyonunu çalıştırıp hata kontrolü yapıyoruz
    try:
        analiz_sonuclari = extract_features(url_str)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Siteden özellikler çıkarılamadı: {str(e)}"
        )
    
    # Sonuçları veritabanına kaydediyoruz
    try:
        yeni_log = models.ScanLog(
            url=url_str,
            features=analiz_sonuclari,
            prediction="Pending"
        )
        db.add(yeni_log)
        db.commit()
        db.refresh(yeni_log)
    except Exception as db_err:
        raise HTTPException(
            status_code=500,
            detail=f"Veritabanı kayıt hatası oluştu: {str(db_err)}"
        )
        
    return {
        "id": yeni_log.id,
        "url": url_str,
        "durum": "Başarılı",
        "analiz_verileri": analiz_sonuclari
    }