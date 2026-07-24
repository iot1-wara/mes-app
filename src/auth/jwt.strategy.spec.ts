import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn().mockResolvedValue({ id: 'u1', username: 'admin', isActive: true, role: 'admin' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-jwt-secret') } },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object for active user', async () => {
      const result = await strategy.validate({ sub: 'u1', username: 'admin', role: 'admin' });
      expect(result.userId).toBe('u1');
      expect(result.username).toBe('admin');
      expect((authService.validateUser as jest.Mock).mock.calls[0][0]).toBe('admin');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      (authService.validateUser as jest.Mock).mockResolvedValueOnce({ id: 'u2', isActive: false });
      await expect(strategy.validate({ sub: 'u2', username: 'olduser' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when validateUser returns null', async () => {
      (authService.validateUser as jest.Mock).mockResolvedValueOnce(null);
      await expect(strategy.validate({ sub: 'u3', username: 'unknown' })).rejects.toThrow(UnauthorizedException);
    });
  });
});
