# Nexus EPC Copilot

AI-powered Enterprise Project Intelligence platform for Data Center Construction, featuring an AI-Ready MEP Thermal Clash Engine.

## Project Structure
- `/frontend`: Next.js (App Router), Tailwind CSS, React Flow client.
- `/backend`: FastAPI Python server with NetworkX Graph Clash Engine.

## Source Code & Hosting

- **GitHub Repository**: The source code is maintained on GitHub. Clone it using:
  ```bash
  git clone <YOUR_GITHUB_REPO_URL>
  ```
- **Deployment**: The frontend is optimized for zero-config deployment on [Vercel](https://vercel.com). The backend is a standard FastAPI application which can be containerized using the provided `Dockerfile`/`docker-compose.yml` or deployed to any standard cloud provider.

## Local Environment Setup

For security, `.env` files are excluded from version control. Please initialize your local environment using the provided templates:

1. **Frontend Configuration**:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
   *(Update `frontend/.env.local` to point to your backend URL if it differs from the default)*

2. **Backend Configuration**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(Crucial: You must add your `PERPLEXITY_API_KEY`, `MONGO_URI`, and `ALLOWED_ORIGINS` in this file or the backend will fail to boot.)*

## Running Locally

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the Nexus EPC Copilot in action!

## Deploying to Vercel

1. Push your codebase to GitHub.
2. In the Vercel Dashboard, select **Add New Project**.
3. Import your GitHub repository. Set the **Root Directory** to `frontend`. Vercel will automatically detect the Next.js setup.
4. **Environment Variables**: Add your frontend environment variables during setup:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_BACKEND_URL` (Point this to your production backend URL)
5. Click **Deploy**.

> **Security Note:** Once your frontend is deployed on Vercel, ensure you update the `ALLOWED_ORIGINS` environment variable in your production backend to include your new Vercel domain (e.g., `https://your-app.vercel.app`) to allow CORS requests safely.
