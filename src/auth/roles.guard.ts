import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import 'reflect-metadata';

const ROLES_KEY = 'ROLES_METADATA';

interface IRoleGuardOptions {
  roles: ('admin' | 'operator' | 'viewer')[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const roles = Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined;
    
    if (!roles || roles.length === 0) return true;
    
    const request = context.switchToHttp().getRequest();
    if (!request.user?.role) {
      return false;
    }
    
    return roles.includes(request.user.role);
  }
}

export function SetRoles(...roles: ('admin' | 'operator' | 'viewer')[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
  };
}
