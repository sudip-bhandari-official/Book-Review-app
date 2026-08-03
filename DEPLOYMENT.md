# 🚀 Deploying BookNest — Vercel (frontend) + Render (backend) + MongoDB Atlas

This app is split into two pieces that deploy separately:

| Piece      | Where it goes | Tech              |
|------------|---------------|-------------------|
| Frontend   | **Vercel**    | React + Vite SPA  |
| Backend    | **Render**    | Node.js / Express |
| Database   | **MongoDB Atlas** (free tier) | MongoDB |

The three setup steps below walk you through everything end-to-end.

---

## 0. Prerequisites

- A free account on [vercel.com](https://vercel.com/signup) (GitHub login easiest)
- A free account on [render.com](https://render.com/register)
- A free account on [mongodb.com/atlas](https://www.mongodb.com/atlas/database)
- This repo pushed to GitHub

---

## 1. Set up MongoDB Atlas (database)

1. Log in to MongoDB Atlas → **Build a Database** → choose **M0 (Free)** → pick a region close to you (e.g. AWS `eu-west-1` or `ap-south-1` for Pokhara).
2. When the cluster is ready, click **Connect** → **Drivers** → Node.js → copy the connection string. It looks like:
   ```
   mongodb+srv://<dbUser>:<dbPassword>@cluster0.abcde.mongodb.net/booknest?retryWrites=true&w=majority
   ```
3. Replace `<dbUser>` and `<dbPassword>` with the database user/password you created under **Database Access**.
4. Under **Network Access**, add IP `0.0.0.0/0` (allow from anywhere — Render/Vercel don't give fixed IPs on free tiers).

> ⚠️ Paste this aside — you'll need it in step 2.

---

## 2. Deploy the backend to Render

You can deploy either via the **Blueprint** (one click) or manually.

### Option A — Blueprint (easiest, uses `render.yaml`)

1. Commit & push this repo to GitHub.
2. Go to Render Dashboard → **Blueprints** → **New Blueprint Instance** → select the repo.
3. Render reads `render.yaml` at the repo root and pre-fills everything. You will be asked for:
   - `MONGODB_URI` → paste the Atlas connection string from step 1.
   - `CORS_ORIGINS` → for now put `http://localhost:3000`; we'll add the Vercel URL after step 3.
4. Click **Apply**. After a minute or two the service is live at something like
   ```
   https://booknest-backend.onrender.com
   ```
   Visit `https://booknest-backend.onrender.com/health` — you should see `{"status":"ok", ...}`.

### Option B — Manual Web Service

1. Render Dashboard → **New** → **Web Service** → connect your GitHub repo.
2. Fill in:
   - **Name**: `booknest-backend`
   - **Root Directory**: `Backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
3. Under **Environment Variables** add:
   ```
   NODE_ENV          = production
   MONGODB_URI       = <paste Atlas string>
   JWT_SECRET        = <long random string, e.g. openssl rand -hex 32>
   ADMIN_SECRET_KEY  = <another long random string>
   CORS_ORIGINS      = http://localhost:3000
   ```
4. Click **Create Web Service**.
5. Copy the public URL Render assigns (e.g. `https://booknest-backend.onrender.com`) and verify `/health` works.

> 💡 **Note on cold starts:** Free-tier Render services spin down after ~15 min of inactivity. The first request after that will take 30–60 s. Upgrade to a paid plan to avoid this.

---

## 3. Deploy the frontend to Vercel

1. Push the repo to GitHub if you haven't already.
2. Go to [vercel.com/new](https://vercel.com/new) → import the repo.
3. Configure the project:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto)
   - **Output Directory**: `dist` (auto)
4. Before clicking Deploy, open **Environment Variables** and add:
   ```
   VITE_API_URL = https://booknest-backend.onrender.com
   ```
   (use *your* Render backend URL from step 2 — **no trailing slash**)
5. Click **Deploy**. After ~1 minute you'll get a URL like:
   ```
   https://<your-project>.vercel.app
   ```

### Wire up CORS

Now that the frontend has a real URL, return to Render → your backend service →
**Environment** → edit `CORS_ORIGINS` to include both the Vercel URL and the local dev origin:

```
CORS_ORIGINS=https://<your-project>.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

Save and let Render redeploy.

> ⚠️ If you add a custom domain later, add it to `CORS_ORIGINS` too.

---

## 4. Smoke test

- Open your Vercel URL. The footer should show **Base URL: `https://<your-backend>.onrender.com`** (not `localhost:5000`).
- Register a new user (Sign up).
- Click ❤️ on a book, submit a review.
- Try **Upload Contribution** (upload a JPG/PNG cover) — it should hit the backend and return "Contribution approved".
- Hit `https://<your-backend>.onrender.com/health` — `mongo: "connected"`.

If anything is broken, check:
- Render logs for the backend (Render → service → Logs)
- Browser DevTools → Network tab for failing requests (look for CORS errors or 500s)
- `VITE_API_URL` in Vercel → Settings → Environment Variables (must start with `VITE_`!)

---

## 5. Creating an Admin user

The backend exposes `/auth/backdoor-admin` (guarded by `ADMIN_SECRET_KEY`) for bootstrapping admins.
In the frontend footer, click **Backdoor Admin Portal** and enter the `ADMIN_SECRET_KEY` you set in step 2.

For production hardening you should:
1. Remove or gate the `backdoor-admin` route after the first admin is created.
2. Rotate `JWT_SECRET` and `ADMIN_SECRET_KEY` periodically.
3. Never commit `.env` files (already covered by `.gitignore`).

---

## 6. (Optional) Custom domains

- **Vercel**: Project → Settings → Domains → add your domain, follow DNS instructions.
- **Render**: Service → Settings → Custom Domains.
- After adding, put **both new domains** into `CORS_ORIGINS` on Render and re-deploy the frontend (so `VITE_API_URL` still points at the backend — if you keep the backend on Render's default `onrender.com` subdomain you don't need to change Vercel).

---

## Local dev reminder

```bash
# Terminal 1 — backend
cd Backend
cp .env.example .env   # set MONGODB_URI etc.
npm install
npm run dev            # starts on :5000 with --watch

# Terminal 2 — frontend
cd frontend
cp .env.example .env   # VITE_API_URL defaults to http://localhost:5000
npm install
npm run dev            # starts on :3000
```

---

## Project files added / changed for deployment

```
.
├── render.yaml               # Render Blueprint (one-click backend deploy)
├── DEPLOYMENT.md             # this file
├── .gitignore                # root ignores
├── Backend/
│   ├── server.js             # now configurable CORS, health-check, error handlers
│   ├── package.json          # added start/dev scripts + engines
│   ├── .env.example          # template of required env vars
│   └── .gitignore
└── frontend/
    ├── vercel.json           # SPA rewrites for Vercel
    ├── vite.config.js        # no auto-open in prod builds
    ├── .env.example
    └── src/
        ├── config.js         # API_BASE_URL (VITE_API_URL) + toAssetUrl helper
        ├── services/api.js   # uses API_BASE_URL from config
        └── components/
            ├── BookCard.jsx       # uses toAssetUrl
            └── BookDetailModal.jsx
```

If you want I can also push these changes to your branch and open a PR — just say the word!
