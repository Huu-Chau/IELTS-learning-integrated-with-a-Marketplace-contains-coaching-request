'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TestMaterials', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            skill: {
                type: Sequelize.STRING(20),
                allowNull: false,
                comment: 'reading | writing | speaking | listening',
            },
            title: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            content: {
                type: Sequelize.JSONB,
                allowNull: false,
                comment: 'Full test data — shape varies per skill',
            },
            metadata: {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'Lightweight filter fields, e.g. { part: 1 } or { section: 2 }',
            },
            difficulty: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            source: {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'e.g. Cambridge 18, Practice 1',
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });

        // Index for fast filtering by skill
        await queryInterface.addIndex('TestMaterials', ['skill']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('TestMaterials');
    },
};