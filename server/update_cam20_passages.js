const fs = require('fs');

const mdPath = 'src/database/mock-test/cam20_1_passagetext.md';
const jsonPath = 'src/database/mock-test/cambridge_20_reading.json';

const md = fs.readFileSync(mdPath, 'utf8');
const chunks = md.split(/\n\s*\n/).map(c => c.trim()).filter(c => c.length > 0);

if (chunks.length !== 3) {
  console.error("Expected 3 passages, found " + chunks.length);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const test1 = data.tests.find(t => t.test_number === 1);

if (test1 && test1.passages && test1.passages.length === 3) {
  // Overwrite passage_text
  // The frontend component normalizes text by splitting on /\n+/
  // We can just set the passage_text to the string, replacing single newlines with double newlines
  // so that it splits cleanly. Or we can just set it as is, and the frontend will split it by single newlines.
  // Actually, wait, the frontend MockTestReadingSession.tsx normalizes like this:
  // rawText.split(/\n+/).map(p => p.trim())
  // So single newlines in the string will be treated as paragraph breaks. 
  // Let's replace single newlines with double newlines just to be safe and match the other files.
  for (let i = 0; i < 3; i++) {
    test1.passages[i].passage_text = chunks[i].split('\n').join('\n\n');
  }
  
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
  console.log("Successfully updated Cambridge 20 Reading Test 1 passages!");
} else {
  console.error("Test 1 or its passages not found in the JSON");
}
