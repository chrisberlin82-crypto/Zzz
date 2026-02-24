require('dotenv').config();

module.exports = {
  development: {
    username: process.env.POSTGRES_USER || 'vente_user',
    password: process.env.POSTGRES_PASSWORD || 'vente_secure_password_2024',
    database: process.env.POSTGRES_DB || 'vente_crm',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.POSTGRES_USER || 'vente_user',
    password: process.env.POSTGRES_PASSWORD || 'vente_secure_password_2024',
    database: process.env.POSTGRES_DB || 'vente_crm_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};
