import { S3Client } from '@aws-sdk/client-s3';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

// Lazy initialization keeps credentials server-only and avoids build-time connections.
export function database() {
  return drizzle(neon(required('DATABASE_URL')));
}

export function storage() {
  return {
    bucket: required('R2_BUCKET'),
    client: new S3Client({
      region: 'auto',
      endpoint: required('R2_ENDPOINT'),
      credentials: {
        accessKeyId: required('R2_ACCESS_KEY_ID'),
        secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    }),
  };
}
