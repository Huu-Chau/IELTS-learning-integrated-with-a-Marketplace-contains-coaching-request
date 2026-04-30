const fs = require('fs');
const files = [
  'cambridge_18_reading.json',
  'cambridge_19_reading.json',
  'cambridge_20_reading.json'
];

for (const file of files) {
  const filePath = `src/database/mock-test/${file}`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let fixed = 0;
  for (const test of data.tests) {
    if (!test.passages) continue;
    for (const passage of test.passages) {
      if (!passage.sub_sections) continue;
      for (const section of passage.sub_sections) {
        if (!section.questions) continue;
        for (const question of section.questions) {
          if (Array.isArray(question.answer)) {
            // Check if it's the bad array of strings format
            if (typeof question.answer[0] === 'string') {
              // Convert to listening style format
              // The question_number might be a string like "20-21" or "39-40"
              const qnStr = question.question_number.toString();
              const qnMatch = qnStr.match(/(\d+)-(\d+)/);
              if (qnMatch) {
                const start = parseInt(qnMatch[1]);
                const newAnswer = [];
                for (let i = 0; i < question.answer.length; i++) {
                  newAnswer.push({
                    question_number: start + i,
                    answer: question.answer[i]
                  });
                }
                question.answer = newAnswer;
                fixed++;
              } else {
                console.log(`Could not parse question_number: ${qnStr} in ${file}`);
              }
            }
          }
        }
      }
    }
  }
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    console.log(`Fixed ${fixed} questions in ${file}`);
  } else {
    console.log(`No array answers found in ${file}`);
  }
}
