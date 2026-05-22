'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. TeacherAvailabilities
      await queryInterface.removeColumn('TeacherAvailabilities', 'dayOfWeek', { transaction });
      await queryInterface.addColumn('TeacherAvailabilities', 'date', {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }, { transaction });
      await queryInterface.addColumn('TeacherAvailabilities', 'timezone', {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: 'Asia/Ho_Chi_Minh',
      }, { transaction });

      // 2. Reservations
      await queryInterface.removeColumn('Reservations', 'listingId', { transaction });
      await queryInterface.addColumn('Reservations', 'availabilityId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'TeacherAvailabilities',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }, { transaction });
      await queryInterface.addColumn('Reservations', 'listing', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      }, { transaction });
      await queryInterface.addColumn('Reservations', 'fee', {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      }, { transaction });
      await queryInterface.addIndex('Reservations', ['availabilityId', 'status'], {
        unique: true,
        transaction
      });

      // 3. MarketplaceRequests
      await queryInterface.removeColumn('MarketplaceRequests', 'scheduledAt', { transaction });
      await queryInterface.removeColumn('MarketplaceRequests', 'durationMinutes', { transaction });
      await queryInterface.addColumn('MarketplaceRequests', 'reservationId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Reservations',
          key: 'id'
        }
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 3. MarketplaceRequests
      await queryInterface.removeColumn('MarketplaceRequests', 'reservationId', { transaction });
      await queryInterface.addColumn('MarketplaceRequests', 'scheduledAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn('MarketplaceRequests', 'durationMinutes', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
      }, { transaction });

      // 2. Reservations
      await queryInterface.removeIndex('Reservations', ['availabilityId', 'status'], { transaction });
      await queryInterface.removeColumn('Reservations', 'fee', { transaction });
      await queryInterface.removeColumn('Reservations', 'listing', { transaction });
      await queryInterface.removeColumn('Reservations', 'availabilityId', { transaction });
      await queryInterface.addColumn('Reservations', 'listingId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'TeacherListings',
          key: 'id'
        },
        onDelete: 'CASCADE',
        defaultValue: 1
      }, { transaction });

      // 1. TeacherAvailabilities
      await queryInterface.removeColumn('TeacherAvailabilities', 'timezone', { transaction });
      await queryInterface.removeColumn('TeacherAvailabilities', 'date', { transaction });
      await queryInterface.addColumn('TeacherAvailabilities', 'dayOfWeek', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
