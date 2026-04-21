# SPEC: Epic B — UI Refactor & IELTS Material Migration

## Objective
Restructure the application into two clear learning modes:
1. **Mock Test** — timed, full-skill exam simulation (current Speaking flow moves here)
2. **Practice Mode** — topic/part selector for skill-building without time pressure

Simultaneously migrate all IELTS test materials from the legacy JSON files into the live PostgreSQL database so the platform serves real content.

## Enforced Skills
- `@nodejs-backend-patterns` (Repository pattern for material fetching)
- `@react-best-practices` (Lazy loading per-skill page, local state for countdown)

---

## Requirements

### 1. Database Schema: `TestMaterials` Table
One unified table to store all skill types (reading, writing, speaking, listening).

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `skill` | ENUM('reading', 'writing', 'speaking', 'listening') | Skill category |
| `title` | STRING | e.g. "A Brief History of Humans and Food" |
| `content` | JSONB | Full test data (questions, passage_text, parts, etc.) |
| `difficulty` | STRING | 'easy', 'medium', 'hard' |
| `source` | STRING | e.g. 'Cambridge 18', 'Practice 1' (optional) |
| `createdAt` | DATE | Auto |
| `updatedAt` | DATE | Auto |

### 2. Seeder Script
A Node.js script at `server/scripts/seedMaterials.ts` that:
- Reads all 4 legacy JSON files from `/test/apps/api/src/database/`
- Maps them to the `TestMaterials` schema
- Uses `bulkCreate` to insert without duplicating on re-run

### 3. API Endpoints
- `GET /api/materials?skill=speaking` — list all materials for a skill
- `GET /api/materials/:id` — get a single material with full content

### 4. Navigation Refactor (`DashboardLayout.tsx`)
```
Sidebar
├── Dashboard
├── Practice            (existing dropdown)
│   ├── Reading         [disabled for now]
│   ├── Listening       [disabled for now]
│   ├── Writing         [links to existing WritingTest]
│   └── Speaking        [NEW: part selector + topic chooser]
├── Mock Test           [NEW top-level item]
│   ├── Reading         [shell with countdown]
│   ├── Listening       [shell with countdown]
│   ├── Writing         [shell with countdown]
│   └── Speaking        [moves existing SpeakingInterface here]
├── History             [future]
└── Marketplace
```

### 5. Practice > Speaking Redesign
- Dropdown to choose **Part 1**, **Part 2**, or **Part 3**
- Second dropdown to choose a **Topic** (fetched from the `TestMaterials` API)
- Start button → opens a lightweight, non-timed speaking session

### 6. Mock Test Shell Pages
Each mock test page needs:
- A countdown timer component
- A "Start Test" confirmation screen
- Skill-specific content (pulled from DB)

## Scope (Phase 8)
- Database schema + seeder ✅
- Nav refactor ✅
- Mock Test Speaking (reuse existing `SpeakingInterface`) ✅
- Practice Speaking redesign (part/topic selector) ✅
- Mock Test shells for Reading, Writing, Listening (countdown + placeholder) ✅
- Live Reading/Listening/Writing in Mock Test mode: **OUT OF SCOPE for Phase 8**
