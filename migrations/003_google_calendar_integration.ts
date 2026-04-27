import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('calendar_events', {
    google_calendar_id: { type: 'text' },
    google_event_id: { type: 'text' },
    google_sync_status: { type: 'text', notNull: true, default: 'not_synced' },
    google_synced_at: { type: 'text' },
    google_sync_error: { type: 'text' },
  });

  pgm.createTable('google_calendar_connections', {
    user_id: {
      type: 'text',
      primaryKey: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    encrypted_refresh_token: { type: 'text', notNull: true },
    calendar_id: { type: 'text', notNull: true, default: 'primary' },
    granted_scopes: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'connected' },
    connected_at: { type: 'text', notNull: true },
    last_synced_at: { type: 'text' },
    last_error: { type: 'text' },
  });

  pgm.createTable('google_oauth_states', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    state_hash: { type: 'text', notNull: true, unique: true },
    expires_at: { type: 'text', notNull: true },
    consumed_at: { type: 'text' },
    created_at: { type: 'text', notNull: true },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('google_oauth_states');
  pgm.dropTable('google_calendar_connections');
  pgm.dropColumns('calendar_events', [
    'google_calendar_id',
    'google_event_id',
    'google_sync_status',
    'google_synced_at',
    'google_sync_error',
  ]);
}
