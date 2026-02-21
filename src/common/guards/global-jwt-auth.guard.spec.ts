import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalJwtAuthGuard } from './global-jwt-auth.guard';

describe('GlobalJwtAuthGuard', () => {
  let guard: GlobalJwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new GlobalJwtAuthGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: jest.fn().mockReturnValue({}) }),
    } as unknown as ExecutionContext;

    it('should return true if the route is public', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
    });

    it('should delegate to parent when route is not public', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(guard), 'canActivate')
        .mockReturnValue(true);
      const result = guard.canActivate(mockContext);
      expect(superCanActivate).toHaveBeenCalledWith(mockContext);
      expect(result).toBe(true);
    });
  });
});
