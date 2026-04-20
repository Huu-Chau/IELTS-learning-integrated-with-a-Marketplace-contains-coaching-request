const fs = require('fs');
const path = require('path');

// Get the book and skill from command line arguments (e.g., node import_listening_answers.js 19 listening)
const args = process.argv.slice(2);
const book = args[0];
const skill = args[1] ? args[1].toLowerCase() : 'listening';

if (!book) {
    console.error(`Please provide a book number. Usage: node scripts/import_listening_answers.js <book_number> [skill]`);
    console.error(`Example: node scripts/import_listening_answers.js 19`);
    process.exit(1);
}

const jsonFilename = `cambridge_${book}_${skill}.json`;
const ansFilename = `cambridge_${book}_${skill}_answer.md`;

const jsonPath = path.join(__dirname, `../src/database/mock-test/${jsonFilename}`);
const ansPath = path.join(__dirname, `../src/database/mock-test/${ansFilename}`);

function normalize(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function run() {
    console.log(`\n--- Importing answers for ${jsonFilename} ---`);
    try {
        if (!fs.existsSync(jsonPath)) {
            console.error(`❌ Error: Could not find JSON file at ${jsonPath}`);
            return;
        }
        if (!fs.existsSync(ansPath)) {
            console.error(`❌ Error: Could not find Answer file at ${ansPath}`);
            return;
        }

        const rawJson = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(rawJson);
        const answers = fs.readFileSync(ansPath, 'utf8')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && l !== '.'); // Ignore empty lines or lone periods

        let answerIndex = 0;
        let warnings = 0;

        for (const test of data.tests) {
            const partsOrPassages = test.parts || test.passages || [];
            for (const part of partsOrPassages) {
                let questions = part.questions;
                if (!questions && part.sub_sections) {
                    questions = [];
                    for (const sub of part.sub_sections) {
                        if (sub.questions) {
                            questions.push(...sub.questions);
                        }
                    }
                }

                if (questions) {
                    for (const q of questions) {
                        if (answerIndex < answers.length) {
                            const rawAnsString = answers[answerIndex];
                            // Split by / to support multiple correct answers
                            const ansParts = rawAnsString.split('/').map(a => a.trim()).filter(a => a);
                            
                            let finalAnsParts = [];

                            for (const ansString of ansParts) {
                                let finalAns = ansString;
                                let matched = false;

                                // Reverse lookup if it's a multiple choice (letter/numeral) format
                                if (q.options && ansString.length > 1 && q.answer_format && (q.answer_format.includes("letter") || q.answer_format.includes("numeral"))) {
                                    const searchStr = normalize(ansString);
                                    for (const [key, val] of Object.entries(q.options)) {
                                        const optionStr = normalize(val);
                                        if (optionStr === searchStr || optionStr.includes(searchStr) || searchStr.includes(optionStr)) {
                                            finalAns = key;
                                            matched = true;
                                            break;
                                        }
                                    }
                                    if (!matched) {
                                        console.log(`⚠️ Warning: Could not match option text "${ansString}" for Test ${test.test_number} Question ${q.question_number}`);
                                        warnings++;
                                    }
                                }
                                finalAnsParts.push(finalAns);
                            }

                            // Store as an array if multiple answers, otherwise just as a string
                            q.answer = finalAnsParts.length > 1 ? finalAnsParts : finalAnsParts[0];
                            answerIndex++;
                        }
                    }
                }
            }
        }

        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`\n🎉 Success! Processed answers for ${answerIndex} questions and updated ${jsonFilename}.`);
        if (warnings > 0) {
            console.log(`⚠️ There were ${warnings} warnings about unmatched multiple-choice options. Please review them!`);
        }
    } catch (e) {
        console.error('❌ Error during processing:', e);
    }
}

run();
