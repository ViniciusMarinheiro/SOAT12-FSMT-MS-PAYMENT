export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  isTest: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  mercadoPago: {
    accessToken: string;
    publicKey: string;
  };
}

function loadAppConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const isTest = nodeEnv === 'test';
  const isDevelopment = nodeEnv !== 'production' && !isTest;
  const isProduction = nodeEnv === 'production';

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv,
    isTest,
    isDevelopment,
    isProduction,
    mercadoPago: {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
      publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
    },
  };
}

let cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadAppConfig();
  }
  return cachedConfig;
}

export function resetAppConfig(): void {
  cachedConfig = null;
}

export const appConfig = getAppConfig();
