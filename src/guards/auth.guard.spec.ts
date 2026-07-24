import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { GuardWithTokenValidation } from '../guards/auth.guard';

describe('GuardWithTokenValidation', () => {
  let guard: GuardWithTokenValidation;
  let jwtService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuardWithTokenValidation],
    }).compile();

    guard = module.get(GuardWithTokenValidation);
    jwtService = { verify: jest.fn() } as any;
    (guard as any).jwtService = jwtService;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate - public routes', () => {
    it('should allow /api/auth/login without token', async () => {
      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ url: '/api/auth/login' }) }),
        getArgByIndex: () => {},
        getType: () => 'http',
      };
      const result = await guard.canActivate(ctx as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow /api/auth/register without token', async () => {
      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ url: '/api/auth/register' }) }),
      };
      const result = await guard.canActivate(ctx as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow /api/auth/bootstrap routes', async () => {
      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ url: '/api/auth/bootstrap/abc' }) }),
      };
      const result = await guard.canActivate(ctx as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow OPTIONS requests', async () => {
      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ method: 'OPTIONS', url: '/api/machines' }) }),
      };
      const result = await guard.canActivate(ctx as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow requests without bearer token but mark as unauthenticated', async () => {
      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ url: '/api/machines', headers: {} }) }),
      };
      const result = await guard.canActivate(ctx as ExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow requests with no auth header at all', async () => {
      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ url: '/api/machines', headers: {} }) }),
      };
      const result = await guard.canActivate(ctx as ExecutionContext);
      expect(result).toBe(true);
    });
  });

  describe('canActivate - with bearer token', () => {
    it('should verify valid token and set request.user', async () => {
      const mockReq = { url: '/api/machines', headers: { authorization: 'Bearer valid-token' } };
      jwtService.verify = jest.fn().mockReturnValue({ sub: 'u1', username: 'admin', role: 'admin' });

      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
      };
      const result = await guard.canActivate(ctx as ExecutionContext);
      expect(result).toBe(true);
      expect(mockReq.user.userId).toBe('u1');
      expect(mockReq.user.username).toBe('admin');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify = jest.fn().mockImplementation(() => { throw new Error('expired'); });

      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ url: '/api/machines', headers: { authorization: 'Bearer bad-token' } }) }),
      };
      await expect(guard.canActivate(ctx as ExecutionContext)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException for malformed token', async () => {
      jwtService.verify = jest.fn().mockImplementation(() => { throw new Error('malformed'); });

      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => ({ url: '/api/orders', headers: { authorization: 'Bearer not-a-bearer' } }) }),
      };
      await expect(guard.canActivate(ctx as ExecutionContext)).rejects.toThrow('Invalid or expired token');
    });

    it('should extract token correctly from Bearer header', async () => {
      const mockReq = { url: '/api/orders', headers: { authorization: 'Bearer extract-test-token' } };
      jwtService.verify = jest.fn().mockReturnValue({ sub: 'u2', username: 'operator', role: 'operator' });

      const ctx: Partial<ExecutionContext> = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
      };
      await guard.canActivate(ctx as ExecutionContext);
      expect(jwtService.verify).toHaveBeenCalledWith('extract-test-token', {
        secret: process.env.JWT_SECRET || 'mes-production-jwt-secret-key-2026',
      });
    });
  });

  describe('setJwtService', () => {
    it('should set the jwtService reference', () => {
      const mockSvc = { verify: jest.fn() } as any;
      guard.setJwtService(mockSvc);
      expect((guard as any).jwtService).toBe(mockSvc);
    });
  });
});
