# Quetta Mahfil AI Web App (Production Ready)

This application is a full-stack AI-powered heritage cafe experience built with React, Express, Firebase, and Groq SDK (DeepSeek R1).

## Features
- **DeepSeek R1 AI Chat:** Persistent chat history stored in Firestore.
- **AI-Powered Search:** Neural search mode for the heritage menu.
- **Unified Auth:** Google and Email/Password login via Firebase Authentication.
- **Cloud Storage:** Securely store images, PDFs, and voice files.
- **Modern UI:** Mobile-first, responsive, and polished design.
- **Optimized Performance:** Fast loading, offline support (PWA), and lazy loading.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express (serving as API proxy for Groq)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Storage:** Firebase Cloud Storage
- **AI Model:** DeepSeek R1 via Groq API

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory (use `.env.example` as a template):
```env
GROQ_API_KEY=your_groq_api_key
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
...
```

### 2. Local Development
```bash
npm install
npm run dev
```
The server will start on port 3000.

### 3. Firebase Deployment
Ensure you have the Firebase CLI installed and logged in:
```bash
# Deploys hosting, firestore rules, and storage rules
firebase deploy

# For the backend (Cloud Run), the AI Studio environment handles this.
# To deploy manually to Cloud Run:
gcloud run deploy quetta-mahfil-app --source .
```

## AI Studio Specifics
- **Secrets:** Store your `GROQ_API_KEY` in the AI Studio Secrets panel.
- **Port:** The app is configured to run on port 3000.

---
Developed for Quetta Mahfil Heritage Cafe.
