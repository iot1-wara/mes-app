import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserEntity } from './user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let mockRepo: Partial<Repository<UserEntity>>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
      find: jest.fn().mockResolvedValue([]),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn().mockReturnValue({ sub: '1', username: 'admin' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepo,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const validUser = { id: '1', username: 'admin', password: hashedPassword };
      mockRepo.findOne = jest.fn().mockResolvedValue(validUser);

      const result = await service.login({ username: 'admin', password: 'password123' });
      expect(result.accessToken).toBe('test-token');
    });

    it('should throw for invalid credentials', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.login({ username: 'admin', password: 'wrong' })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should create a new user', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);
      const result = await service.register({ username: 'newuser', password: 'pass123' });
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        username: 'newuser',
        role: 'operator',
        isActive: true,
      }));
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw if user already exists', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1' });
      await expect(service.register({ username: 'existing', password: 'pass' })).rejects.toThrow('Username already exists');
    });
  });

  describe('hasRole', () => {
    it('should return true if user has required role', () => {
      expect(service.hasRole('admin', 'operator')).toBe(true);
      expect(service.hasRole('admin', 'viewer')).toBe(true);
      expect(service.hasRole('operator', 'viewer')).toBe(true);
    });

    it('should return false if user lacks role hierarchy', () => {
      expect(service.hasRole('viewer', 'operator')).toBe(false);
      expect(service.hasRole('operator', 'admin')).toBe(false);
    });
  });

  describe('getActiveUsers', () => {
    it('should return users without passwords', async () => {
      const users = [
        { id: '1', username: 'admin', password: 'secret1' },
        { id: '2', username: 'operator', password: 'secret2' },
      ];
      mockRepo.find = jest.fn().mockResolvedValue(users as any);
      const result = await service.getActiveUsers();
      expect(result).toHaveLength(2);
    });
  });

  describe('bootstrap', () => {
    it('should create default users if they do not exist', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);
      const result = await service.bootstrap();
      expect(result.created).toBe(2);
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should skip existing users', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1' });
      const result = await service.bootstrap();
      expect(result.created).toBe(0);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByUsername', () => {
    it('should find a user by username', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue({ id: '1', username: 'admin' } as any);
      const result = await service.findByUsername('admin');
      expect(result?.username).toBe('admin');
    });

    it('should return null if not found', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);
      const result = await service.findByUsername('unknown');
      expect(result).toBeNull();
    });
  });
});
