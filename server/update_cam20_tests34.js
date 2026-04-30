const fs = require('fs');

const jsonPath = 'src/database/mock-test/cambridge_20_reading.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ── Test 3 ───────────────────────────────────────────────────────────────────
const md3 = fs.readFileSync('src/database/mock-test/cam20_3_passagetext.md', 'utf8');
const chunks3 = md3.split(/\n\s*\n/).map(c => c.trim()).filter(c => c.length > 0);

// File has 3 passage blocks: Frozen Food, Coral reefs, Robots and us
const test3 = data.tests.find(t => t.test_number === 3);
if (test3 && test3.passages && test3.passages.length === 3) {
  for (let i = 0; i < 3; i++) {
    // Each chunk: first line is title, second is subtitle (if any), rest is body
    const lines = chunks3[i].split('\n');
    // Join all lines with double newline so frontend splits correctly
    test3.passages[i].passage_text = lines.join('\n\n');
  }
  console.log('Updated Test 3 passages:', test3.passages.map(p => p.title));
} else {
  console.error('Test 3 not found or wrong passage count:', test3?.passages?.length);
}

// ── Test 4 ───────────────────────────────────────────────────────────────────
const md4 = fs.readFileSync('src/database/mock-test/cam20_4_passagetext.md', 'utf8');
const chunks4 = md4.split(/\n\s*\n/).map(c => c.trim()).filter(c => c.length > 0);

const test4 = data.tests.find(t => t.test_number === 4);
if (test4 && test4.passages && test4.passages.length === 3) {
  for (let i = 0; i < 3; i++) {
    const lines = chunks4[i].split('\n');
    test4.passages[i].passage_text = lines.join('\n\n');
  }
  console.log('Updated Test 4 passages:', test4.passages.map(p => p.title));
} else {
  console.error('Test 4 not found or wrong passage count:', test4?.passages?.length);
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
console.log('Done. cambridge_20_reading.json updated.');
