<?xml version="1.0" encoding="UTF-8"?>
<plan>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!--  8A: MATERIAL DATABASE SCHEMA & SEEDING                -->
  <!-- ═══════════════════════════════════════════════════════ -->

  <task type="auto">
    <name>Create TestMaterials Migration</name>
    <files>server/migrations/YYYYMMDDHHMMSS-create-test-materials.js</files>
    <action>
      Create a Sequelize migration file following the existing pattern in
      `20260214152554-create-marketplace-request.js`.

      Columns:
        - id: INTEGER, PK, autoIncrement
        - skill: STRING (enum values: reading, writing, speaking, listening)
        - title: STRING
        - content: JSONB (stores full test data)
        - difficulty: STRING (nullable)
        - source: STRING (nullable)
        - createdAt: DATE
        - updatedAt: DATE
    </action>
    <verify>
      `docker-compose exec app npx sequelize-cli db:migrate` runs without error.
      `TestMaterials` table appears in the Postgres database.
    </verify>
    <done>Migration runs cleanly up and down.</done>
  </task>

  <task type="auto">
    <name>Create TestMaterial Sequelize Model</name>
    <files>server/src/models/TestMaterial.ts</files>
    <action>
      Create a Sequelize model mirroring the migration schema.
      Use TypeScript `declare` fields following the existing `Attempt.ts` pattern.
      Export as the default export.
    </action>
    <verify>TypeScript compiles without errors referencing this model.</verify>
    <done>Model is importable and type-safe.</done>
  </task>

  <task type="auto">
    <name>Write and Run Material Seeder Script</name>
    <files>server/scripts/seedMaterials.ts</files>
    <action>
      Create a standalone Node.js/TypeScript script that:
      1. Imports `TestMaterial` model and Sequelize connection.
      2. Reads the 4 JSON files from `/Users/chauhuu21/Documents/test/apps/api/src/database/`:
         - readingTests.json  → skill: 'reading'
         - writingTests.json  → skill: 'writing'
         - speakingTests.json → skill: 'speaking'
         - listeningTests.json → skill: 'listening'
      3. Maps each record to the `TestMaterial` schema (title from item.title, content = full item object).
      4. Calls `TestMaterial.bulkCreate(records, { ignoreDuplicates: true })`.
      5. Prints a success count to stdout.

      Add an npm script: `"seed:materials": "ts-node scripts/seedMaterials.ts"`
    </action>
    <verify>
      `npm run seed:materials` inside the Docker container inserts records.
      `SELECT COUNT(*) FROM "TestMaterials"` returns > 0.
    </verify>
    <done>All legacy JSON material data is stored in PostgreSQL.</done>
  </task>


  <!-- ═══════════════════════════════════════════════════════ -->
  <!--  8B: API ENDPOINTS                                     -->
  <!-- ═══════════════════════════════════════════════════════ -->

  <task type="auto">
    <name>Create Material API Endpoints</name>
    <files>
      server/src/controllers/testMaterialController.ts,
      server/src/routes/testMaterialRoutes.ts,
      server/src/app.ts
    </files>
    <action>
      1. `testMaterialController.ts`:
         - `listMaterials(req, res)`: Queries `TestMaterial.findAll({ where: { skill } })` using `req.query.skill`.
         - `getMaterial(req, res)`: Queries `TestMaterial.findByPk(req.params.id)`.
      2. `testMaterialRoutes.ts`: Mount both handlers.
         - GET /api/materials
         - GET /api/materials/:id
      3. Mount the router in `app.ts`.
    </action>
    <verify>
      `curl http://localhost:5000/api/materials?skill=speaking` returns a JSON array.
      `curl http://localhost:5000/api/materials/1` returns a single material object.
    </verify>
    <done>Material API endpoints are live and returning data.</done>
  </task>


  <!-- ═══════════════════════════════════════════════════════ -->
  <!--  8C: NAVIGATION REFACTOR                               -->
  <!-- ═══════════════════════════════════════════════════════ -->

  <task type="auto">
    <name>Add Mock Test Section to Sidebar Nav</name>
    <files>client/src/layouts/DashboardLayout.tsx</files>
    <action>
      1. Import a new icon (e.g. `ClipboardList`) from lucide-react.
      2. Add a new `MOCK_TEST_ITEMS` array alongside `PRACTICE_ITEMS`.
      3. Add a new collapsible "Mock Test" dropdown section into the student sidebar nav,
         styled consistently with the existing "Practice" dropdown.
         Items: Reading (disabled), Listening (disabled), Writing (disabled), Speaking (active → /mock-test/speaking).
    </action>
    <verify>The sidebar shows both "Practice" and "Mock Test" collapsible sections.</verify>
    <done>Nav is refactored and visually consistent.</done>
  </task>

  <task type="auto">
    <name>Add Mock Test Routes and Shell Pages</name>
    <files>
      client/src/App.tsx,
      client/src/pages/mock-test/MockTestLayout.tsx,
      client/src/pages/mock-test/MockTestSpeaking.tsx,
      client/src/pages/mock-test/MockTestPlaceholder.tsx
    </files>
    <action>
      1. `MockTestPlaceholder.tsx`: A simple page showing "Coming Soon" with a countdown timer stub.
      2. `MockTestSpeaking.tsx`: Re-exports / wraps the existing `SpeakingInterface.tsx` component.
         Add a "⏱ 15 min" badge at the top to indicate it is a timed mock test.
      3. Add routes in `App.tsx`:
         - /mock-test/speaking → MockTestSpeaking
         - /mock-test/reading → MockTestPlaceholder
         - /mock-test/listening → MockTestPlaceholder
         - /mock-test/writing → MockTestPlaceholder
    </action>
    <verify>Navigating to /mock-test/speaking opens the existing speaking examiner.</verify>
    <done>Mock Test routes and shell pages are in place.</done>
  </task>

  <task type="auto">
    <name>Redesign Practice > Speaking with Part/Topic Selector</name>
    <files>client/src/pages/practice/PracticeSpeaking.tsx</files>
    <action>
      Create a new `PracticeSpeaking.tsx` page (separate from the mock test speaking):
      1. Fetch speaking materials from `GET /api/materials?skill=speaking`.
      2. Show a "Select Part" dropdown: Part 1 / Part 2 / Part 3.
      3. Show a "Select Topic" dropdown based on the materials fetched (topic titles).
      4. A "Start Practice" button that navigates to the speaking session with the selected topic
         passed as a query param or state (the speaking controller will use it instead of random selection).
      5. Update the /practice/speaking route in App.tsx to use this new page.
    </action>
    <verify>
      The Practice > Speaking page shows two dropdowns and a Start button.
      Selecting a topic and clicking Start opens the AI examiner on that topic.
    </verify>
    <done>Practice Speaking has a proper topic/part selector driven by real DB data.</done>
  </task>

</plan>
