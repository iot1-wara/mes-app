import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}
  
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersRepo.findOne({ where: { username } });
    console.log('[Auth] validateUser found:', JSON.stringify(user ? { id: user.id, username: user.username, hasPw: !!user.password } : null));
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(userOrDto: any) {
    let userId: string, username: string, role: string;
    
    if (userOrDto.username && userOrDto.role) {
      userId = (userOrDto as UserEntity).id || Math.random().toString(36).slice(2);
      username = userOrDto.username;
      role = userOrDto.role;
    } else if (userOrDto.username && userOrDto.password) {
      console.log('[Auth] login attempt with:', userOrDto.username);
      const validated = await this.validateUser(userOrDto.username, userOrDto.password);
      if (!validated) throw new Error('Invalid credentials');
      userId = (validated as any).id;
      username = userOrDto.username;
      role = validated.role || 'operator';
    } else {
      console.log('[Auth] login failed: no username/password', JSON.stringify(userOrDto));
      throw new Error('Invalid login data');
    }
    
    const payload = { username, sub: userId, role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: userId, username, role },
    };
  }

  async register(dto: { username: string; password: string; role?: string }): Promise<UserEntity> {
    const existing = await this.usersRepo.findOne({ where: { username: dto.username } });
    if (existing) throw new Error('Username already exists');
    
    const hashedPassword = bcrypt.hashSync(dto.password || 'defaultPass123', 10);
    const user = this.usersRepo.create({
      username: dto.username,
      password: hashedPassword,
      role: (dto.role || 'operator') as 'admin' | 'operator' | 'viewer',
      isActive: true,
    });
    return this.usersRepo.save(user);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { username } });
  }

  async bootstrap(): Promise<{ created: number }> {
    const toCreate = [
      { username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin' },
      { username: 'operator', password: bcrypt.hashSync('operator123', 10), role: 'operator' },
    ];
    
    let created = 0;
    for (const u of toCreate) {
      const existing = await this.usersRepo.findOne({ where: { username: u.username } });
      if (!existing) {
        const user = this.usersRepo.create({
          username: u.username,
          password: u.password,
          role: u.role as 'admin' | 'operator' | 'viewer',
          isActive: true,
        });
        await this.usersRepo.save(user);
        console.log(`[Auth] Bootstrap: Created user ${u.username} (${u.role})`);
        created++;
      }
    }
    
    return { created };
  }

  hasRole(userRole: string, requiredRole: string): boolean {
    const hierarchy: Record<string, number> = { viewer: 0, operator: 1, admin: 2 };
    return (hierarchy[userRole] ?? 0) >= (hierarchy[requiredRole] ?? 0);
  }

  async getActiveUsers(): Promise<any[]> {
    const users = await this.usersRepo.find();
    return users.map((user: any) => {
      const { password: _, ...rest } = user;
      return rest;
    });
  }
}
