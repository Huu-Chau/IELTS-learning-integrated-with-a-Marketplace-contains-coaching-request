# Hybrid IELTS Preparation Platform _(new_project)_

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)](https://reactjs.org)
[![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13-4169E1?logo=postgresql&logoColor=white&style=flat-square)](https://www.postgresql.org)
[![Kafka](https://img.shields.io/badge/Kafka-7.6.1-231F20?logo=apachekafka&logoColor=white&style=flat-square)](https://kafka.apache.org)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-FFCA28?logo=firebase&logoColor=black&style=flat-square)](https://firebase.google.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=flat-square)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

AI-powered IELTS preparation platform combining local LLM grading with an on-demand expert tutoring marketplace.

This platform bridges the gap between affordable, instant AI feedback and deep, personalized human coaching. IELTS students can practice Speaking and Writing tests graded by a local LLM (Ollama / Gemma 3), then seamlessly connect with certified human tutors via a built-in marketplace using platform-exclusive Brain Credits 🧠.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Core Workflows](#core-workflows)
- [Contributing](#contributing)
- [License](#license)

## Background

This is a thesis project exploring the **Hybrid IELTS Preparation Model**: combining the speed and accessibility of AI-driven assessment with the depth of human expert consultation. The system is designed to demonstrate how local LLMs can be integrated into an educational platform without relying on external paid APIs, while still providing a monetizable expert marketplace layer on top.

Key academic objectives:
- Evaluate the viability of local LLM inference (Ollama) for standardised-test grading.
- Design a concurrency-safe booking marketplace using pessimistic locking and reservation leases.
- Build an event-driven grading pipeline using Apache Kafka to decouple heavy AI workloads from the transactional API.

## Install

### Prerequisites

Ensure the following are installed before proceeding:

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/en/) | v20+ | Backend & frontend runtime |
| [Docker & Docker Compose](https://www.docker.com/) | Latest | PostgreSQL, MinIO, Kafka |
| [Ollama](https://ollama.ai/) | Latest | Local LLM inference |
| Firebase Project | — | Authentication (free tier) |

### 1. Clone the repository

```bash
git clone <repository-url>
cd new_project
```

### 2. Start infrastructure services

The project uses Docker to run PostgreSQL, MinIO (object storage), and Kafka.

```bash
cd server
docker-compose up -d postgres minio minio-init kafka kafka-ui
```

> Kafka UI: `http://localhost:8080` · MinIO Console: `http://localhost:9001`

### 3. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 4. Run database migrations

```bash
cd server
npm run migration:run
npm run seed:mock
```

### 5. Pull the AI model

```bash
ollama pull gemma3
```

## Usage

You need **four terminal tabs** to run all services concurrently.

```bash
# Tab 1 — Express API server
cd server && npm run dev

# Tab 2 — Kafka consumer worker (AI grading)
cd server && npm run dev:consumer

# Tab 3 — Cron worker (auto-complete sessions, refunds)
cd server && npm run dev:cron

# Tab 4 — React frontend
cd client && npm run dev
```

Open `http://localhost:5173` to access the application.

> **Default test credentials** (seeded by `npm run seed:mock`):
> - Student: `student@example.com` / `password123`
> - Teacher: `teacher@example.com` / `password123`

---

## Architecture

The application is built on a decoupled full-stack architecture designed to handle computationally heavy AI inference without blocking user-facing transactions.

```
┌─────────────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript + Tailwind)               │
│  Auth: Firebase SDK  ·  Real-time: Socket.io-client     │
└────────────────────────┬────────────────────────────────┘
                         │ REST + WebSocket
┌────────────────────────▼────────────────────────────────┐
│  Express API  (Node.js + TypeScript)                    │
│  Auth: Firebase Admin  ·  ORM: Sequelize + PostgreSQL   │
│  Storage: MinIO  ·  Real-time: Socket.io                │
└────┬────────────────────────────────────────────────────┘
     │ Kafka Events
┌────▼──────────────────────┐   ┌──────────────────────────┐
│  Kafka Consumer Worker    │   │  Cron Worker             │
│  · Ollama (Gemma 3) LLM   │   │  · Auto-complete sessions│
│  · AI grading pipeline    │   │  · Refunds & reminders   │
│  · WebSocket dispatch     │   │  · Slot expiry cleanup   │
└───────────────────────────┘   └──────────────────────────┘
```

## Key Features

### AI-Driven Assessment
- **Speaking Mock Tests** — real-time TTS prompts + Whisper Speech-to-Text transcription.
- **Writing Mock Tests** — timed Task 1 & Task 2 interfaces.
- **Local LLM Grading** — Gemma 3 via Ollama generates band scores, feedback, and improvements asynchronously through Kafka.
- **Progress Tracking** — historical attempts, Recharts dashboards, vocabulary lists, and MinIO-stored audio playback.

### Expert Consultation Marketplace
- **Tutor Discovery** — filter teachers by skill and price.
- **Brain Credits 🧠** — platform-exclusive internal currency; students top-up, teachers withdraw.
- **Slot-Locking Checkout** — 5-minute reservation lease with pessimistic DB locking prevents double-booking.
- **Real-time Messaging** — Socket.io chat between students and teachers.

### Automated Operations
- **Cron Jobs** — auto-complete sessions 24 h after end time and credit teacher wallets; auto-reject stale requests after 48 h and refund students.
- **Kafka Fan-out** — grading results and notifications are dispatched via Kafka consumers, not the API process.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| Real-time | Socket.io (server + client) |
| Auth | Firebase Authentication + Firebase Admin SDK |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL 13, Sequelize ORM |
| Migrations | Sequelize CLI migration files (no `sync()`) |
| Object Storage | MinIO (S3-compatible) for audio recordings |
| Message Broker | Apache Kafka + KafkaJS |
| AI / LLM | Ollama (local) running Gemma 3 |
| Containerisation | Docker + Docker Compose |

## Project Structure

```text
new_project/
├── client/                    # React SPA
│   └── src/
│       ├── components/        # Reusable UI components
│       │   └── payment/       # TopUpModal, BookingCheckoutModal, …
│       ├── context/           # AuthContext, ThemeContext
│       ├── hooks/             # Custom React hooks
│       ├── layouts/           # DashboardLayout, TeacherLayout
│       ├── pages/             # Application pages (marketplace, tests, …)
│       └── services/          # apiClient, Firebase config
│
└── server/                    # Express API + Workers
    └── src/
        ├── config/            # Database, Firebase, MinIO initialisation
        ├── consumers/         # Kafka consumer handlers
        ├── controllers/       # Route controllers
        ├── middleware/        # Auth (verifyToken), error handler
        ├── migrations/        # Sequelize migration files
        ├── models/            # Sequelize models (User, Reservation, …)
        ├── routes/            # Express routers
        ├── services/          # Business logic (marketplace, cron, …)
        ├── server.ts          # API entrypoint
        ├── cron.ts            # Cron worker entrypoint
        └── consumer.ts        # Kafka consumer entrypoint
```

## Environment Variables

Create `.env` files in both `client/` and `server/` based on the examples below.

### `server/.env`

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ielts_platform
DB_USER=postgres
DB_PASSWORD=123456

# Firebase Admin SDK (from Firebase Console → Service Account)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"

# MinIO (S3-compatible object storage)
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ielts-audio
MINIO_PUBLIC_ENDPOINT=http://localhost:9000

# Ollama local LLM
OLLAMA_HOST=http://localhost:11434
```

### `client/.env`

```env
VITE_API_URL=http://localhost:3001
VITE_API_BASE_URL=http://localhost:3001/api
```

## Core Workflows

### 1. Authentication
Firebase Auth issues a JWT on the client. Every API request sends the token in the `Authorization: Bearer` header. The Express `verifyToken` middleware validates it via Firebase Admin SDK and attaches the decoded `uid` to `req.user`.

### 2. AI Grading Pipeline

```
Student submits attempt
    → Express validates & saves raw attempt to PostgreSQL
    → Express publishes a Kafka event (topic: grading-requested)
    → Kafka Consumer picks up the event
    → Consumer sends prompt to Ollama (Gemma 3)
    → Ollama returns structured JSON { bandScore, feedback, improvements }
    → Consumer updates the attempt in PostgreSQL
    → Consumer emits WebSocket event → student UI updates in real-time
```

### 3. Marketplace Booking (Slot-Locking Flow)

```
Student selects slot
    → POST /api/teacher-availability/:id/book
    → Reservation created (status=PENDING, expiresAt=NOW+5min)
    → Slot locked; other students see "Pending Booking"

Student confirms payment (within 5 min)
    → POST /api/reservations/:id/pay
    → DB transaction: wallet_balance -= fee (atomic, guards overdraft)
    → Reservation → COMPLETED
    → MarketplaceRequest → ACCEPTED
    → Teacher notified via WebSocket

Student cancels before paying (optional)
    → POST /api/reservations/:id/cancel
    → DB transaction (FOR UPDATE): PENDING + owner only, no refund
    → Reservation → CANCELLED; slot freed (isAvailable=true) immediately
```

---

## Contributing

This is an academic thesis project. External contributions are welcome for discussion and improvement.

- Open an [issue](https://github.com/chauhuu21/new_project/issues) to ask questions or suggest improvements.
- PRs are accepted — please open an issue first to discuss the change.
- Code must follow the existing TypeScript strict rules and include `console.log` entry/exit logging per project convention.
- No breaking changes to database models without a corresponding migration file.

## License

[MIT](LICENSE) © 2026 Nguyen Huu Chau
