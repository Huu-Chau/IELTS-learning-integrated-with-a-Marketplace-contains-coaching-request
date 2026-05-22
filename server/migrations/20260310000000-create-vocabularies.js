'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Vocabularies', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            userId: {
                type: Sequelize.STRING(128),
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            word: {
                type: Sequelize.STRING,
                allowNull: false
            },
            englishMeaning: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            vietnameseMeaning: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            ipaSpelling: {
                type: Sequelize.STRING,
                allowNull: true
            },
            masteryLevel: {
                type: Sequelize.ENUM('New', 'Learning', 'Mastered'),
                defaultValue: 'New'
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Vocabularies');
    }
};
