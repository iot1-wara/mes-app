import { validate } from 'class-validator';
import { LoginDto, RegisterDto, Role } from './auth.dto';

describe('LoginDto', () => {
  it('should be valid with username and password', async () => {
    const dto = new LoginDto();
    dto.username = 'admin';
    dto.password = 'pass123';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when username is empty', async () => {
    const dto = new LoginDto();
    dto.username = '';
    dto.password = 'pass123';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when password is empty', async () => {
    const dto = new LoginDto();
    dto.username = 'admin';
    dto.password = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('RegisterDto', () => {
  it('should be valid with username and password', async () => {
    const dto = new RegisterDto();
    dto.username = 'newuser';
    dto.password = 'pass123';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept role enum values', async () => {
    for (const role of [Role.Admin, Role.Operator, Role.Viewer]) {
      const dto = new RegisterDto();
      dto.username = 'user1';
      dto.password = 'pass123';
      dto.role = role;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should be valid without role (optional)', async () => {
    const dto = new RegisterDto();
    dto.username = 'user1';
    dto.password = 'pass123';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('Role enum', () => {
  it('should have all expected roles', () => {
    expect(Role.Admin).toBe('admin');
    expect(Role.Operator).toBe('operator');
    expect(Role.Viewer).toBe('viewer');
  });
});
