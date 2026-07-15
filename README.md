# 🌌 PriceUniverse

A cinematic 3D price intelligence platform for Nigerian e-commerce.

PriceUniverse transforms online shopping into an interactive galaxy where products become planets, prices determine orbital positions, and users can visually explore market trends across multiple marketplaces.

Built as a modern full-stack application with FastAPI, React Three Fiber, PostgreSQL, Celery, and Redis.

---

## ✨ Features

-  Interactive 3D galaxy visualization
-  Search products or paste a marketplace URL
-  Camera fly-to animation
-  Dual galaxies (Jumia & Jiji)
-  Historical price tracking
-  Price drop notifications
-  Background scraping with Celery
-  REST API with FastAPI
-  PostgreSQL storage
-  Email alerts via Resend
-  AI-ready prediction pipeline

---

## 🛠 Tech Stack

### Frontend
- React
- Vite
- React Three Fiber
- Drei
- Framer Motion
- CSS Modules

### Backend
- FastAPI
- PostgreSQL (asyncpg)
- Celery
- Redis
- Cloudscraper

### DevOps
- Railway
- GitHub Actions (planned)



### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

### Frontend

```bash
cd frontend

npm install
npm run dev
```

---

## 📂 Project Structure

```
backend/
├── api/
├── scrapers/
├── database/
├── tasks/
├── models/
└── services/

frontend/
├── components/
├── scenes/
├── hooks/
├── pages/
└── services/
```

---

## 🎯 Roadmap

- [x] Product scraping
- [x] PostgreSQL storage
- [x] Search
- [x] Interactive 3D universe
- [x] Product detail panel
- [ ] Historical price charts
- [ ] AI price prediction
- [ ] User accounts
- [ ] Watchlists
- [ ] Deployment

---

## 👤 Author

**Adeoti Israel (Derin)**

Statistics Undergraduate • AI Engineer • Full Stack Developer

GitHub: https://github.com/oluwaisrael

---

## 📄 License

MIT