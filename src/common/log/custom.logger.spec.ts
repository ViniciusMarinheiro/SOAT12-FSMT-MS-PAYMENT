import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule as PinoLoggerModule, PinoLogger } from 'nestjs-pino';
import { CustomLogger } from './custom.logger';

// Mock implementation for testing
class MockPinoLogger {
  trace = jest.fn();
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

describe('CustomLogger', () => {
  let logger: CustomLogger;
  let pino: MockPinoLogger;

  beforeEach(async () => {
    // Reset static context rules
    (CustomLogger as any).contextRules = {};

    // Create mock pino logger
    pino = new MockPinoLogger();

    // Create logger instance with mock
    logger = new CustomLogger(pino as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log method', () => {
    it('should log with string context', () => {
      logger.log('Test message', 'TestContext');

      expect(pino.info).toHaveBeenCalledWith(
        { context: 'TestContext' },
        'Test message',
      );
    });

    it('should log with object context and sanitize', () => {
      const context = {
        useCase: 'CreatePayment',
        userId: 123,
        token: 'secret_token',
      };

      logger.log('User action', context);

      const call = (pino.info as jest.Mock).mock.calls[0];
      expect(call[1]).toBe('User action');
      expect(call[0].token).toBe('***');
      expect(call[0].userId).toBe(123);
    });

    it('should log without context', () => {
      logger.log('Simple message');

      expect(pino.info).toHaveBeenCalledWith(
        { context: undefined },
        'Simple message',
      );
    });

    it('should respect LOG_RULES environment variable', () => {
      process.env.LOG_RULES =
        'context=HighLevelContext;level=error/context=LowLevelContext;level=debug';

      // Reset to pick up new env var
      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);

      newLogger.log('Test', 'HighLevelContext');
      expect(pino.info).not.toHaveBeenCalled();

      newLogger.log('Test', 'LowLevelContext');
      expect(pino.info).toHaveBeenCalled();

      delete process.env.LOG_RULES;
    });
  });

  describe('debug method', () => {
    it('should not log debug by default (lower than default level)', () => {
      logger.debug('Debug message', 'DebugContext');

      expect(pino.debug).not.toHaveBeenCalled();
    });

    it('should log debug when configured', () => {
      process.env.LOG_RULES = 'context=*;level=debug';
      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);
      newLogger.debug('Debug message', 'DebugContext');

      expect(pino.debug).toHaveBeenCalledWith(
        { context: 'DebugContext' },
        'Debug message',
      );

      delete process.env.LOG_RULES;
    });

    it('should sanitize object in debug', () => {
      process.env.LOG_RULES = 'context=*;level=debug';
      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);
      const context = {
        useCase: 'TestUseCase',
        password: 'secret123',
      };

      newLogger.debug('Debug info', context);

      const call = (pino.debug as jest.Mock).mock.calls[0];
      expect(call[0].password).toBe('***');
      expect(call[0].useCase).toBe('TestUseCase');

      delete process.env.LOG_RULES;
    });
  });

  describe('warn method', () => {
    it('should log warn message', () => {
      logger.warn('Warning message', 'WarnContext');

      expect(pino.warn).toHaveBeenCalledWith(
        { context: 'WarnContext' },
        'Warning message',
      );
    });

    it('should sanitize nested objects in warn', () => {
      const context = {
        useCase: 'TestWarning',
        credentials: {
          token: 'secret_token',
          secretKey: 'secret_value',
        },
      };

      logger.warn('Sensitive warn', context);

      const call = (pino.warn as jest.Mock).mock.calls[0];
      expect(call[0].credentials.token).toBe('***');
      expect(call[0].credentials.secretKey).toBe('***');
    });
  });

  describe('error method', () => {
    it('should log error with trace', () => {
      logger.error('Error message', 'Stack trace here', 'ErrorContext');

      const call = (pino.error as jest.Mock).mock.calls[0];
      expect(call[0].trace).toBe('Stack trace here');
      expect(call[0].context).toBe('ErrorContext');
      expect(call[1]).toBe('Error message');
    });

    it('should sanitize error context', () => {
      const errorContext = {
        useCase: 'CreatePayment',
        authorization: 'Bearer token123',
        error: 'Payment failed',
      };

      logger.error('Payment error', undefined, errorContext);

      const call = (pino.error as jest.Mock).mock.calls[0];
      expect(call[0].authorization).toBe('***');
      expect(call[0].error).toBe('Payment failed');
    });

    it('should log error without context', () => {
      logger.error('Simple error');

      const call = (pino.error as jest.Mock).mock.calls[0];
      expect(call[0].context).toBeUndefined();
      expect(call[0].trace).toBeUndefined();
      expect(call[1]).toBe('Simple error');
    });
  });

  describe('verbose method', () => {
    it('should not log verbose by default (lower than default level)', () => {
      logger.verbose('Verbose message', 'VerboseContext');

      expect(pino.trace).not.toHaveBeenCalled();
    });

    it('should log verbose when configured', () => {
      process.env.LOG_RULES = 'context=*;level=trace';
      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);
      newLogger.verbose('Verbose message', 'VerboseContext');

      expect(pino.trace).toHaveBeenCalledWith(
        { context: 'VerboseContext' },
        'Verbose message',
      );

      delete process.env.LOG_RULES;
    });

    it('should sanitize in verbose', () => {
      process.env.LOG_RULES = 'context=*;level=trace';
      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);
      const context = {
        useCase: 'VerboseTest',
        secret: 'secret_value',
      };

      newLogger.verbose('Verbose info', context);

      const call = (pino.trace as jest.Mock).mock.calls[0];
      expect(call[0].secret).toBe('***');

      delete process.env.LOG_RULES;
    });
  });

  describe('sanitizeSensitiveData', () => {
    it('should sanitize password fields', () => {
      const context = {
        useCase: 'TestCase',
        password: 'user_password',
      };

      logger.log('Message', context);

      const call = (pino.info as jest.Mock).mock.calls[0];
      expect(call[0].password).toBe('***');
    });

    it('should sanitize token fields', () => {
      const context = {
        token: 'access_token_123',
        userId: 456,
      };

      logger.log('Message', context);

      const call = (pino.info as jest.Mock).mock.calls[0];
      expect(call[0].token).toBe('***');
      expect(call[0].userId).toBe(456);
    });

    it('should sanitize authorization headers', () => {
      const context = {
        authorization: 'Bearer xyz123',
        method: 'POST',
      };

      logger.log('Message', context);

      const call = (pino.info as jest.Mock).mock.calls[0];
      expect(call[0].authorization).toBe('***');
    });

    it('should sanitize nested sensitive data', () => {
      const context = {
        request: {
          headers: {
            authorization: 'Bearer token',
          },
          body: {
            password: 'secret',
          },
        },
      };

      logger.log('Message', context);

      const call = (pino.info as jest.Mock).mock.calls[0];
      expect(call[0].request.headers.authorization).toBe('***');
      expect(call[0].request.body.password).toBe('***');
    });

    it('should be case-insensitive for keys', () => {
      const context = {
        PASSWORD: 'pass1',
        Token: 'token1',
        AUTHORIZATION: 'auth1',
      };

      logger.log('Message', context);

      const call = (pino.info as jest.Mock).mock.calls[0];
      expect(call[0].PASSWORD).toBe('***');
      expect(call[0].Token).toBe('***');
      expect(call[0].AUTHORIZATION).toBe('***');
    });
  });

  describe('context rules', () => {
    it('should initialize default context rule', () => {
      (CustomLogger as any).contextRules = {};
      delete process.env.LOG_RULES;

      const newLogger = new CustomLogger(pino as any);
      newLogger.log('Test', 'AnyContext');

      expect(pino.info).toHaveBeenCalled();
    });

    it('should parse LOG_RULES with context and level', () => {
      process.env.LOG_RULES =
        'context=PaymentService;level=error/context=AuthService;level=debug';

      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);

      // PaymentService should only log errors
      newLogger.debug('Debug', 'PaymentService');
      expect(pino.debug).not.toHaveBeenCalled();

      newLogger.error('Error', 'PaymentService');
      expect(pino.error).toHaveBeenCalled();

      // AuthService should log debug and up
      pino.error.mockClear();
      pino.debug.mockClear();

      newLogger.debug('Debug', 'AuthService');
      expect(pino.debug).toHaveBeenCalled();

      delete process.env.LOG_RULES;
    });

    it('should handle multiple contexts in single rule', () => {
      process.env.LOG_RULES = 'context=Service1,Service2;level=warn';

      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);

      // Service1 should log warn and up
      newLogger.debug('Debug', 'Service1');
      expect(pino.debug).not.toHaveBeenCalled();

      newLogger.warn('Warn', 'Service1');
      expect(pino.warn).toHaveBeenCalled();

      delete process.env.LOG_RULES;
    });

    it('should use default level when context not found', () => {
      process.env.LOG_RULES = 'context=SpecificService;level=error';

      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);

      // Unknown context should use default level (info)
      newLogger.log('Info', 'UnknownService');
      expect(pino.info).toHaveBeenCalled();

      delete process.env.LOG_RULES;
    });
  });

  describe('should not log based on levels', () => {
    it('should not log trace when level is info', () => {
      process.env.LOG_RULES = 'context=TestContext;level=info';

      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);

      newLogger.verbose('Trace', 'TestContext');
      newLogger.debug('Debug', 'TestContext');

      expect(pino.trace).not.toHaveBeenCalled();
      expect(pino.debug).not.toHaveBeenCalled();

      newLogger.log('Info', 'TestContext');
      expect(pino.info).toHaveBeenCalled();

      delete process.env.LOG_RULES;
    });

    it('should respect log level hierarchy', () => {
      process.env.LOG_RULES = 'context=Service;level=warn';

      (CustomLogger as any).contextRules = {};

      const newLogger = new CustomLogger(pino as any);

      newLogger.verbose('V', 'Service');
      newLogger.debug('D', 'Service');
      newLogger.log('I', 'Service');

      expect(pino.trace).not.toHaveBeenCalled();
      expect(pino.debug).not.toHaveBeenCalled();
      expect(pino.info).not.toHaveBeenCalled();

      newLogger.warn('W', 'Service');
      expect(pino.warn).toHaveBeenCalled();

      delete process.env.LOG_RULES;
    });
  });

  describe('edge cases', () => {
    it('should handle array context (passed as-is)', () => {
      const context = ['item1', 'item2'];

      logger.log('Message', context as any);

      expect(pino.info).toHaveBeenCalledWith(
        { context },
        'Message',
      );
    });

    it('should handle null context', () => {
      logger.log('Message', null);

      expect(pino.info).toHaveBeenCalledWith(
        { context: null },
        'Message',
      );
    });

    it('should handle undefined context', () => {
      logger.log('Message', undefined);

      expect(pino.info).toHaveBeenCalledWith(
        { context: undefined },
        'Message',
      );
    });

    it('should handle empty object context', () => {
      logger.log('Message', {});

      const call = (pino.info as jest.Mock).mock.calls[0];
      expect(call[1]).toBe('Message');
    });

    it('should handle context useCase field for filtering', () => {
      const context = {
        useCase: 'PaymentUseCase',
        data: 'public_data',
      };

      logger.log('Message', context);

      expect(pino.info).toHaveBeenCalled();
    });
  });
});
