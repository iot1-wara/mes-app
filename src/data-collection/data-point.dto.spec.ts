import { validate } from 'class-validator';
import { CreateDataPointDto } from './data-point.dto';
import type { DataQuality } from './data-point.entity';

describe('CreateDataPointDto', () => {
  const validMachineId = 'a0000000-0000-4000-a000-000000000001';
  const validNodeId = 'n0000000-0000-4000-b000-000000000001';

  it('should be valid with required fields', async () => {
    const dto = new CreateDataPointDto();
    dto.machine_id = validMachineId;
    dto.node_id = validNodeId;
    dto.value = 42.5;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional quality field', async () => {
    const qualityValues: DataQuality[] = ['good', 'bad', 'uncertain'];
    for (const q of qualityValues) {
      const dto = new CreateDataPointDto();
      dto.machine_id = validMachineId;
      dto.node_id = validNodeId;
      dto.value = 50;
      (dto as any).quality = q;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should accept optional timestamp', async () => {
    const dto = new CreateDataPointDto();
    dto.machine_id = validMachineId;
    dto.node_id = validNodeId;
    dto.value = 10;
    dto.timestamp = new Date();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when machine_id is not a UUID', async () => {
    const dto = new CreateDataPointDto();
    (dto as any).machine_id = 'invalid-uuid-string';
    dto.node_id = validNodeId;
    dto.value = 10;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when node_id is empty', async () => {
    const dto = new CreateDataPointDto();
    dto.machine_id = validMachineId;
    (dto as any).node_id = '';
    dto.value = 10;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail for invalid quality value', async () => {
    const dto = new CreateDataPointDto();
    dto.machine_id = validMachineId;
    dto.node_id = validNodeId;
    dto.value = 10;
    (dto as any).quality = 'invalid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
