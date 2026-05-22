'use strict';
const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const filePath = path.join(__dirname, '../scripts/cambridge_20_reading_texts.txt');
      let fileContent = "";
      if (fs.existsSync(filePath)) {
          fileContent = fs.readFileSync(filePath, 'utf-8');
      } else {
        console.warn(`Text file not found at ${filePath}. Make sure it exists!`);
        await transaction.rollback();
        return;
      }

      // Loop over tests 1 through 4
      const testsToUpdate = [1, 2, 3, 4];
      for (const test_number of testsToUpdate) {
          const [results] = await queryInterface.sequelize.query(
            `SELECT id, content FROM "MockMaterials" WHERE book LIKE '%Cambridge%20%' AND skill = 'READING' AND test_number = ${test_number};`,
            { transaction }
          );

          if (results.length === 0) {
            console.log(`No Cambridge 20 Test ${test_number} Reading record found. Skipping.`);
            continue;
          }

          const record = results[0];
          const content = record.content;
          
          if (!content.passages) continue;

          let updated = false;
          for (let p = 1; p <= 3; p++) {
             // Look for block matching this specific test and passage
             const regex = new RegExp(`=== TEST ${test_number}, PASSAGE ${p} ===\\n([\\s\\S]*?)(?=\\n=== TEST |$)`);
             const match = fileContent.match(regex);
             if (match) {
                 content.passages[p - 1].text = match[1].trim();
                 updated = true;
             }
          }

          if (updated) {
              await queryInterface.sequelize.query(
                `UPDATE "MockMaterials" SET content = :content WHERE id = :id;`,
                {
                  replacements: { content: JSON.stringify(content), id: record.id },
                  type: Sequelize.QueryTypes.UPDATE,
                  transaction
                }
              );
              console.log(`Migration Successfully Added Text for Cambridge 20 Test ${test_number}!`);
          }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const testsToUpdate = [1, 2, 3, 4];
      for (const test_number of testsToUpdate) {
          const [results] = await queryInterface.sequelize.query(
            `SELECT id, content FROM "MockMaterials" WHERE book LIKE '%Cambridge%20%' AND skill = 'READING' AND test_number = ${test_number};`,
            { transaction }
          );

          if (results.length > 0) {
            const record = results[0];
            const content = record.content;
            
            if (content.passages) {
               content.passages[0].text = "";
               content.passages[1].text = "";
               content.passages[2].text = "";
               
               await queryInterface.sequelize.query(
                 `UPDATE "MockMaterials" SET content = :content WHERE id = :id;`,
                 {
                   replacements: { content: JSON.stringify(content), id: record.id },
                   type: Sequelize.QueryTypes.UPDATE,
                   transaction
                 }
               );
            }
          }
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
