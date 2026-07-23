import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService, configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'mes-production-jwt-secret-key-2026',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.username, '');
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid token');
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}
