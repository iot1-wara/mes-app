import { ExecutionContext } from '@nestjs/common';
import { RolesGuard, SetRoles } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate - no roles metadata', () => {
    it('should return true when user has role but no SetRoles decorator', () => {
      class HandlerClass { canActivate() {} }
      const handlerInst = new HandlerClass();
      const mockRequest = { user: { role: 'admin' } };
      const ctx = createMockCtx(handlerInst, mockRequest);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return true when user is missing entirely and no roles metadata', () => {
      class HandlerClass { canActivate() {} }
      const handlerInst = new HandlerClass();
      const mockRequest = { user: undefined };
      const ctx = createMockCtx(handlerInst, mockRequest);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('canActivate - with SetRoles decorator', () => {
    it('should return true when user role is in allowed roles', () => {
      class AllowedHandler { canActivate() {} }
      SetRoles('admin')(AllowedHandler.prototype, 'canActivate', { value: AllowedHandler.prototype.canActivate });
      const handlerInst = new AllowedHandler();
      const mockRequest = { user: { role: 'admin' } };
      const ctx = { ...createMockCtx(handlerInst, mockRequest), getHandler: () => (AllowedHandler.prototype as any).canActivate };
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return false when user role is not in allowed roles', () => {
      class RestrictedHandler { canActivate() {} }
      SetRoles('admin')(RestrictedHandler.prototype, 'canActivate', { value: RestrictedHandler.prototype.canActivate });
      const handlerInst = new RestrictedHandler();
      const mockRequest = { user: { role: 'viewer' } };
      const ctx = { ...createMockCtx(handlerInst, mockRequest), getHandler: () => (RestrictedHandler.prototype as any).canActivate };
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('should return false when user object has no role property', () => {
      class RestrictedHandler2 { canActivate() {} }
      SetRoles('admin')(RestrictedHandler2.prototype, 'canActivate', { value: RestrictedHandler2.prototype.canActivate });
      const handlerInst = new RestrictedHandler2();
      const mockRequest = { user: {} };
      const ctx = { ...createMockCtx(handlerInst, mockRequest), getHandler: () => (RestrictedHandler2.prototype as any).canActivate };
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('should allow when any of multiple roles match', () => {
      class MultiRoleHandler { canActivate() {} }
      SetRoles('admin', 'operator', 'viewer')(MultiRoleHandler.prototype, 'canActivate', { value: MultiRoleHandler.prototype.canActivate });
      const handlerInst = new MultiRoleHandler();
      const mockRequest = { user: { role: 'operator' } };
      const ctx = { ...createMockCtx(handlerInst, mockRequest), getHandler: () => (MultiRoleHandler.prototype as any).canActivate };
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('SetRoles decorator', () => {
    it('should set roles metadata on the handler', () => {
      class TargetClass {
        canActivate() {}
      }
      SetRoles('admin', 'operator')(TargetClass.prototype, 'canActivate', { value: TargetClass.prototype.canActivate });
      const result = Reflect.getMetadata('ROLES_METADATA', (TargetClass.prototype as any).canActivate);
      expect(result).toEqual(['admin', 'operator']);
    });

    it('should set single role correctly', () => {
      class TargetClass {
        canActivate() {}
      }
      SetRoles('viewer')(TargetClass.prototype, 'canActivate', { value: TargetClass.prototype.canActivate });
      const result = Reflect.getMetadata('ROLES_METADATA', (TargetClass.prototype as any).canActivate);
      expect(result).toEqual(['viewer']);
    });
  });
});

function createMockCtx(handler: any, request?: any): ExecutionContext {
  return {
    getHandler: () => handler || {},
    getArgByIndex: jest.fn(),
    getType: () => 'http' as const,
    switchToHttp: () => ({ getRequest: () => request || {} }) as any,
    switchToWs: () => ({}),
    switchToRpc: () => ({}),
  } as unknown as ExecutionContext;
}
