import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lab_asset_management',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  expiresIn: process.env.JWT_EXPIRE || '7d'
};

export const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET
};
