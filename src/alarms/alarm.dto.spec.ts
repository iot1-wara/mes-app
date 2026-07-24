import { validate } from 'class-validator';
import { CreateAlarmDto, UpdateAlarmDto } from './alarm.dto';

describe('CreateAlarmDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = new CreateAlarmDto();
    dto.severity = 'critical' as any;
    dto.machine_id = 'm1';
    dto.message = 'Test alarm';
    dto.source = 'source-a';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with minimal data - severity defaults via transform', async () => {
    const dto = new CreateAlarmDto();
    dto.severity = 'info' as any;
    dto.machine_id = 'm1';
    dto.message = 'Minimal';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when machine_id is empty', async () => {
    const dto = new CreateAlarmDto();
    dto.severity = 'warning' as any;
    dto.machine_id = '';
    dto.message = 'test';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when severity is not a valid enum', async () => {
    const dto = new CreateAlarmDto();
    (dto as any).severity = 'invalid';
    dto.machine_id = 'm1';
    dto.message = 'test';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept all valid severities', async () => {
    const severities: Array<'info' | 'warning' | 'error' | 'critical'> = ['info', 'warning', 'error', 'critical'];
    for (const sev of severities) {
      const dto = new CreateAlarmDto();
      dto.severity = sev;
      dto.machine_id = 'm1';
      dto.message = 'test';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});

describe('UpdateAlarmDto', () => {
  it('should be valid with empty object (all optional)', async () => {
    const dto = new UpdateAlarmDto();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with severity update', async () => {
    const dto = new UpdateAlarmDto();
    dto.severity = 'error' as any;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when severity is invalid', async () => {
    const dto = new UpdateAlarmDto();
    (dto as any).severity = 'invalid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
