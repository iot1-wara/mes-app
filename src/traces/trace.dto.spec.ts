import { validate } from 'class-validator';
import { CreateTraceDto, type TraceCategoryType } from './trace.dto';

// Helper: generate a valid UUID-4 safe for @IsUUID validation (version nibble = 4)
function vuid(suf: string) {
  return 'a1b2c3d4-e5f6-4abc-9012-' + suf.padEnd(12, '0').slice(0, 12);
}

describe('CreateTraceDto', () => {
  it('should be valid with required fields', async () => {
    const dto = new CreateTraceDto();
    dto.machine_id = vuid('c0000000');
    dto.category = 'process_data' as TraceCategoryType;
    dto.key_data_point = 'temperature';
    dto.value = 85.2;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional order_id', async () => {
    const dto = new CreateTraceDto();
    dto.machine_id = vuid('c0000001');
    dto.category = 'quality' as any;
    dto.key_data_point = 'pass_rate';
    dto.value = 99.5;
    dto.order_id = vuid('c0000002');

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional tags', async () => {
    const dto = new CreateTraceDto();
    dto.machine_id = vuid('c0000003');
    dto.category = 'energy' as any;
    dto.key_data_point = 'kwh';
    dto.value = 150;
    dto.tags = { line: 'A', shift: 'night' };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when machine_id is empty', async () => {
    const dto = new CreateTraceDto();
    (dto as any).machine_id = '';
    dto.category = 'process_data' as any;
    dto.key_data_point = 'temp';
    dto.value = 1;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept all valid category types', async () => {
    const categories: Array<TraceCategoryType> = ['process_data', 'quality', 'material', 'energy', 'op_input'];
    for (const cat of categories) {
      const dto = new CreateTraceDto();
      dto.machine_id = vuid('c0000004');
      dto.category = cat;
      dto.key_data_point = 'test';
      dto.value = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
