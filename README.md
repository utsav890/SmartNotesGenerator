# 🎓 NoteFlow — SmartNotes AI
> **Transform messy lecture recordings and transcripts into structured study notes, active-recall quizzes, interactive flashcards, and instant Q&A.**

[![CI / CD](https://github.com/utsav890/SmartNotesGenerator/actions/workflows/ci.yml/badge.svg)](https://github.com/utsav890/SmartNotesGenerator/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Google Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run-4285F4.svg)](https://cloud.google.com/run)

---

## 📌 Problem Statement Alignment
Students and lifelong learners spend hours listening to lengthy recorded lectures, often struggling to extract core takeaways, retain key concepts, and prepare effectively for exams:
* **Passive Listening Fatigue:** Listening without active recall leads to rapid forgetting curves (Ebbinghaus forgetting curve).
* **Unstructured Information:** Audio recordings lack chapter markers, executive summaries, and searchability.
* **Lack of Self-Assessment:** Formulating high-yield revision questions and quizzes takes hours of manual effort.

**NoteFlow solves this end-to-end:**
1. **Audio Transcription:** Processes MP3, WAV, M4A, OGG, and WebM recordings using OpenAI's Whisper engine.
2. **Executive Synthesis:** Employs ultra-fast Groq LLMs to generate structured notes with headings, summaries, key takeaways, and revision questions.
3. **Active Recall Quiz:** Automatically synthesizes multiple-choice questions with answer keys and deep conceptual explanations.
4. **Interactive Flashcards:** Creates flip-card decks for spaced-repetition study.
5. **Contextual Lecture Q&A:** Allows students to ask follow-up questions directly grounded in lecture content via vector search.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (React 19 + Vite)"]
        UI["Obsidian Dark UI\n(WCAG AAA Compliant)"]
        Router["SPA Router & State Engine"]
        AudioUploader["Chunked Audio Upload & Player"]
    end

    subgraph Gateway ["Reverse Proxy & Web Server"]
        Nginx["Nginx / Cloud Run Container\n(Port 8080)"]
    end

    subgraph Backend ["Application Layer (FastAPI)"]
        AuthSvc["Auth & Security Engine\n(JWT + Bcrypt)"]
        TranscribeSvc["Whisper Audio Engine\n(FFmpeg Decoding)"]
        LLMSvc["Groq LLM Engine\n(Llama-3 Synthesis)"]
        VectorSvc["Qdrant Vector Engine\n(Semantic Embeddings)"]
        QuizEngine["Quiz & Flashcard Generator"]
    end

    subgraph Storage ["Persistence Layer"]
        DB[(MySQL 8.0 / SQLite)]
        VectorDB[(Qdrant Vector DB)]
        DiskStore["Persistent Storage (Audio Chunks)"]
    end

    UI --> Nginx
    Nginx --> AuthSvc
    Nginx --> TranscribeSvc
    Nginx --> LLMSvc
    Nginx --> QuizEngine
    
    AuthSvc --> DB
    TranscribeSvc --> DiskStore
    LLMSvc --> DB
    VectorSvc --> VectorDB
```

---

## 🛡️ Security & Enterprise Governance
NoteFlow is architected with defense-in-depth principles:
* **Password Hashing:** Uses `bcrypt` with work factor 12 and cryptographic salting.
* **RFC 7519 JWT Authentication:** Stateless HS256-signed JWTs with unique `jti` claims, cryptographic signatures, expiration verification, and database session revocation.
* **Insecure Direct Object Reference (IDOR) Protection:** Strict user tenant isolation across all lectures, transcripts, notes, quizzes, flashcards, and Q&A endpoints.
* **Audio Upload Security & Magic Byte Sniffing:** Validates file magic headers (`ID3`/MPEG for MP3, `RIFF/WAVE` for WAV, `ftyp` for M4A, `OggS` for OGG/OPUS, `\x1a\x45\xdf\xa3` for WebM) to block disguised binary uploads.
* **OWASP Security Headers:** Middleware enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
* **Sliding-Window Rate Limiting:** Enforces in-memory rate limiting against brute-force authentication and denial-of-wallet LLM abuse.
* **Role-Based Access Control (RBAC):** Strict separation between student users and platform administrators via protected API dependency gates.
* **SQL Injection Immunity:** All database queries are executed through SQLAlchemy ORM parameter binding with zero raw string interpolation.
* **Path Traversal Defense:** Strict filename sanitization and safe file resolution preventing directory traversal.

---

## ⚡ Performance & Efficiency
* **Sub-Second LLM Generation:** Utilizes Groq LPUs for near-instant notes and quiz generation, eliminating latency bottlenecks.
* **Asset Optimization:** Built using Vite with chunk splitting, gzip compression, and pre-rendered assets.
* **CSS Pruning:** Clean tokenized design system removing over 1,700 lines of duplicate and redundant stylesheet declarations.
* **Database Indexing:** Indexed lookups on `users.email`, `lectures.user_id`, `tokens.token_hash`, and timestamps ensure $O(\log n)$ query performance.

---

## ♿ Accessibility (a11y)
* **High Contrast:** The custom obsidian charcoal palette (`#08090d` / `#f8fafc`) exceeds WCAG AAA contrast ratio standards (> 15:1).
* **Semantic HTML5:** Built using standard `<header>`, `<main>`, `<aside>`, `<nav>`, `<article>`, and `<section>` tags.
* **Screen Reader Optimization:** ARIA landmarks (`role="alert"`, `aria-live="polite"`, `aria-expanded`, `aria-label`, `aria-hidden="true"` on decorative icons).
* **Reduced Motion:** Fully honors `prefers-reduced-motion: reduce` settings.
* **Keyboard Navigable:** Visible focus rings (`:focus-visible`) and full keyboard control across quiz cards, flashcards, and menus.

---

## 🧪 Testing & Verification
The codebase includes a comprehensive 38+ automated unit, integration, and security test suite:
* **`test_auth_security.py` (11 tests):** User registration, password complexity validation, duplicate email prevention, login, JWT issuance, expired token rejection, signature tampering detection, token refresh, and RBAC admin protection.
* **`test_lectures_api.py` (10 tests):** Lecture CRUD lifecycle, multi-tenant IDOR attack protection, audio upload MIME & magic byte verification, file size limits (413), and path traversal defenses.
* **`test_pipeline_and_ai.py` (10 tests):** Transcript cleaning, noise removal, topic segmentation, content coverage checking, mocked Whisper transcription, Groq note generation, RAG Q&A retrieval, and Quiz/Flashcard synthesis.
* **`test_security_headers.py` (3 tests):** OWASP security response headers, rate limiting (429 Too Many Requests), and error message sanitization.
* **`test_core.py` (4 tests):** Core regression suite.

### Local Test Execution Guide
To run the automated test suite locally:
```bash
# Windows PowerShell
$env:PYTHONPATH="backend"
python -m unittest discover backend/tests

# Linux / macOS
PYTHONPATH=backend python3 -m unittest discover backend/tests
```
Continuous Integration (`.github/workflows/ci.yml`) automatically executes this test suite and verifies React production builds on every commit.

---

## 🚀 Deployment Guide

### Option 1: Google Cloud Run (Recommended)
1. Push this repository to GitHub.
2. Open **[Google Cloud Run](https://console.cloud.google.com/run)** &rarr; Click **Create Service**.
3. Select **"Continuously deploy from a repository"** &rarr; Connect repository `utsav890/SmartNotesGenerator`.
4. Choose **Dockerfile** as build type (uses root `Dockerfile`).
5. Set **Authentication** to **"Allow unauthenticated invocations"**.
6. Set environment variables:
   * `GROQ_API_KEY`: `your_groq_api_key`
   * `JWT_SECRET`: `your_jwt_secret`
   * `ENVIRONMENT`: `production`
7. Click **Create** &rarr; Your live HTTPS Cloud Run URL will be generated!

### Option 2: Docker Compose (Local / Linux VM)
```bash
# 1. Clone repository
git clone https://github.com/utsav890/SmartNotesGenerator.git
cd SmartNotesGenerator

# 2. Configure environment
cp .env.example .env
nano .env

# 3. Launch stack
docker compose up -d --build
```
Access the application at `http://localhost`.

---

## 👨‍💻 Tech Stack
* **Frontend:** React 19, Vite, Lucide React, Framer Motion, CSS Design System
* **Backend:** FastAPI, Python 3.11+, SQLAlchemy, PyMySQL, Pydantic, Uvicorn
* **AI & NLP:** OpenAI Whisper, Groq API (Llama-3), Qdrant Vector Search
* **Infrastructure:** Docker, Nginx, Google Cloud Run, GitHub Actions CI/CD
