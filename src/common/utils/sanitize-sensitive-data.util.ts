export function sanitizeSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'authorization',
    'auth',
  ];

  // Handle arrays separately
  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === 'object' && item !== null
        ? sanitizeSensitiveData(item)
        : item,
    );
  }

  const sanitized: Record<string, unknown> = {
    ...(data as Record<string, unknown>),
  };

  for (const key in sanitized) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
}
