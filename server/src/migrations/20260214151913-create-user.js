'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Users', {
            // Firebase UID as primary key (string, not auto-increment)
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.STRING(128)
            },
            firstName: {
                type: Sequelize.STRING
            },
            lastName: {
                type: Sequelize.STRING
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            role: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'student'
            },
            wallet_balance: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0.00
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
        await queryInterface.dropTable('Users');
    }
};