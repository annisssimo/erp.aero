import path from 'path';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../config/database';

export const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'migrations/*.js'),
    // Pass queryInterface and Sequelize to each migration
    resolve: ({ name, path: migPath, context }) => {
      // Dynamic require is necessary here — Umzug resolves migration files at runtime
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const migration = require(migPath as string) as {
        up: (qi: typeof context.queryInterface, s: typeof context.Sequelize) => Promise<void>;
        down: (qi: typeof context.queryInterface, s: typeof context.Sequelize) => Promise<void>;
      };
      return {
        name,
        up: async () => migration.up(context.queryInterface, context.Sequelize),
        down: async () => migration.down(context.queryInterface, context.Sequelize),
      };
    },
  },
  context: {
    queryInterface: sequelize.getQueryInterface(),
    Sequelize: sequelize.constructor,
  },
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

export async function runMigrations(): Promise<void> {
  await umzug.up();
}
