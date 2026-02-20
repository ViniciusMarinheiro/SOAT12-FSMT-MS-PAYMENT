import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z.string().default('3000'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DOCUMENTATION_PREFIX: z.string().default('api'),
    JWT_SECRET: z.string().optional().default('default-secret-key'),
    JWT_EXPIRES_IN: z.string().optional().default('7d'),
    MERCADOPAGO_ACCESS_TOKEN: z.string().optional().default(''),
    MERCADOPAGO_PUBLIC_KEY: z.string().optional().default(''),
    RABBITMQ_URL: z.string().optional(),
    RABBITMQ_CONSUMER_MAX_RETRIES: z.string().optional().default('3'),
    RABBITMQ_CONSUMER_RETRY_DELAY_MS: z.string().optional().default('1000'),
  })
  .transform((env) => ({
    ...env,
    SERVER_URL_PREFIX: env.DOCUMENTATION_PREFIX.replace(/^\//, ''),
  }));

export type Env = z.infer<typeof envSchema>;
