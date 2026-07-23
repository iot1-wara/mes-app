import { CanActivate, ExecutionContext, Injectable, Inject } from '@nestjs/common';

const ROLES_KEY = 'ROLES';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = context.getHandler().prototype?.[ROLES_KEY] as string[];
    
    if (!roles || roles.length === 0) return true;
    
    const request = context.switchToHttp().getRequest();
    if (!request.user?.role) return false;
    
    return roles.includes(request.user.role);
  }
}
