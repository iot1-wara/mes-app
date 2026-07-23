import { IsOptional, IsEnum } from 'class-validator';

export enum Role {
  Admin = 'admin',
  Operator = 'operator',
  Viewer = 'viewer',
}

export class LoginDto {
  username: string;
  password: string;
}

export class RegisterDto {
  username: string;
  password: string;
  role?: Role;
}

export class JwtPayloadDto {
  sub: string;
  username: string;
  role: string;
}
