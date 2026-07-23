import { IsNotEmpty, IsEnum } from 'class-validator';

export enum Role {
  Admin = 'admin',
  Operator = 'operator',
  Viewer = 'viewer',
}

export class LoginDto {
  @IsNotEmpty() username: string;
  @IsNotEmpty() password: string;
}

export class RegisterDto {
  @IsNotEmpty() username: string;
  @IsNotEmpty() password: string;
  role?: Role;
}

export class JwtPayloadDto {
  sub: string;
  username: string;
  role: string;
}
