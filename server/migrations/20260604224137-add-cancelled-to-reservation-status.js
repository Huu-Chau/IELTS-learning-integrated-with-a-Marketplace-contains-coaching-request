'use strict';

/**
 * Adds 'cancelled' to the Reservations.status enum (enum_Reservations_status).
 *
 * NOTE: PostgreSQL `ALTER TYPE ... ADD VALUE` cannot run inside a transaction
 * block, so this migration intentionally does NOT use an explicit transaction.
 *
 * IRREVERSIBLE: PostgreSQL cannot drop a single enum value without recreating
 * the whole type. `down()` is a deliberate no-op — leaving an unused value is
 * harmless.
 *
 * DEPLOY ORDER: apply this migration BEFORE deploying code that writes
 * 'cancelled', otherwise writes fail with an invalid-enum error.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Reservations_status" ADD VALUE IF NOT EXISTS 'cancelled';`
    );
  },

  async down() {
    // Intentional no-op — PG cannot drop an enum value without a full type swap.
  },
};
