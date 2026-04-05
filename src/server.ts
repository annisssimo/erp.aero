import { createApp } from './app';
import { sequelize } from './config/database';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function bootstrap() {
  await sequelize.sync();

  const app = createApp();

  app.listen(PORT, () => {
    console.warn(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
