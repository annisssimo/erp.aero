import { createApp } from './app';
import { sequelize } from './config/database';
import { runMigrations } from './database/migrate';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function bootstrap() {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync({ force: true });
  } else {
    await runMigrations();
  }

  const app = createApp();

  app.listen(PORT, () => {
    console.warn(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
