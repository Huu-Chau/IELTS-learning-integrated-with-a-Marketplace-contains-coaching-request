const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config.json')['development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: false
});

const MockMaterial = sequelize.define('MockMaterial', {
    id: { type: DataTypes.UUID, primaryKey: true },
    book: DataTypes.TEXT,
    skill: DataTypes.TEXT,
    title: DataTypes.TEXT,
    test_number: DataTypes.INTEGER,
    content: DataTypes.JSONB
}, {
    tableName: 'MockMaterials',
    timestamps: true
});

async function run() {
    try {
        await sequelize.authenticate();

        const materials = await MockMaterial.findAll({
            where: {
                book: { [Sequelize.Op.like]: '%Cambridge%20%' },
                skill: 'READING'
            }
        });

        console.log(`Found ${materials.length} reading records for Cambridge 20:`);
        materials.forEach(m => {
            console.log(`\nID: ${m.id} | Title: ${m.title} | Test: ${m.test_number}`);
            if (m.content && m.content.passages) {
                console.log(`Has ${m.content.passages.length} passages.`);
                m.content.passages.forEach((p, idx) => {
                    console.log(`  Passage ${idx + 1}: ${p.title} - Text length: ${p.text ? p.text.length : 0}`);
                    if (p.text) {
                        console.log(`     Start: ${p.text.substring(0, 100)}...`);
                    }
                });
            } else {
                console.log("No content or passages array");
            }
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

run();
