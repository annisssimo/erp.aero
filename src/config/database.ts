import { Sequelize, Dialect } from 'sequelize';

function createSequelize(): Sequelize {
  if (process.env.NODE_ENV === 'test') {
    return new Sequelize({
      dialect: 'sqlite' as Dialect,
      storage: ':memory:',
      logging: false,
    });
  }

  return new Sequelize(
    process.env.DB_NAME as string,
    process.env.DB_USER as string,
    process.env.DB_PASSWORD ?? '',
    {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      dialect: 'mysql',
      logging: false,
    },
  );
}

export const sequelize = createSequelize();
