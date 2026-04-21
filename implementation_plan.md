# Marketplace: Student ↔ Teacher Service Marketplace

The marketplace is where teachers post service listings and students browse, hire, and request paid IELTS reviews. This plan wires the **student-facing** marketplace to real backend data (replacing hardcoded mock data) and adds a public listings API so students can discover teacher services.

## Current State (Research Summary)

| Layer | What exists | Gap |
|-------|------------|-----|
| **DB Models** | `TeacherListing` (Sequelize/PG) — full schema ✅ | No gap |
| **DB Models** | `MarketplaceRequest` (Sequelize/PG) — orders ✅ | No gap |
| **DB Models** | `Request.ts` (Firestore interface) — legacy requests via Firestore | Dual data layer (Firestore + PG) — needs unification |
| **Server Routes** | `teacherRoutes.ts` — CRUD for listings, orders, messages, notifications (teacher-only, auth-gated) | **No public/student-facing endpoint to browse active listings** |
| **Server Routes** | `requestRoutes.ts` → `requestService.ts` — uses **Firestore** not Sequelize | Firestore dependency for marketplace requests is inconsistent |
| **Frontend** | `TeacherList.tsx` — hardcoded `MOCK_TEACHERS` array | **Not wired to any API** |
| **Frontend** | `TeacherCard.tsx` — renders a teacher card with "Book Trial" button | Card interface doesn't match `TeacherListing` schema |
| **Frontend** | `PaymentModal.tsx` — simulated checkout (no real API call) | Fake `setTimeout`, no `MarketplaceRequest` created |

> [!IMPORTANT]
> The `requestService.ts` currently uses **Cloud Firestore** (`admin.firestore()`) while every other service uses **PostgreSQL via Sequelize**. This is the most critical architectural inconsistency. We must consolidate onto the Sequelize `MarketplaceRequest` model.

## Proposed Changes

Work is split into **5 focused parts** to avoid overload. Each part is independently shippable.

---

### Part 1: Public Listings API (Backend)

Create a new route file for student-facing marketplace endpoints that fetch active `TeacherListing` records joined with teacher `User` data.

#### [NEW] [marketplaceRoutes.ts](file:///Users/chauhuu21/Documents/test/new_project/server/src/routes/marketplaceRoutes.ts)

- `GET /api/marketplace/listings` — returns all active listings with teacher profile info (name, email). Auth-gated (student must be logged in to browse).
- `GET /api/marketplace/listings/:id` — returns a single listing detail.
- `POST /api/marketplace/requests` — student creates a `MarketplaceRequest` (Sequelize, not Firestore). Body: `{ listingId, teacherId, message?, attemptId? }`. Auto-sets `fee` from the listing's `pricePerHour`.

#### [MODIFY] [app.ts](file:///Users/chauhuu21/Documents/test/new_project/server/src/app.ts)

- Mount the new route: `app.use('/api/marketplace', marketplaceRoutes)`

---

### Part 2: Wire Frontend to Real API

Replace the hardcoded `MOCK_TEACHERS` in `TeacherList.tsx` with a real API call.

#### [MODIFY] [TeacherList.tsx](file:///Users/chauhuu21/Documents/test/new_project/client/src/pages/marketplace/TeacherList.tsx)

- Fetch from `GET /api/marketplace/listings` using the existing `apiClient`.
- Add loading skeleton and error state.
- Map API response to `TeacherCard` props.

#### [MODIFY] [TeacherCard.tsx](file:///Users/chauhuu21/Documents/test/new_project/client/src/components/marketplace/TeacherCard.tsx)

- Update the `TeacherProps` interface to match the `TeacherListing` + `User` join shape.
- Pass listing `id` to the booking flow.

---

### Part 3: Real Booking Flow (PaymentModal → MarketplaceRequest)

#### [MODIFY] [PaymentModal.tsx](file:///Users/chauhuu21/Documents/test/new_project/client/src/components/payment/PaymentModal.tsx)

- Replace fake `setTimeout` with a real `POST /api/marketplace/requests` call.
- Accept `listingId` and `teacherId` as props.
- On success, create a real `MarketplaceRequest` in PostgreSQL.

---

### Part 4: Student "My Requests" View

#### [NEW] [MyRequests.tsx](file:///Users/chauhuu21/Documents/test/new_project/client/src/pages/marketplace/MyRequests.tsx)

- New page at `/my-requests` showing the student's submitted marketplace requests.
- Fetch from `GET /api/marketplace/requests/mine` (to be added in Part 1's route file).
- Display status badges (pending, accepted, completed, rejected).

#### [MODIFY] [DashboardLayout.tsx](file:///Users/chauhuu21/Documents/test/new_project/client/src/layouts/DashboardLayout.tsx)

- Add "My Requests" nav item under student sidebar.

#### [MODIFY] [App.tsx](file:///Users/chauhuu21/Documents/test/new_project/client/src/App.tsx)

- Add route for `/my-requests`.

---

### Part 5: Deprecate Firestore Request Layer

#### [MODIFY] [requestService.ts](file:///Users/chauhuu21/Documents/test/new_project/server/src/services/requestService.ts)

- Migrate from Firestore `db.collection('requests')` to Sequelize `MarketplaceRequest` model.
- Or mark as deprecated in favor of the new `marketplaceRoutes.ts`.

> [!WARNING]
> This is the riskiest part. We should only do this after Parts 1–4 are stable and the new Sequelize-based flow is proven.

---

## Database Schema (No Changes Needed)

The existing Sequelize models already cover the full schema:

```
┌──────────────────────┐      ┌─────────────────────────┐
│     Users            │      │   TeacherListings       │
│──────────────────────│      │─────────────────────────│
│ id (PK, Firebase UID)│◄────┤ teacherId (FK→Users.id) │
│ firstName            │      │ id (PK, auto-increment) │
│ lastName             │      │ title                   │
│ email                │      │ description             │
│ role                 │      │ skills[]                │
│ wallet_balance       │      │ pricePerHour            │
└──────────────────────┘      │ sessionDuration         │
         ▲                    │ isActive                │
         │                    └─────────────────────────┘
         │
┌────────┴─────────────┐
│ MarketplaceRequests  │
│──────────────────────│
│ id (PK)              │
│ studentId (FK→Users) │
│ teacherId (FK→Users) │
│ attemptId (FK→Attempts)│
│ status               │
│ fee                  │
│ feedbackPath         │
└──────────────────────┘
```

## Execution Strategy

> [!IMPORTANT]
> Per your request, I will execute **only Part 1** (Public Listings API) in this session, then stop and report. This keeps each chunk small and crash-safe.

## Verification Plan

### Part 1 Verification
- `npm run build` on server passes with no TypeScript errors.
- `curl http://localhost:3000/api/marketplace/listings` returns a JSON array (empty or populated).
- Route is properly mounted in `app.ts`.
