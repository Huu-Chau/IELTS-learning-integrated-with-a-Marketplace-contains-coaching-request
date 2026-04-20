const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config.json').development;
const sequelize = new Sequelize(config.database, config.username, config.password, config);

async function run() {
  const [results] = await sequelize.query(`
    SELECT content FROM "MockMaterials" 
    WHERE book = 'Cambridge 20' AND skill = 'READING' AND test_number = 2;
  `);

  const passage2 = results[0].content.passages[1];
  console.log(JSON.stringify(passage2.sub_sections, null, 2).substring(0, 2000));
}

run().catch(console.error).finally(() => process.exit(0));
