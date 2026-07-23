import { 
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GuardWithTokenValidation implements CanActivate {
  private jwtService?: JwtService;
  
  setJwtService(jwtService: JwtService) {
    this.jwtService = jwtService;
  }
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Public routes — full skip
    const publicRoutes = ['/api/auth/login', '/api/auth/register'];
    if (publicRoutes.includes(request.url) || request.url.startsWith('/api/auth/bootstrap')) return true;
    if (request.method === 'OPTIONS') return true;
    
    // Auth header check
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // No token — allow but mark as unauthenticated
      console.debug('[Auth] No bearer token for:', request.url);
      return true;  
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const payload = this.jwtService!.verify(token, {
        secret: process.env.JWT_SECRET || 'mes-production-jwt-secret-key-2026',
      });
      request.user = { 
        userId: payload.sub, 
        username: payload.username, 
        role: payload.role 
      };
    } catch (err) {
      console.warn('[Auth] Invalid token for:', request.url, '-', err.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    return true;
  }
}
