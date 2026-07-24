import { validate } from 'class-validator';
import { CreateMachineDto, UpdateMachineDto, MachineStatus } from './machine.dto';

describe('CreateMachineDto', () => {
  it('should be valid with required fields', async () => {
    const dto = new CreateMachineDto();
    dto.name = 'CNC-01';
    dto.status = 'online' as MachineStatus;
    dto.location = 'floor-a';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept all valid statuses', async () => {
    const statuses: MachineStatus[] = ['online', 'offline', 'maintenance', 'error', 'idle'];
    for (const status of statuses) {
      const dto = new CreateMachineDto();
      dto.name = `Machine-${status}`;
      dto.status = status;
      dto.location = 'floor-a';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should pass with optional fields', async () => {
    const dto = new CreateMachineDto();
    dto.name = 'CNC-01';
    dto.status = 'online' as MachineStatus;
    dto.location = 'floor-a';
    dto.type = 'hydraulic';
    dto.model = 'BR-3000';
    dto.serial_number = 'SN-20260001';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateMachineDto();
    dto.name = '';
    dto.status = 'offline' as MachineStatus;
    dto.location = 'floor-a';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when status is invalid', async () => {
    const dto = new CreateMachineDto();
    dto.name = 'CNC-01';
    (dto as any).status = 'unknown';
    dto.location = 'floor-a';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when location is empty', async () => {
    const dto = new CreateMachineDto();
    dto.name = 'CNC-01';
    dto.status = 'offline' as MachineStatus;
    dto.location = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateMachineDto', () => {
  it('should be valid with empty object (all optional)', async () => {
    const dto = new UpdateMachineDto();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when updating status only', async () => {
    const dto = new UpdateMachineDto();
    dto.status = 'maintenance' as MachineStatus;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields updated', async () => {
    const dto = new UpdateMachineDto();
    dto.name = 'Updated CNC';
    dto.status = 'idle' as MachineStatus;
    dto.type = 'new-type';
    dto.location = 'new-floor';
    dto.model = 'NewModel';
    dto.serial_number = 'SN-9999';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when status is invalid', async () => {
    const dto = new UpdateMachineDto();
    (dto as any).status = 'unknown-status';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
