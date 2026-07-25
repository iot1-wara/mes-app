import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Public routes — no auth required
    if (request.url.startsWith('/api/auth/login') || 
        request.url.startsWith('/api/auth/register') || 
        request.url.startsWith('/api/auth/bootstrap')) return true;
    if (request.method === 'OPTIONS') return true;
    
    // Check for Bearer token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      request.user = { userId: payload.sub, username: payload.username, role: payload.role };
      return true;
    } catch (err) {
      console.error('[AuthGuard] Token verification failed:', err?.message || String(err));
      return false;
    }
  }
}
