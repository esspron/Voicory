# Deployment & CI/CD

## Production URLs

| Service | URL | Platform | Region |
|---------|-----|----------|--------|
| **Website** | `https://www.voicory.com` | Vercel | Global CDN |
| **Dashboard** | `https://app.voicory.com` | Vercel | Global CDN |
| **Backend India** | `https://backendvoicory-732127099858.asia-south1.run.app` | Cloud Run | asia-south1 (Mumbai) |
| **Backend USA** | `https://backendvoicory-us-732127099858.us-central1.run.app` | Cloud Run | us-central1 (Iowa) |
| **Backend Europe** | `https://backendvoicory-eu-732127099858.europe-west1.run.app` | Cloud Run | europe-west1 (Belgium) |
| **Supabase** | `https://YOUR_SUPABASE_PROJECT_REF.supabase.co` | Supabase | ap-south-1 |

---

## Frontend Geo-Routing (lib/api.ts)
The frontend automatically selects the nearest backend based on user's timezone:
```typescript
// lib/api.ts - authFetch() handles this automatically
const BACKEND_URLS = {
  india: 'https://backendvoicory-732127099858.asia-south1.run.app',
  usa: 'https://backendvoicory-us-732127099858.us-central1.run.app',
  europe: 'https://backendvoicory-eu-732127099858.europe-west1.run.app',
};
// Use authFetch('/api/endpoint') - it auto-selects region + adds auth header
```

---

## Cloud Run Multi-Region Deployment (CI/CD)

### Architecture
```
GitHub (main branch)
    ↓ push
Cloud Build Trigger (backendvoicory)
    ↓ uses backend/cloudbuild.yaml
    ├── Step 1: Build Docker image (from backend/)
    ├── Step 2: Push to Artifact Registry
    ├── Step 3: Deploy to India (asia-south1)
    ├── Step 4: Deploy to USA (us-central1)
    └── Step 5: Deploy to Europe (europe-west1)
```

### Cloud Build Configuration
- **Trigger Name**: `backendvoicory`
- **Config File**: `backend/cloudbuild.yaml`
- **Branch**: `^main$`
- **Region**: `global`

### cloudbuild.yaml Key Points
```yaml
# Located at: backend/cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    dir: 'backend'  # CRITICAL: Build from backend/ directory
    args: ['build', '-t', 'IMAGE_NAME', '.']
  
  # Deploy steps use --update-env-vars (NOT --set-env-vars)
  # This preserves existing env vars set on the service
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk:slim'
    args: ['run', 'deploy', 'backendvoicory', '--update-env-vars=NODE_ENV=production', ...]
```

---

## ⚠️ CRITICAL: Environment Variables
Cloud Run services require env vars to be set ONCE via gcloud CLI or Console UI.
The `cloudbuild.yaml` uses `--update-env-vars` to ADD/UPDATE without overwriting all existing vars.

**Required Backend Env Vars:**
```bash
# Set via: gcloud run services update SERVICE --region=REGION --update-env-vars="KEY=VALUE,..."
SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...  # From backend/.env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # From backend/.env
OPENAI_API_KEY=sk-proj-...  # Full key from backend/.env
FACEBOOK_APP_ID=1696405601746896
FACEBOOK_APP_SECRET=d47a1640ed0afeb24a5be814af528b38
UPSTASH_REDIS_REST_URL=https://definite-sole-15581.upstash.io
UPSTASH_REDIS_REST_TOKEN=ATzdAAInc...  # From backend/.env
GOOGLE_TTS_API_KEY=AIzaSy...
NODE_ENV=production
```

### Update Env Vars on All Regions
```bash
# Read values from backend/.env and update all 3 regions
# India
gcloud run services update backendvoicory --region=asia-south1 \
  --update-env-vars="KEY1=VALUE1,KEY2=VALUE2,..."

# USA
gcloud run services update backendvoicory-us --region=us-central1 \
  --update-env-vars="KEY1=VALUE1,KEY2=VALUE2,..."

# Europe
gcloud run services update backendvoicory-eu --region=europe-west1 \
  --update-env-vars="KEY1=VALUE1,KEY2=VALUE2,..."
```

---

## Deployment Commands

### 🚀 Backend (Auto-deploy via Cloud Build)
```bash
# Just push to main - Cloud Build handles everything
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app
git add backend/
git commit -m "fix: backend changes"
git push origin main
# Automatically deploys to all 3 regions via cloudbuild.yaml
```

### 🔧 Manual Backend Deployment (Single Region)
```bash
gcloud run deploy backendvoicory \
  --source=backend/ \
  --region=asia-south1 \
  --allow-unauthenticated
```

### 📊 Check Deployment Status
```bash
# View Cloud Build history
gcloud builds list --limit=5

# Stream build logs
gcloud builds log BUILD_ID --stream

# Check service health
curl https://backendvoicory-732127099858.asia-south1.run.app/health
curl https://backendvoicory-us-732127099858.us-central1.run.app/health
curl https://backendvoicory-eu-732127099858.europe-west1.run.app/health
```

### 🌐 Frontend Dashboard (Vercel) - Manual deploy via CLI
```bash
# Deploy frontend to Vercel (app.voicory.com)
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app/frontend
npx vercel --prod --token YOUR_VERCEL_TOKEN
# Or commit and push - Vercel auto-deploys from GitHub
git add .
git commit -m "feat: frontend changes"
git push origin main
```

### 🏠 Website (Vercel) - Manual deploy via CLI
```bash
# Deploy website to Vercel (www.voicory.com)
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app/website-nextjs
npx vercel --prod --token YOUR_VERCEL_TOKEN
# Or commit and push - Vercel auto-deploys from GitHub
git add .
git commit -m "feat: website changes"
git push origin main
```

### 📦 Deploy All Three Services
```bash
cd /home/vishwasverma/vapi-in-dashboard-3/dashboard-app

# 1. Commit all changes
git add .
git commit -m "feat: update all services"
git push origin main

# Cloud Build auto-deploys backend to Cloud Run from main branch
# Vercel auto-deploys frontend and website from main branch (if connected)

# OR manual Vercel deploys:
cd frontend && npx vercel --prod
cd ../website-nextjs && npx vercel --prod
```

---

## Vercel Project IDs
| Project | Vercel Project Name |
|---------|---------------------|
| Frontend | `frontendvoicory` |
| Website | `websitevoicory` |

## Frontend Environment Variables (Vercel)
```env
VITE_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_BACKEND_URL=https://api.voicory.com
```

## Supabase Auth Configuration
- **Site URL**: `https://app.voicory.com`
- **Redirect URLs**:
  - `https://app.voicory.com/**`
  - `https://www.voicory.com/**`
  - `http://localhost:5173/**`
  - `http://localhost:3000/**`
