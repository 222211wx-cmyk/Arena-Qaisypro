import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createHash } from 'node:crypto';

export function recoveryPublicConfig() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB) return null;
  let config;
  try { config = JSON.parse(process.env.FIREBASE_WEB_CONFIG || '{}'); } catch { return null; }
  if (!config.projectId || !config.apiKey || !config.authDomain || config.projectId.startsWith('demo-')) return null;
  return Object.fromEntries(['projectId','apiKey','authDomain','appId'].filter(key=>typeof config[key]==='string').map(key=>[key,config[key]]));
}
export async function verifyPhoneProof(token) {
  const config = recoveryPublicConfig();
  if (!config) throw new Error('Recovery provider unavailable');
  if (typeof token !== 'string' || token.length > 10000) throw new Error('Invalid proof');
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0] || '', 'base64url').toString());
  if (parts.length !== 3 || !parts[2] || header.alg !== 'RS256' || !header.kid) throw new Error('Invalid proof');
  const name = `gdna-phone-recovery-${config.projectId}`;
  const app = getApps().find(app=>app.name===name) || initializeApp({projectId:config.projectId},name);
  const decoded = await getAuth(app).verifyIdToken(token);
  const now = Math.floor(Date.now()/1000);
  if (decoded.aud !== config.projectId || decoded.iss !== `https://securetoken.google.com/${config.projectId}` || decoded.firebase?.sign_in_provider !== 'phone' || decoded.firebase?.tenant || !decoded.sub || decoded.uid !== decoded.sub || !/^\+[1-9][0-9]{1,14}$/.test(decoded.phone_number || '') || !Number.isSafeInteger(decoded.auth_time) || !Number.isSafeInteger(decoded.iat) || decoded.auth_time > decoded.iat || decoded.iat > now+30 || decoded.auth_time > now+30 || now-decoded.auth_time > 300) throw new Error('Invalid proof');
  return {phone:decoded.phone_number,projectId:config.projectId,authTime:decoded.auth_time,eventDigest:createHash('sha256').update(JSON.stringify([config.projectId,decoded.sub,decoded.auth_time])).digest('hex')};
}
