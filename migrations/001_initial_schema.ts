import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('users', {
    id: { type: 'text', primaryKey: true },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    created_at: { type: 'text', notNull: true },
  });

  pgm.createTable('auth_sessions', {
    token: { type: 'text', primaryKey: true },
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'text', notNull: true },
  });

  pgm.createTable('goals', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true },
    level: { type: 'text', notNull: true },
    hours: { type: 'integer', notNull: true },
    target_date: { type: 'text' },
    preferred_style: { type: 'text' },
    resource_mode: { type: 'text', notNull: true, default: 'needs_plan' },
    status: { type: 'text', notNull: true, default: 'active' },
    created_at: { type: 'text', notNull: true },
  });

  pgm.createTable('tasks', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    goal_id: {
      type: 'integer',
      notNull: true,
      references: 'goals',
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
    created_at: { type: 'text', notNull: true },
    completed_at: { type: 'text' },
  });

  pgm.createTable('calendar_events', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    task_id: {
      type: 'integer',
      notNull: true,
      references: 'tasks',
      onDelete: 'CASCADE',
    },
    date: { type: 'text', notNull: true },
    duration: { type: 'integer', notNull: true },
  });

  pgm.createTable('notes', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    topic: { type: 'text', notNull: true },
    content: { type: 'text', notNull: true },
    kind: { type: 'text', notNull: true, default: 'plan' },
    created_at: { type: 'text', notNull: true },
  });

  pgm.createTable('study_sessions', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    task_id: {
      type: 'integer',
      notNull: true,
      references: 'tasks',
      onDelete: 'CASCADE',
    },
    started_at: { type: 'text', notNull: true },
    completed_at: { type: 'text' },
    duration_seconds: { type: 'integer', notNull: true, default: 0 },
    reflection: { type: 'text' },
    confusion: { type: 'text' },
    confidence: { type: 'integer' },
  });

  pgm.createTable('reviews', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    task_id: {
      type: 'integer',
      notNull: true,
      references: 'tasks',
      onDelete: 'CASCADE',
    },
    due_date: { type: 'text', notNull: true },
    priority: { type: 'text', notNull: true, default: 'medium' },
    status: { type: 'text', notNull: true, default: 'pending' },
  });

  pgm.createTable('resources', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    goal_id: {
      type: 'integer',
      notNull: true,
      references: 'goals',
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true },
    type: { type: 'text', notNull: true },
    reference: { type: 'text' },
    notes: { type: 'text' },
    source_kind: { type: 'text', notNull: true, default: 'user_supplied' },
    created_at: { type: 'text', notNull: true },
  });

  pgm.createTable('task_resources', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    task_id: {
      type: 'integer',
      notNull: true,
      references: 'tasks',
      onDelete: 'CASCADE',
    },
    resource_id: {
      type: 'integer',
      notNull: true,
      references: 'resources',
      onDelete: 'CASCADE',
    },
    relevance_note: { type: 'text' },
  });

  pgm.createTable('quick_actions', {
    id: 'id',
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    task_id: {
      type: 'integer',
      notNull: true,
      references: 'tasks',
      onDelete: 'CASCADE',
    },
    action: { type: 'text', notNull: true },
    content: { type: 'text', notNull: true },
    created_at: { type: 'text', notNull: true },
    updated_at: { type: 'text', notNull: true },
  });

  pgm.addConstraint('quick_actions', 'quick_actions_user_task_action_unique', {
    unique: ['user_id', 'task_id', 'action'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('quick_actions');
  pgm.dropTable('task_resources');
  pgm.dropTable('resources');
  pgm.dropTable('reviews');
  pgm.dropTable('study_sessions');
  pgm.dropTable('notes');
  pgm.dropTable('calendar_events');
  pgm.dropTable('tasks');
  pgm.dropTable('goals');
  pgm.dropTable('auth_sessions');
  pgm.dropTable('users');
}
