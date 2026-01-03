export default () => ({
  database: {
    url: process.env.DATABASE_URL || 'postgresql://exp_track:exp_track_password@localhost:5432/exp_track',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minio_admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minio_password',
    bucket: process.env.MINIO_BUCKET || 'receipts',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  },
});
