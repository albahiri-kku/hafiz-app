# Hafiz App — Deployment Guide

## Prerequisites

- Node 20+ / npm 10+
- A running Hafiz API server (see `../hafiz/`)

---

## Local Development (HTTPS)

```bash
npm install
npm run dev -- --host
# Opens https://localhost:5173
# Vite proxies /api, /mushaf, /fonts → http://localhost:8000
```

Leave `VITE_API_URL` empty in `.env.development` — the Vite proxy handles everything.

---

## Production Build

```bash
# Set your backend URL first
echo "VITE_API_URL=https://api.hafiz.app" >> .env.production

npm run build        # outputs to dist/
npm run preview      # local preview of dist/
```

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in [vercel.com](https://vercel.com).
3. Set the **Root Directory** to `hafiz-app` (if using a monorepo).
4. Add environment variable:
   - `VITE_API_URL` = `https://your-backend.com`
5. Deploy — `vercel.json` handles SPA rewriting automatically.

### تنبيه: التحقق من الـ Remote الصحيح قبل كل push

Vercel يراقب **`albahiri-kku/hafiz-app`** فقط — أي push إلى `quran-hafiz-guide` لن يُحرّك deploy.

```bash
# تحقق دائماً قبل push
git remote -v
# يجب أن يظهر:
# origin   https://github.com/albahiri-kku/hafiz-app.git

# تحقق من tracking branch
git branch -vv
# يجب أن يظهر: [origin/main] وليس [origin-old/main]

# إذا كان tracking خاطئاً — أصلحه
git branch -u origin/main main
```

### إجبار Vercel على إعادة البناء

إذا ظهر آخر commit على GitHub لكن Vercel لم يبنِ:

```bash
git commit --allow-empty -m "chore: force vercel rebuild" && git push origin main
```

---

## Deploy to Netlify

```bash
npm run build
# Publish directory: dist
```

Create `dist/_redirects`:
```
/*  /index.html  200
```

---

## Environment Variables

| Variable       | Default | Description                                      |
|----------------|---------|--------------------------------------------------|
| `VITE_API_URL` | `""`    | Base URL for Hafiz API. Empty = use Vite proxy.  |

---

## Routes

| Path     | Component     | Description             |
|----------|---------------|-------------------------|
| `/`      | LandingPage   | Marketing landing page  |
| `/app`   | AppPage       | Recitation app          |
| `/about` | AboutPage     | About the project       |
| `/*`     | → `/`         | Catch-all redirect      |
