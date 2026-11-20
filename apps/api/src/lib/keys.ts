import { env } from '../config/env.js';

export const idEncryptionKey = () => Buffer.from(env().ID_ENCRYPTION_KEY, 'base64');
export const idHashKey = () => Buffer.from(env().ID_HASH_KEY, 'base64');
