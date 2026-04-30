const fs = require('fs');

function processFile(file) {
  const filePath = `src/database/mock-test/${file}`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let fixed = 0;
  for (const test of data.tests) {
    if (!test.passages) continue;
    for (const passage of test.passages) {
      if (!passage.sub_sections) continue;
      for (const section of passage.sub_sections) {
        if (!section.questions) continue;
        for (let i = 0; i < section.questions.length; i++) {
          const question = section.questions[i];
          if (Array.isArray(question.answer)) {
            // Check if it's multiple_choice_multiple
            if (question.answer_type === 'multiple_choice_multiple') {
               // The question_number might be an integer, e.g. 20, but the answer is ["B", "D"]
               // If there's another question right after it with the same array, it's a duplicated multi-select
               if (i + 1 < section.questions.length && JSON.stringify(section.questions[i+1].answer) === JSON.stringify(question.answer) && section.questions[i+1].question_number == question.question_number + 1) {
                   // This is a duplicated question! We should probably remove the duplicates and just make it a single array of objects.
                   // Wait, no. The best format is an array of objects.
                   // So: "answer": [ { "question_number": 20, "answer": "B" }, { "question_number": 21, "answer": "D" } ]
                   // And we should ONLY have ONE question object for 20-21.
                   const start = question.question_number;
                   const end = section.questions[i+1].question_number;
                   
                   const newAnswer = [];
                   for (let j = 0; j < question.answer.length; j++) {
                       newAnswer.push({
                           question_number: start + j,
                           answer: question.answer[j]
                       });
                   }
                   question.question_number = `${start}-${end}`;
                   question.answer = newAnswer;
                   // Remove the duplicate question
                   section.questions.splice(i + 1, 1);
                   fixed++;
               } else if (typeof question.question_number === 'string' && question.question_number.includes('-')) {
                   // Like "39-40"
                   const qnMatch = question.question_number.match(/(\d+)-(\d+)/);
                   if (qnMatch) {
                       const start = parseInt(qnMatch[1]);
                       const newAnswer = [];
                       for (let j = 0; j < question.answer.length; j++) {
                           newAnswer.push({
                               question_number: start + j,
                               answer: question.answer[j]
                           });
                       }
                       question.answer = newAnswer;
                       fixed++;
                   }
               } else {
                   // It is a single question_number, e.g. 10. But it has answer: ["B", "D"].
                   // Then we just map it? No, if it's multiple_choice_multiple, the grading pool handles arrays of objects.
                   // Let's convert it to a single object array:
                   question.answer = [{ question_number: question.question_number, answer: question.answer[0] }];
                   // Wait, if it has 2 answers for 1 question number? That's invalid for IELTS. 
                   // Let's assume it's just a single question multiple choice, but grouped differently.
                   console.log(`Unhandled multiple_choice_multiple: Q${question.question_number} in ${file}`);
               }
            } else {
                // Not multiple_choice_multiple! E.g. note_completion.
                // It means alternative answers! ["intestines", "gut"]
                question.answer = question.answer.join(" / ");
                fixed++;
            }
          }
        }
      }
    }
  }
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    console.log(`Fixed ${fixed} questions in ${file}`);
  }
}

processFile('cambridge_19_reading.json');
processFile('cambridge_20_reading.json');
