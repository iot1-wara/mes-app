import { Injectable, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './user.entity';

@Injectable()
export class AuthService {
  private jwtService?: JwtService;
  
  constructor(
    private configService: ConfigService,
    @Inject(getRepositoryToken(UserEntity))
    private userRepository: Repository<UserEntity>,
  ) {}

  setJwtService(jwtService: JwtService) {
    this.jwtService = jwtService;
  }
  
  async validateUser(username: string, password: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password: _, ...result } = user as any;
      return result as UserEntity;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    if (!this.jwtService) throw new Error('JwtService not initialized');
    
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async register(dto: { username: string; password: string; role?: string }): Promise<UserEntity> {
    const hashedPassword = bcrypt.hashSync(dto.password || 'defaultPass123', 10);
    return this.createUser(dto.username, hashedPassword, dto.role || 'operator');
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async createUser(username: string, password: string, role: string): Promise<UserEntity> {
    const user = new UserEntity();
    (user as any).username = username;
    (user as any).password = password;
    (user as any).role = role as 'admin' | 'operator' | 'viewer';
    (user as any).isActive = true;
    
    const saved = await this.userRepository.save(user);
    return saved as UserEntity;
  }

  async bootstrap(): Promise<{ success: boolean; message: string }> {
    const toCreate = [
      { username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin' },
      { username: 'operator', password: bcrypt.hashSync('operator123', 10), role: 'operator' },
    ];
    
    let created = 0;
    for (const u of toCreate) {
      const existing = await this.findByUsername(u.username);
      if (!existing) {
        await this.createUser(u.username, u.password, u.role as 'admin' | 'operator' | 'viewer');
        console.log(`[Auth] Bootstrap: Created user ${u.username} (${u.role})`);
        created++;
      }
    }
    
    return { success: true, message: `${created} users created during bootstrap` };
  }
}
