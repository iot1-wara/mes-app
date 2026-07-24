import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: Partial<any>;

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({ accessToken: 'test-jwt-token' }),
      register: jest.fn().mockResolvedValue({ id: 'new-user-id', username: 'newuser' }),
      bootstrap: jest.fn().mockResolvedValue({ created: 2, message: 'Bootstrapped' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  describe('POST /auth/login', () => {
    it('should login and return token', async () => { const r = await request(app.getHttpServer()).post('/auth/login').send({ username: 'admin', password: 'admin123' }).expect(200); expect(r.body.accessToken).toBe('test-jwt-token'); });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => { const r = await request(app.getHttpServer()).post('/auth/register').send({ username: 'newuser', password: 'pass123' }).expect(201); expect(r.body.username).toBe('newuser'); });
  });

  describe('POST /auth/bootstrap', () => {
    it('should bootstrap default users', async () => { const r = await request(app.getHttpServer()).post('/auth/bootstrap').expect(201); expect(r.body.created).toBe(2); });
  });
});
