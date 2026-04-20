node scripts/import_listening_answers.js 19
# or
node scripts/import_listening_answers.js 18

import ans to full json test
node scripts/import_listening_answers.js

Once that says "Success!", don't forget to push those new answers to PostgreSQL
npx ts-node src/migrations/002_seed_mock_materials.ts

group test 1 2 3 4 to full
node scripts/group_cambridge_tests.js reading