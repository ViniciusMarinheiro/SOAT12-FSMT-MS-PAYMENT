import { sanitizeSensitiveData } from './sanitize-sensitive-data.util';

describe('sanitizeSensitiveData', () => {
  describe('primitive values', () => {
    it('should return string unchanged if not a sensitive key', () => {
      const result = sanitizeSensitiveData('some string');
      expect(result).toBe('some string');
    });

    it('should return number unchanged', () => {
      const result = sanitizeSensitiveData(123);
      expect(result).toBe(123);
    });

    it('should return boolean unchanged', () => {
      expect(sanitizeSensitiveData(true)).toBe(true);
      expect(sanitizeSensitiveData(false)).toBe(false);
    });

    it('should return null unchanged', () => {
      const result = sanitizeSensitiveData(null);
      expect(result).toBeNull();
    });

    it('should return undefined unchanged', () => {
      const result = sanitizeSensitiveData(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('sensitive keys', () => {
    it('should sanitize password field', () => {
      const data = { password: 'secret123' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      expect(result.password).toBe('***');
    });

    it('should sanitize token field', () => {
      const data = { token: 'abc123def456' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      expect(result.token).toBe('***');
    });

    it('should sanitize secret field', () => {
      const data = { secret: 'my-secret-key' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      expect(result.secret).toBe('***');
    });

    it('should sanitize authorization field', () => {
      const data = { authorization: 'Bearer token123' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      expect(result.authorization).toBe('***');
    });

    it('should sanitize auth field', () => {
      const data = { auth: 'credentials' };
      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      expect(result.auth).toBe('***');
    });

    it('should be case-insensitive for sensitive keys', () => {
      const data = {
        PASSWORD: 'secret1',
        Token: 'secret2',
        SECRET: 'secret3',
        Authorization: 'secret4',
        AUTH: 'secret5',
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.PASSWORD).toBe('***');
      expect(result.Token).toBe('***');
      expect(result.SECRET).toBe('***');
      expect(result.Authorization).toBe('***');
      expect(result.AUTH).toBe('***');
    });

    it('should sanitize fields that include sensitive keywords', () => {
      const data = {
        my_password: 'secret',
        access_token: 'token123',
        user_secret: 'secret_value',
        auth_header: 'Bearer xyz',
        custom_auth: 'auth123',
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.my_password).toBe('***');
      expect(result.access_token).toBe('***');
      expect(result.user_secret).toBe('***');
      expect(result.auth_header).toBe('***');
      expect(result.custom_auth).toBe('***');
    });
  });

  describe('non-sensitive fields', () => {
    it('should not sanitize regular fields', () => {
      const data = {
        username: 'john_doe',
        email: 'john@example.com',
        name: 'John Doe',
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.username).toBe('john_doe');
      expect(result.email).toBe('john@example.com');
      expect(result.name).toBe('John Doe');
    });
  });

  describe('nested objects', () => {
    it('should sanitize nested sensitive fields', () => {
      const data = {
        user: {
          username: 'john',
          password: 'secret123',
        },
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      const user = result.user as Record<string, unknown>;

      expect(user.username).toBe('john');
      expect(user.password).toBe('***');
    });

    it('should sanitize deeply nested sensitive fields', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              token: 'secret_token',
              data: 'public_data',
            },
          },
        },
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      const level1 = result.level1 as Record<string, unknown>;
      const level2 = level1.level2 as Record<string, unknown>;
      const level3 = level2.level3 as Record<string, unknown>;

      expect(level3.token).toBe('***');
      expect(level3.data).toBe('public_data');
    });

    it('should handle mixed sensitive and non-sensitive fields', () => {
      const data = {
        id: 1,
        username: 'user123',
        password: 'secure_pass',
        email: 'user@example.com',
        token: 'abc123',
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.id).toBe(1);
      expect(result.username).toBe('user123');
      expect(result.password).toBe('***');
      expect(result.email).toBe('user@example.com');
      expect(result.token).toBe('***');
    });
  });

  describe('arrays and complex structures', () => {
    it('should sanitize arrays of objects', () => {
      const data = {
        users: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' },
        ],
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;
      const users = result.users as Array<Record<string, unknown>>;

      expect(users[0].password).toBe('***');
      expect(users[1].password).toBe('***');
      expect(users[0].username).toBe('user1');
      expect(users[1].username).toBe('user2');
    });

    it('should handle arrays with primitives', () => {
      const data = {
        items: [1, 2, 3],
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toEqual([1, 2, 3]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty object', () => {
      const result = sanitizeSensitiveData({}) as Record<string, unknown>;
      expect(result).toEqual({});
    });

    it('should handle object with only sensitive fields', () => {
      const data = {
        password: 'p1',
        token: 't1',
        secret: 's1',
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.password).toBe('***');
      expect(result.token).toBe('***');
      expect(result.secret).toBe('***');
    });

    it('should not mutate original object', () => {
      const original = {
        username: 'john',
        password: 'secret',
      };

      const copy = JSON.parse(JSON.stringify(original));

      sanitizeSensitiveData(original);

      expect(original).toEqual(copy);
    });

    it('should handle object with null values', () => {
      const data = {
        password: null,
        username: 'john',
        token: null,
      };

      const result = sanitizeSensitiveData(data) as Record<string, unknown>;

      expect(result.password).toBe('***');
      expect(result.token).toBe('***');
      expect(result.username).toBe('john');
    });
  });

  describe('real-world scenarios', () => {
    it('should sanitize API request with credentials', () => {
      const request = {
        method: 'POST',
        url: '/api/login',
        headers: {
          authorization: 'Bearer token_12345',
          'content-type': 'application/json',
        },
        body: {
          email: 'user@example.com',
          password: 'user_password_123',
        },
      };

      const result = sanitizeSensitiveData(request) as Record<string, unknown>;
      const headers = result.headers as Record<string, unknown>;
      const body = result.body as Record<string, unknown>;

      expect(headers.authorization).toBe('***');
      expect(body.password).toBe('***');
      expect(body.email).toBe('user@example.com');
      expect(result.url).toBe('/api/login');
    });

    it('should sanitize error response with credentials', () => {
      const error = {
        status: 500,
        message: 'Database error',
        context: {
          connectionSecret: 'postgresql://user:password@localhost:5432/db',
          apiToken: 'secret_token_xyz',
          userId: 123,
        },
      };

      const result = sanitizeSensitiveData(error) as Record<string, unknown>;
      const context = result.context as Record<string, unknown>;

      expect(context.connectionSecret).toBe('***');
      expect(context.apiToken).toBe('***');
      expect(context.userId).toBe(123);
      expect(result.status).toBe(500);
    });
  });
});
