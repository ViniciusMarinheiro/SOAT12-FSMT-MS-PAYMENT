import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './common/log/custom.logger';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  app.useLogger(app.get(CustomLogger));
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
}

// Only run bootstrap if not in test environment
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
