const fs = require('fs');
const path = require('path');

// Configuration
const MOCK_TEST_DIR = path.join(__dirname, '../src/database/mock-test');
const BOOKS = [18, 19, 20]; // Add more books here if needed
const TESTS_PER_BOOK = 4;

// Get the skill from command line arguments (e.g., node group_tests.js reading)
const args = process.argv.slice(2);
const skill = args[0] ? args[0].toLowerCase() : null;

const VALID_SKILLS = ['listening', 'reading', 'writing', 'speaking'];

if (!skill || !VALID_SKILLS.includes(skill)) {
    console.error(`Please provide a valid skill. Usage: node group_tests.js <skill>`);
    console.error(`Valid skills: ${VALID_SKILLS.join(', ')}`);
    console.error(`Example: node group_tests.js reading`);
    process.exit(1);
}

console.log(`\n--- Starting Grouping for Skill: ${skill.toUpperCase()} ---`);

// Process each Cambridge Book
BOOKS.forEach(bookNum => {
    const groupedData = {
        book: `Cambridge ${bookNum}`,
        skill: skill.toUpperCase(),
        tests: []
    };

    let filesFound = 0;

    for (let testNum = 1; testNum <= TESTS_PER_BOOK; testNum++) {
        // Expected filename format: cambridge19_reading_test1.json
        const filename = `cambridge${bookNum}_${skill}_test${testNum}.json`;
        const filePath = path.join(MOCK_TEST_DIR, filename);

        if (fs.existsSync(filePath)) {
            filesFound++;
            const rawData = fs.readFileSync(filePath, 'utf8');
            try {
                const testData = JSON.parse(rawData);

                // Add the test to the array
                groupedData.tests.push({
                    test_number: testNum,
                    test_name: testData.test_name || `Cambridge IELTS ${bookNum} - Test ${testNum}`,
                    // It will dynamically grab whatever data arrays are in the JSON source file.
                    // For listening/speaking it's usually "parts", for reading it's usually "passages", writing "tasks"
                    ...testData
                });

                console.log(`✅ Loaded: ${filename}`);
            } catch (err) {
                console.error(`❌ Error parsing ${filename}:`, err.message);
            }
        } else {
            console.log(`⚠️  Skipped (Not found): ${filename}`);
        }
    }

    // Only create the grouped file if we actually found tests for this book!
    if (filesFound > 0) {
        const outputFilename = `cambridge_${bookNum}_${skill}.json`;
        const outputFilePath = path.join(MOCK_TEST_DIR, outputFilename);

        fs.writeFileSync(outputFilePath, JSON.stringify(groupedData, null, 2), 'utf8');
        console.log(`🎉 Success! Created combined file: ${outputFilename}\n`);
    } else {
        console.log(`⏭️  No ${skill} files found for Cambridge ${bookNum}. Skipping.\n`);
    }
});

console.log('--- Grouping Process Complete! ---\n');
