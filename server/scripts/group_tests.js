const fs = require('fs');
const path = require('path');

const dir = '/Users/chauhuu21/Documents/test/new_project/server/src/database/mock-test';

const books = [18, 19, 20];

books.forEach(bookNum => {
    const groupedData = {
        book: `Cambridge ${bookNum}`,
        skill: "LISTENING",
        tests: []
    };

    for (let i = 1; i <= 4; i++) {
        const filePath = path.join(dir, `cambridge${bookNum}_listening_test${i}.json`);
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf8');
            try {
                const testData = JSON.parse(rawData);

                // Add test to array, reformatting slightly if needed
                groupedData.tests.push({
                    test_number: i,
                    test_name: testData.test_name || `Cambridge IELTS ${bookNum} - Test ${i}`,
                    parts: testData.parts || []
                });

                // Optionally log that the file was read
                console.log(`Successfully merged ${filePath}`);

            } catch (err) {
                console.error(`Error parsing ${filePath}:`, err);
            }
        } else {
            console.warn(`File not found: ${filePath}`);
        }
    }

    // Write the output file
    const outputFilePath = path.join(dir, `cambridge_${bookNum}_listening.json`);
    fs.writeFileSync(outputFilePath, JSON.stringify(groupedData, null, 2), 'utf8');
    console.log(`Created ${outputFilePath}`);
});

console.log('Grouping complete!');
