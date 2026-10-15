import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  handleError,
} from '@/lib/errors';
import bcrypt from 'bcryptjs';

/**
 * Security & Input Validation Test Suite
 * 
 * Verifies rules.md (Sections 11, 12, 14, 16):
 * 1. Error sanitization never exposes stack traces or database errors.
 * 2. Proper HTTP status code mapping (400, 401, 403, 404, 500).
 * 3. Safe password hashing and comparison with bcryptjs.
 */

test('handleError safely normalizes ApplicationError and subclasses', () => {
  const valErr = new ValidationError('Invalid email format', { field: 'email' });
  const valResponse = handleError(valErr);
  assert.strictEqual(valResponse.statusCode, 400);
  assert.strictEqual(valResponse.code, 'VALIDATION_ERROR');
  assert.strictEqual(valResponse.error, 'Invalid email format');
  assert.deepStrictEqual(valResponse.details, { field: 'email' });

  const authErr = new AuthenticationError('Session expired');
  const authResponse = handleError(authErr);
  assert.strictEqual(authResponse.statusCode, 401);
  assert.strictEqual(authResponse.code, 'UNAUTHENTICATED');

  const forbidErr = new AuthorizationError('Superadmin required');
  const forbidResponse = handleError(forbidErr);
  assert.strictEqual(forbidResponse.statusCode, 403);
  assert.strictEqual(forbidResponse.code, 'FORBIDDEN');

  const notFoundErr = new NotFoundError('Item not found');
  const notFoundResponse = handleError(notFoundErr);
  assert.strictEqual(notFoundResponse.statusCode, 404);
  assert.strictEqual(notFoundResponse.code, 'NOT_FOUND');
});

test('handleError protects sensitive internal errors from leaking to client', () => {
  const internalDbError = new Error('FATAL: password authentication failed for user "postgres" at host 10.0.0.1');
  const sanitized = handleError(internalDbError);

  assert.strictEqual(sanitized.statusCode, 500);
  assert.strictEqual(sanitized.code, 'INTERNAL_ERROR');
  assert.strictEqual(sanitized.error, 'An unexpected internal error occurred.');
  assert.strictEqual('details' in sanitized, false);
});

test('bcryptjs correctly hashes and securely verifies passwords', async () => {
  const password = 'SuperSecretPassword!2026';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  assert.notStrictEqual(password, hash);
  const isMatch = await bcrypt.compare(password, hash);
  assert.strictEqual(isMatch, true);

  const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
  assert.strictEqual(isWrongMatch, false);
});
