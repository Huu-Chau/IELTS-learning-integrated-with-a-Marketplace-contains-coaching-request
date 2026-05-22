'use strict';

/**
 * Migration: Fix Reservation unique index
 *
 * Problem:
 *   The old index `reservations_availability_id_status` was a composite unique
 *   on (availabilityId, status). This meant a slot (availabilityId) could only
 *   ever have ONE 'expired' row — but a slot can legitimately be booked,
 *   abandoned (→ expired), then booked again (→ another expired). The cron job
 *   that expires pending reservations was crashing with error 23505 on the
 *   second expiry of the same slot.
 *
 * Fix:
 *   Drop the broad composite unique index and replace it with two PARTIAL
 *   unique indexes:
 *     - One that enforces at most one 'pending' reservation per slot.
 *     - One that enforces at most one 'completed' booking per slot.
 *   'expired' rows are intentionally left unconstrained.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Drop the old composite unique constraint
        await queryInterface.removeConstraint(
            'Reservations',
            'reservations_availability_id_status',
        ).catch(() => {
            // Constraint may not exist if the DB was synced without it
            console.log('[Migration] reservations_availability_id_status not found — skipping drop');
        });

        // Also remove Sequelize's auto-named variant just in case
        await queryInterface.removeIndex(
            'Reservations',
            'reservations_availability_id_status',
        ).catch(() => { });

        // 2. Create partial unique index: only one PENDING reservation per slot
        await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "reservations_availability_id_pending_unique"
      ON "Reservations" ("availabilityId")
      WHERE status = 'pending';
    `);

        // 3. Create partial unique index: only one COMPLETED booking per slot
        await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "reservations_availability_id_completed_unique"
      ON "Reservations" ("availabilityId")
      WHERE status = 'completed';
    `);
    },

    async down(queryInterface, Sequelize) {
        // Revert: drop the two partial indexes and restore the old composite unique
        await queryInterface.removeIndex('Reservations', 'reservations_availability_id_pending_unique').catch(() => { });
        await queryInterface.removeIndex('Reservations', 'reservations_availability_id_completed_unique').catch(() => { });

        await queryInterface.addIndex('Reservations', ['availabilityId', 'status'], {
            unique: true,
            name: 'reservations_availability_id_status',
        });
    },
};