# Hybrid IELTS Preparation Platform

**Thesis Project**: Integrating AI-Driven Assessment with an On-Demand Expert Consultation Marketplace.

## 📌 Project Overview
This platform bridges the gap between affordable, instant AI grading and deep, personalized human feedback. It provides IELTS students with a comprehensive ecosystem to practice Speaking and Writing tests using local LLMs (Ollama) and subsequently connect with certified human experts to refine their skills. 

## 🚀 Key Features

### 1. AI-Driven Assessment (Fast & Accessible)
- **Speaking Mock Tests**: Interactive test flows simulating the real IELTS speaking exam, featuring real-time **Text-to-Speech (TTS)** voice output for a natural conversational experience.
- **Writing Mock Tests**: Built-in test interface for IELTS Writing Task 1 & Task 2.
- **Local AI Grading**: Integrates directly with state-of-the-art local LLMs (specifically **Gemma 3** via Ollama) to securely and quickly generate band score estimations, detailed breakdown feedback, and actionable improvements.
- **Progress Tracking**: Dedicated student dashboards featuring historical attempts, progress charts, and access to past feedback through secure presigned file URLs (MinIO).

### 2. Expert Consultation Marketplace (Deep & Premium)
- **Tutor Discovery**: A specialized marketplace for students to find and filter expert teachers by skill (Reading, Listening, Writing, Speaking).
- **Teacher Dashboards**: Dedicated portal for teachers to manage their listings, prices, and respond to incoming coaching requests.
- **Wallet & "Brain" Credits**: A platform-exclusive currency (Brain Credits 🧠). Students can easily top up their wallets to seamlessly transact with teachers.

### 3. Advanced Scheduling & Availability
- **Weekly Availability Matrix**: Teachers define their recurring working hours (e.g., Monday to Friday, 9 AM - 5 PM).
- **Calendar-Based Booking**: Students book sessions by selecting specific 1-hour time slots from a dynamic, conflict-free 14-day calendar matrix.
- **Double-Booking Prevention**: The system guarantees slot exclusivity using a sophisticated 5-minute reservation lease with optimistic locking. To ensure high performance, expired 5-minute checkout tokens are handled via a **"Lazy Cleanup"** mechanism rather than heavy background cron jobs. The database sweeps and clears expired locks on-the-fly whenever users check availability or initiate new bookings.

### 4. Automated Platform Operations (Cron Jobs)
Automated background tasks ensure smooth operations without manual intervention:
- **Auto-Completion & Payouts**: Automatically marks sessions as complete 24 hours after their scheduled time and securely transfers held Brain Credits to the teacher's wallet.
- **Stale Request Cleanup**: Automatically rejects pending requests ignored by teachers for over 48 hours, fully refunding the student.
- **Smart Reminders**: Dispatches automated notifications to both parties 24 hours before an upcoming session.

## 🛠️ Technology Stack
- **Frontend**: React.js (v18+), TypeScript, Vite, Tailwind CSS, Lucide Icons, Browser TTS API.
- **Backend**: Node.js, Express.js.
- **Database & Storage**: PostgreSQL (Sequelize ORM), MinIO (S3-compatible object storage).
- **AI Integration**: Ollama running **Gemma 3** (Local LLM inference).
- **Automation**: `node-cron` for scheduling background jobs.
- **Security**: JWT-based authentication, password hashing, and optimistic locking for atomic transactions.

## ⚙️ Core Engineering Achievements
- **Atomic Transactions**: Ensured financial integrity during wallet top-ups and marketplace payments by strictly utilizing PostgreSQL transactions.
- **Race-Condition Safety**: Successfully solved the "double-booking" problem common in marketplaces through a robust reservation lease pattern.
- **Scalable Architecture**: Decoupled the heavy AI grading workload from the transactional marketplace API.

---
*Developed as part of a comprehensive Thesis Project.*
