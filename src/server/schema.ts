import {
  boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'), email: text('email').unique(), emailVerified: timestamp('email_verified', { mode: 'date' }), image: text('image')
});
export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(), provider: text('provider').notNull(), providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'), access_token: text('access_token'), expires_at: integer('expires_at'), token_type: text('token_type'), scope: text('scope'), id_token: text('id_token'), session_state: text('session_state')
}, table => [primaryKey({ columns: [table.provider, table.providerAccountId] })]);
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), expires: timestamp('expires', { mode: 'date' }).notNull()
});
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(), token: text('token').notNull(), expires: timestamp('expires', { mode: 'date' }).notNull()
}, table => [primaryKey({ columns: [table.identifier, table.token] })]);
export const authenticators = pgTable('authenticators', {
  credentialID: text('credential_id').notNull().unique(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), providerAccountId: text('provider_account_id').notNull(), credentialPublicKey: text('credential_public_key').notNull(), counter: integer('counter').notNull(), credentialDeviceType: text('credential_device_type').notNull(), credentialBackedUp: boolean('credential_backed_up').notNull(), transports: text('transports')
}, table => [primaryKey({ columns: [table.userId, table.credentialID] })]);

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  handle: text('handle').notNull(), handleNormalized: text('handle_normalized').notNull(), leaderboardEnabled: boolean('leaderboard_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('profiles_handle_normalized_unique').on(table.handleNormalized)]);

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }), settings: jsonb('settings').notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const typingResults = pgTable('typing_results', {
  id: uuid('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), mode: text('mode').notNull(), subMode: text('sub_mode').notNull(), title: text('title'),
  wpm: integer('wpm').notNull(), rawWpm: integer('raw_wpm').notNull(), accuracy: real('accuracy').notNull(), consistency: integer('consistency').notNull(), durationMs: integer('duration_ms').notNull(), totalChars: integer('total_chars').notNull(), correctChars: integer('correct_chars').notNull(), incorrectChars: integer('incorrect_chars').notNull(), errorKeys: jsonb('error_keys').notNull(), challengeId: uuid('challenge_id'), visibility: text('visibility').notNull().default('private'), occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [index('typing_results_user_time_idx').on(table.userId, table.occurredAt), index('typing_results_board_idx').on(table.mode, table.subMode, table.wpm)]);

export const bookProgress = pgTable('book_progress', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), bookId: text('book_id').notNull(), chapterId: text('chapter_id').notNull(), chapterIndex: integer('chapter_index').notNull(), charOffset: integer('char_offset').notNull(), completed: boolean('completed').notNull().default(false), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => [primaryKey({ columns: [table.userId, table.bookId, table.chapterId] }), index('book_progress_recent_idx').on(table.userId, table.updatedAt)]);

export const arcadeScores = pgTable('arcade_scores', {
  id: uuid('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), game: text('game').notNull(), configuration: jsonb('configuration').notNull(), score: integer('score').notNull(), wpm: integer('wpm').notNull(), accuracy: real('accuracy').notNull(), durationMs: integer('duration_ms').notNull(), challengeId: uuid('challenge_id'), visibility: text('visibility').notNull().default('private'), occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [index('arcade_scores_board_idx').on(table.game, table.score)]);

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), mode: text('mode').notNull(), configuration: jsonb('configuration').notNull(), seed: text('seed').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), consumedAt: timestamp('consumed_at', { withTimezone: true }), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
