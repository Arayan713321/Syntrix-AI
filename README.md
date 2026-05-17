# 🚀 Syntrix AI — Enterprise Career Intelligence Platform

Syntrix AI is a production-grade, secure, and highly optimized AI SaaS platform that transforms career growth and recruiting intelligence. Built using a robust Next.js frontend, an Express API gateway, and a state-of-the-art LangChain RAG pipeline, the repository serves as a showcase of elite engineering practices, zero stubs, and seamless in-memory/vector performance fallbacks.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o-green?logo=openai)](https://openai.com/)
[![LangChain](https://img.shields.io/badge/LangChain-1.4-orange?logo=chainlink)](https://js.langchain.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector-yellow)](https://www.trychroma.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 💎 Feature Overview

*   **📄 AI Resume ATS Scanner**: Analyzes and scans standard PDF resumes using professional parsing algorithms, producing technical depth metrics and immediate readability feedback.
*   **🎯 JD Match & Skill Gap Analyzer**: Cross-references uploaded resumes against job descriptions, outputting match percentages, technical missing keyword badges, and step-by-step optimization recommendations.
*   **💬 RAG Career Advisor (SSE Streaming)**: Delivers contextual, highly detailed career feedback using an online vector RAG pipeline, featuring real-time token streaming and blinking cursors.
*   **🎙️ AI Mock Interview Simulator**: Features technical and situational Q&A simulation panels customized to candidates' profiles and targets, complete with inline validators and evaluation scoring.
*   **📥 Resume History & Report Downloads**: Automatically saves candidate logs per user session, providing unified, high-impact Markdown (`.md`) transcript and ATS scorecard downloads.
*   **🔐 Secure Auth (Google OAuth + Magic Link)**: Secures client dashboards using a server-side BFF token design that isolates JWT tokens entirely out of public browser variables.

---

## 🛠️ Tech Stack

### 1. Frontend Architecture
| Package | Purpose | Version |
| :--- | :--- | :--- |
| `next` | React 19 Core & App Router BFF Framework | `16.2.6` |
| `next-auth` | Route Guards, JWT Signatures, and Provider Handlers | `^4.24.14` |
| `react` / `react-dom` | UI Rendering Engine | `19.2.4` |
| `axios` | JWT Request Sourcing & Expiry Interceptors | `^1.16.1` |
| `sonner` | Global Toast Event Alerter | `^2.0.7` |
| `lucide-react` | Modern Icon System | `^1.16.0` |
| `tailwindcss` | Utility-first CSS Styles Engine | `^4` |
| `typescript` | Static Compiling and Strict Type Guarding | `^5` |

### 2. Backend API Services
| Package | Purpose | Version |
| :--- | :--- | :--- |
| `express` | Production REST API & Streaming Gateway | `5.2.1` |
| `openai` | LLM Context Generations (`gpt-4o`, `gpt-4o-mini`) | `^6.38.0` |
| `langchain` | Splitting, Embedding Generations, and Retrieval Chains | `^1.4.0` |
| `chromadb` | Dynamic Local Vector Search Indexer | `^3.4.3` |
| `async-mutex` | Synchronous Database File Locking Safeguards | `^0.5.0` |
| `helmet` | Content Security Policy Headers Enforcer | `^8.1.0` |
| `express-rate-limit` | Route-Specific IPv6 Per-IP Flood Protections | `^8.5.2` |
| `multer` | Dynamic, Namespaced Path Upload Handlers | `^2.1.1` |
| `pdf-parse` | Extractor Leveraging Binary Stream Buffers | `^2.4.5` |
| `zod` | Server-Side Payload Validation | `^4.4.3` |

---

## 🏗️ Architecture Diagram

```mermaid
flowchart LR
    User([User])
    subgraph Client [Next.js Client]
        UX[Dashboard UI]
        Hook[useSyntrix Hook]
        Axios[Axios Interceptor]
    end
    subgraph Gateway [Express API Gateway]
        Helmet[Helmet Security CSP]
        Limit[Rate Limiter]
        Auth[authMiddleware]
    end
    subgraph BackendServices [Backend Services]
        ATS[ATS Service]
        JD[JD Service]
        RAG[RAG Service]
        Int[Interview Service]
    end
    OpenAI[OpenAI API]
    Chroma[ChromaDB]
    Memory[Memory Vector Store]
    DB[(dbStore.json)]
    Mutex[async-mutex Lock]

    User --> UX
    UX --> Hook
    Hook --> Axios
    Axios -->|signed JWT Bearer| Helmet
    Helmet --> Limit
    Limit --> Auth
    Auth --> ATS
    Auth --> JD
    Auth --> RAG
    Auth --> Int

    ATS --> OpenAI
    JD --> OpenAI
    Int --> OpenAI
    RAG --> OpenAI

    RAG --> Chroma
    Chroma -.->|fallback| Memory
    
    ATS -.->|Write telemetry| DB
    JD -.->|Write telemetry| DB
    Int -.->|Write telemetry| DB
    DB --> Mutex
```

---

## 📡 RAG Pipeline

```mermaid
flowchart TD
    Doc[PDF Upload] --> Ext[Text Extraction]
    Ext --> Split[RecursiveCharacterTextSplitter]
    Split --> Tag[Metadata Tagging]
    Tag --> Embed[OpenAI Embeddings]
    Embed --> Index[ChromaDB Index]
    
    Query[User Query] --> EmbedQuery[OpenAI Embeddings]
    EmbedQuery --> Retrieval[Top-K Retrieval]
    Index --> Retrieval
    Retrieval --> Rerank[MMR Reranking]
    Rerank --> Inject[Prompt Injection]
    Inject --> LLM[OpenAI gpt-4o]
    LLM --> SSE[SSE Stream]
    SSE --> ClientUX[Client UI]
```

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/resume/upload` | `JWT Bearer` | Uploads, validates, parses PDF, and generates ATS vectors. Scopes files to `/uploads/{userId}/`. |
| **POST** | `/api/resume/match-jd` | `JWT Bearer` | Pastes job description and calculates vector alignment scores against active resume. |
| **POST** | `/api/resume/chat` | `JWT Bearer` | Queries vector datasets. Outputs OpenAI tokens as a real-time SSE stream. |
| **GET** | `/api/resume/history` | `JWT Bearer` | Retrieves active user's past telemetry files, scores, and namespaced upload dates. |
| **GET** | `/api/resume/:id` | `JWT Bearer` | Resolves single historical resume scan data and structured metrics maps. |
| **POST** | `/api/interview/session` | `JWT Bearer` | Spins up a technical/HR question sim panel scoped to resume/JD details. |
| **POST** | `/api/interview/session/:id/answer` | `JWT Bearer` | Submits candidate's question response, scores it via `gpt-4o`, and appends history. |
| **GET** | `/api/interview/session/:id` | `JWT Bearer` | Returns active progress stats and answers list for an active mock simulator session. |
| **GET** | `/api/interview/sessions` | `JWT Bearer` | Returns lists of all mock panel sessions completed by the candidate. |
| **GET** | `/api/health` | `Public` | Diagnostic endpoint checking uptime, database status, and ChromaDB fallback indexes. |

---

## 🛡️ Route Rate Limits

Syntrix AI protects backend endpoints using scoped per-IP limit allocations to prevent server resource abuse:

| Route Group | Limit | Window | Scoped Targets |
| :--- | :--- | :--- | :--- |
| **Resume Group** | `20 requests` | `15 minutes` | `/api/resume/upload`, `/api/resume/match-jd`, `/api/resume/:id` |
| **SSE RAG Chat** | `30 requests` | `10 minutes` | `/api/resume/chat` (Server-Sent Event completions) |
| **Interview Simulator** | `15 requests` | `15 minutes` | `/api/interview/session`, `/api/interview/session/:id/answer` |
| **Global Gateway** | `100 requests` | `15 minutes` | Root gateway, health endpoint, and all auxiliary paths |

---

## 🚀 Local Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or later (Long Term Support recommended)
- **OpenAI API Key**: Valid developer API key containing billing allocations
- **ChromaDB**: (Optional) Running local instance. If missing, RAG services automatically route to in-memory cosine vectors.

### 2. Core Repository Clone
```bash
git clone https://github.com/syntrix-ai/syntrix-ai.git
cd syntrix-ai
```

### 3. Server Configuration Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env variables, specifying your live OPENAI_API_KEY
npm run dev
```

### 4. Client Frontend Setup
```bash
cd ../client
npm install
cp .env.example .env
# Edit .env, matching symmetric NEXTAUTH_SECRET keys
npm run dev
```

### 5. Verify Boot Health Status
In another terminal, run a public diagnostic heartbeat query to confirm success:
```bash
curl http://localhost:5000/api/health
# Output: {"status":"ok","dbStatus":"healthy","chromaStatus":"fallback","uptime":1.2}
```

---

## ⚙️ Environment Variables

### 1. Backend Server Env (`/server/.env.example`)
```env
# =========================================================================
# SYNTRIX AI — BACKEND SERVER ENVIRONMENT VARIABLES TEMPLATE
# =========================================================================

# 1. Server Configurations
PORT=5000
NODE_ENV=development

# 2. OpenAI Service Keys
# Retrieve a live API key from: https://platform.openai.com/
OPENAI_API_KEY=your_openai_api_key_here

# 3. NextAuth Sync & Cryptography (Symmetric verification sync key)
# Shared symmetric secret key used to decrypt NextAuth signed JWT tokens in Express.
# Must match client-side NEXTAUTH_SECRET. Generate securely using: openssl rand -base64 32
NEXTAUTH_SECRET=syntrix-ai-super-secret-key-2026
NEXTAUTH_URL=http://localhost:3000

# 4. Google OAuth Credentials (Optional: For Google Sign-in Providers)
# Retrieve from Google Cloud Console under API & Services Credentials
# GOOGLE_CLIENT_ID=your_google_client_id_here
# GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# 5. ChromaDB Server URL (Dynamic Local or Cloud Gateway)
# chromaStatus automatically fallbacks to high-speed Cosine memory vectors if offline
CHROMA_URL=http://localhost:8000
```

### 2. Client Frontend Env (`/client/.env.example`)
```env
# =========================================================================
# SYNTRIX AI — CLIENT APP ENVIRONMENT VARIABLES TEMPLATE
# =========================================================================

# 1. NextAuth Authentication (Security Hardening Sync)
# Cryptographic symmetric secret used to sign NextAuth session cookies.
# MUST BE THE EXACT SAME VALUE on both client and server sides to decrypt payloads.
# Generate securely using: openssl rand -base64 32
NEXTAUTH_SECRET=syntrix-ai-super-secret-key-2026
NEXTAUTH_URL=http://localhost:3000

# 2. Google OAuth Integration Credentials
# Set up Google Credentials in your Google Developers Console: https://console.developers.google.com
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# 3. Magic Link Email Transport (Optional: For physical SMTP transport services)
# Defaults to high-speed sandbox mock routing in local development if omitted
EMAIL_SERVER=smtp://username:password@smtp.mailtrap.io:2525
```

---

## 📂 Project Structure

```bash
Syntrix AI/
│
├── client/                               # Next.js App Router Frontend
│   ├── .env.example                      # Sync variable parameters templates
│   ├── .gitignore                        # Frontend exclusion pathways
│   ├── src/
│   │   ├── middleware.ts                 # NextAuth router guard
│   │   ├── app/
│   │   │   ├── layout.tsx                # Context providers & styling wrappers
│   │   │   ├── page.tsx                  # High-fidelity Landing Page
│   │   │   ├── auth/
│   │   │   │   └── page.tsx              # Authentication Login Panel
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx              # Tabbed controller layouts page
│   │   │   └── api/
│   │   │       └── auth/
│   │   │           ├── token/
│   │   │           │   └── route.ts      # Server-side token retrieval BFF endpoint
│   │   │           └── [...nextauth]/
│   │   │               └── route.ts      # Session configuration handlers
│   │   ├── features/
│   │   │   ├── upload/
│   │   │   │   └── DragDropZone.tsx      # Upload Dropzone & validation boundaries
│   │   │   ├── ats/
│   │   │   │   ├── ATSAnalysisView.tsx   # Memoized radial ATS scorecards
│   │   │   │   └── JDMatchView.tsx       # Gap and requirement matching arrays
│   │   │   ├── chat/
│   │   │   │   └── RAGChatView.tsx       # SSE vector chat module
│   │   │   └── interview/
│   │   │       └── InterviewSimulatorView.tsx # Custom panel Q&A simulator card
│   │   ├── hooks/
│   │   │   └── useSyntrix.ts             # Hook managing telemetry states
│   │   └── services/
│   │       └── api.ts                    # Axios connectors managing bearer bindings
│   └── package.json                      # Scripts and dependencies
│
├── server/                               # Node.js Express REST Backend
│   ├── .env.example                      # Server parameters template
│   ├── .gitignore                        # Server exclusion pathways
│   ├── server.js                         # Application entrypoint & security headers
│   ├── controllers/
│   │   ├── resumeController.js           # Document scanners and SSE controllers
│   │   └── interviewController.js        # Simulator panel controllers
│   ├── middleware/
│   │   ├── authMiddleware.js             # Bearer authentication protectors
│   │   ├── rateLimitMiddleware.js        # Per-IP route limit controllers
│   │   └── errorMiddleware.js            # Standardized catch-all handlers
│   ├── routes/
│   │   ├── resumeRoutes.js               # Parser, Matcher, and RAG routes
│   │   └── interviewRoutes.js            # Mock simulator execution routes
│   ├── services/
│   │   ├── atsService.js                 # Resume parser (gpt-4o-mini)
│   │   ├── jdService.js                  # JD alignment mapper (gpt-4o-mini)
│   │   ├── interviewService.js           # simulator grader (gpt-4o)
│   │   └── ragService.js                 # Vector splitters and cosine indexes
│   ├── uploads/                          # Namespaced documents storage directory
│   └── utils/
│       ├── dbStore.js                    # Mutex transaction database writer
│       ├── envValidator.js               # Startup configurations sync validator
│       └── pdfParser.js                  # Buffer-based pdf-parse converter
│
└── README.md                             # Tech stack manifest & installation guide
```

---

## 🔒 Security Specifications

*   **Helmet + CSP Protections**: Sets security headers dynamically, enforcing a strict Content Security Policy (CSP) blocking downstream cross-site connection injections.
*   **BFF Token Pattern**: Restricts API signed tokens entirely to backend server queries, keeping sensitive user identifiers out of local storage or public React states.
*   **Path Traversal Prevention**: Safely resolves Multer directories by checking resolved targets against base directories (`resolvedPath.startsWith(UPLOAD_BASE_DIR)`).
*   **PDF MIME Validation**: Enforces hard validations verifying incoming documents as `application/pdf` binary schemas, rejecting changed extensions on the spot.
*   **Mutex-Locked Writes**: Encapsulates all read/write pathways inside the database store under an asynchronous `async-mutex` lock queue, defending database structures against multi-client overwrite corruptions.
*   **Per-IP Rate Limiting**: Employs tailored rate profiles, restricting flood requests dynamically, using direct IP-scoping arrays compatible with IPv4/IPv6 connections.

---

## ☁️ Deployment

### 1. Client Frontend (Vercel)
The Next.js client is optimized for seamless zero-config deployment on Vercel:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Environment Checklist**: Configure `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your deployed Vercel URL), and OAuth keys.

### 2. REST Server API (Render / Railway)
Deploy the Express API gateway on Render or Railway using the dynamic Docker or node runtime options:
- **Build Command**: `npm install`
- **Execution Command**: `npm start` (or `node server.js`)
- **Environment Checklist**: Configure `PORT`, `NODE_ENV=production`, `OPENAI_API_KEY`, `NEXTAUTH_SECRET` (matching Vercel client parameters), and uploads storage namespaces.

### 3. ChromaDB Datasets (Chroma Cloud / Self-Hosted)
Connect to an active enterprise ChromaDB instance on Chroma Cloud or spin up a self-hosted instance on AWS EC2. If ChromaDB goes offline, RAG advisor features automatically fallback to Syntrix's high-speed in-memory vector calculations.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for full details.
