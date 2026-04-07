import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('agent_runs', {
    id: { type: 'text', primaryKey: true },
    user_id: { type: 'text', references: 'users', onDelete: 'SET NULL' },
    kind: { type: 'text', notNull: true },
    provider: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
    request_id: { type: 'text', notNull: true },
    metadata_json: { type: 'text' },
    created_at: { type: 'text', notNull: true },
    updated_at: { type: 'text', notNull: true },
  });

  pgm.createTable('agent_run_events', {
    id: { type: 'text', primaryKey: true },
    run_id: {
      type: 'text',
      notNull: true,
      references: 'agent_runs',
      onDelete: 'CASCADE',
    },
    level: { type: 'text', notNull: true },
    message: { type: 'text', notNull: true },
    payload_json: { type: 'text' },
    created_at: { type: 'text', notNull: true },
  });

  pgm.createTable('retrieval_sources', {
    id: { type: 'text', primaryKey: true },
    user_id: { type: 'text', references: 'users', onDelete: 'SET NULL' },
    source_type: { type: 'text', notNull: true },
    source_id: { type: 'text', notNull: true },
    content: { type: 'text', notNull: true },
    metadata_json: { type: 'text' },
    created_at: { type: 'text', notNull: true },
    updated_at: { type: 'text', notNull: true },
  });

  pgm.createTable('document_embeddings', {
    id: { type: 'text', primaryKey: true },
    retrieval_source_id: {
      type: 'text',
      notNull: true,
      references: 'retrieval_sources',
      onDelete: 'CASCADE',
    },
    provider: { type: 'text', notNull: true },
    embedding_model: { type: 'text', notNull: true },
    embedding: { type: 'text', notNull: true },
    created_at: { type: 'text', notNull: true },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('document_embeddings');
  pgm.dropTable('retrieval_sources');
  pgm.dropTable('agent_run_events');
  pgm.dropTable('agent_runs');
}
