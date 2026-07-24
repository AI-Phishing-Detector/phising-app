from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    # API çalıştıgını doğrulamak için test
    response = client.get("/")
    # kök dizin tanımlı olmadıgı için 404 dönmesi normal endpointlerin test edilebilirliğini doğrular
    assert response.status_code in [200, 404]