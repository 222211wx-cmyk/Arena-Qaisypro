// Accepts a username or email identifier via the shared PostgreSQL adapter.
import { authHandler } from '../../server/auth.js';
export default authHandler('login');
