const fs = require('fs');

const mdPath = 'src/database/mock-test/cam20_2_passagetext.md';
const jsonPath = 'src/database/mock-test/cambridge_20_reading.json';

const md = fs.readFileSync(mdPath, 'utf8');
const chunks = md.split(/\n\s*\n/).map(c => c.trim()).filter(c => c.length > 0);

// Just take the first 3 chunks (chunk 4 is a duplicate of chunk 3)
const passages = chunks.slice(0, 3);

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const test2 = data.tests.find(t => t.test_number === 2);

if (test2 && test2.passages && test2.passages.length === 3) {
  for (let i = 0; i < 3; i++) {
    // Split by newlines, strip the A., B., C. prefix if present, and join with double newlines
    const paragraphs = passages[i].split('\n').map(p => p.trim());
    const cleanedParagraphs = paragraphs.map(p => {
        return p.replace(/^[A-Z]\.\s+/, '');
    });
    test2.passages[i].passage_text = cleanedParagraphs.join('\n\n');
  }
  
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
  console.log("Successfully updated Cambridge 20 Reading Test 2 passages!");
} else {
  console.error("Test 2 or its passages not found in the JSON");
}
