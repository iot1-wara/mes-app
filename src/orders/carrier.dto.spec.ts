import { validate } from 'class-validator';
import { CreateCarrierDto, UpdateCarrierDto, AdvanceCarrierDto } from './carrier.dto';

// Helper: generate a valid UUID-4 safe for @IsUUID validation (version nibble = 4)
function vuid(suf: string) {
  return 'a1b2c3d4-e5f6-4abc-9012-' + suf.padEnd(12, '0').slice(0, 12);
}

describe('CreateCarrierDto', () => {
  it('should be valid with required fields', async () => {
    const dto = new CreateCarrierDto();
    dto.name = 'Carrier-1';
    dto.current_station_id = vuid('b0000000');
    dto.next_resource_id = vuid('b0000001');
    dto.order_id = vuid('b0000002');

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional fields', async () => {
    const dto = new CreateCarrierDto();
    dto.name = 'Carrier-2';
    dto.current_station_id = vuid('b0000003');
    dto.next_resource_id = vuid('b0000004');
    dto.order_id = vuid('b0000005');
    dto.iStepNo = 1;
    dto.nextStepNo = 5;
    dto.status = 'in_process' as any;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateCarrierDto();
    dto.name = '';
    dto.current_station_id = vuid('b0000006');
    dto.next_resource_id = vuid('b0000007');
    dto.order_id = vuid('b0000008');

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when order_id is not a UUID', async () => {
    const dto = new CreateCarrierDto();
    dto.name = 'Carrier-1';
    dto.current_station_id = vuid('b0000009');
    dto.next_resource_id = vuid('b000000a');
    (dto as any).order_id = 'not-a-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate all valid statuses', async () => {
    const statuses = ['idle', 'in_process', 'at_station', 'moved', 'error', 'waiting_for_material'] as const;
    for (const status of statuses) {
      const dto = new CreateCarrierDto();
      dto.name = 'Carrier';
      dto.current_station_id = vuid('b000000b');
      dto.next_resource_id = vuid('b000000c');
      dto.order_id = vuid('b000000d');
      (dto as any).status = status;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});

describe('UpdateCarrierDto', () => {
  it('should be valid with empty object', async () => {
    const dto = new UpdateCarrierDto();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when updating status', async () => {
    const dto = new UpdateCarrierDto();
    (dto as any).status = 'in_process';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept process_data override', async () => {
    const dto = new UpdateCarrierDto();
    dto.process_data = { temp: 85.2, pressure: 3.14 };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept handshake_flags override', async () => {
    const dto = new UpdateCarrierDto();
    dto.handshake_flags = { udi_on: true, op_pos: false };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('AdvanceCarrierDto', () => {
  it('should be valid with required fields', async () => {
    const dto = new AdvanceCarrierDto();
    dto.iStepNo = 5;
    dto.next_resource_id = vuid('b000000e');
    dto.step_description = 'Move to next';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional step_description', async () => {
    const dto = new AdvanceCarrierDto();
    dto.iStepNo = 5;
    dto.next_resource_id = vuid('b000000f');
    dto.step_description = 'Moved to next station';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when iStepNo is not a number', async () => {
    const dto = new AdvanceCarrierDto();
    (dto as any).iStepNo = 'not-a-number';
    dto.next_resource_id = vuid('b000001a');

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
