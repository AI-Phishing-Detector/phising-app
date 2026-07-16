# TEST SERVER

## 📂 Purpose of This Folder
This folder is prepared to test the AI model.

---

## 🛠️ Virtual Environment Setup
It is recommended to use a virtual environment to keep dependencies isolated.  
Run the following commands **before installing requirements**:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Linux/MacOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

---

## ⚙️ Requirements
Once the virtual environment is activated, install the required Python libraries:

```bash
pip install fastapi uvicorn pandas scikit-learn joblib
```

Additionally, for URL feature extraction, you may also need:

```bash
pip install tldextract requests
```

---

## ▶️ How to Run
1. Open your terminal or command prompt inside this folder.  
2. Run the following command:

```bash
uvicorn test_server:app --reload
```

---

## 🧪 How to Test
1. Once the server is running, open your browser (Chrome, Safari, etc.).  
2. Go to: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
3. In the **Swagger UI**, click on `POST /predict`.  
4. Press the **Try it out** button.  
5. Enter the URL you want to test in the request body.  
6. Click the blue **Execute** button.

---

## 🌐 Example Test URLs
- [https://www.netflix.com](https://www.netflix.com) → **Safe**  
- [http://g00gle-support.net/verify](http://g00gle-support.net/verify) → **Phishing**
