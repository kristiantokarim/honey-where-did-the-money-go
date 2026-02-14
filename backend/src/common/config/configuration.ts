export default () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production');
  }
  if (isProduction && (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY)) {
    throw new Error('MinIO credentials are required in production');
  }
  if (isProduction && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
    throw new Error('JWT secrets are required in production');
  }

  return {
    database: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://exp_track:exp_track_password@localhost:5432/exp_track',
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
    ai: {
      defaultProvider: process.env.AI_PROVIDER || 'gemini',
    },
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
    },
    app: {
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
  };
};
