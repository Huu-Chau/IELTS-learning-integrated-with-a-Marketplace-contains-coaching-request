# GSD STATE

**Project:** Hybrid IELTS Preparation Platform  
**Initialized:** 2026-03-05  
**Status:** Active

---

## Current Position

**Phase:** 10 — Interactive Objective Questions (Reading & Listening)
**Plan:** 10.1 (about to execute)  
**Status:** Planning

---

## Completed Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Backend Writing Agent (REST) | ✅ Complete |
| 2 | Backend Speaking Agent (WebSocket) | ✅ Complete |
| 3 | Frontend Writing Interface (WritingTest.tsx) | ✅ Complete |
| 4 | Frontend Speaking Interface (SpeakingInterface.tsx) | ✅ Complete |
| 5 | Verification | ✅ Complete |
| 6 | Student Dashboard | ✅ Complete |
| 7 | MinIO Audio Storage | ✅ Complete |
| 8 | Epic B — UI Refactor & IELTS Material Migration | ✅ Complete |
| 9 | Practice Session Pages (Writing, Reading, Listening) | ✅ Complete |

---

## Accumulated Decisions

- **Stack**: React 18 + TypeScript + Vite / Express + Socket.io / Postgres + Sequelize / MinIO
- **UI**: Tailwind CSS, DashboardLayout for all authenticated pages
- **Auth**: Firebase Auth + Postgres profile sync (race condition fixed in LoginPage)
- **Practice flow**: Card grid listing pages → session pages (materialId param)
- **Mock test flow**: Test-set card grids → session pages (setId + test params)
- **Color scheme**: Speaking=Indigo, Reading=Emerald, Listening=Amber, Writing=Rose, MockTest=Violet
- **Sidebar**: overflow-y-scroll on DashboardLayout main to prevent centering shift

---

## Key Files

- Client: `new_project/client/src/`
- Server: `new_project/server/src/`
- Practice pages: `client/src/pages/practice/`
- Mock test pages: `client/src/pages/mock-test/`
- API routes: `server/src/routes/`
- App routes: `client/src/App.tsx`

---

## Next Steps

1. Execute Phase 10.1 — Reading: Build interactive MCQ & gap-fill questions
2. Execute Phase 10.2 — Listening: Build interactive MCQ & gap-fill questions
3. Execute Phase 10.3 — Backend: Objective test evaluation endpoint
