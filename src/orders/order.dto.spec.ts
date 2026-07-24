import { validate } from 'class-validator';
import { CreateOrderDto, UpdateOrderDto } from './order.dto';

// Helper: generate a valid UUID-4 safe for @IsUUID validation (version nibble = 4)
function vuid(suf: string) {
  return 'a1b2c3d4-e5f6-4abc-9012-' + suf.padEnd(12, '0').slice(0, 12);
}

describe('CreateOrderDto', () => {
  it('should be valid with required fields', async () => {
    const dto = new CreateOrderDto();
    dto.name = 'Production-1';
    dto.priority = 5;
    dto.machine_id = vuid('a0000000');
    dto.operation = 'cutting';
    dto.quantity = 100;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional fields', async () => {
    const dto = new CreateOrderDto();
    dto.name = 'Production-2';
    dto.priority = 1;
    dto.machine_id = vuid('a0000001');
    dto.operation = 'welding';
    dto.quantity = 50;
    dto.start_time = new Date('2026-01-01');
    dto.target_complete_time = new Date('2026-01-07');

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateOrderDto();
    dto.name = '';
    dto.priority = 5;
    dto.machine_id = vuid('a0000002');
    dto.operation = 'cutting';
    dto.quantity = 100;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when priority is below minimum', async () => {
    const dto = new CreateOrderDto();
    dto.name = 'Order-1';
    (dto as any).priority = -5;
    dto.machine_id = vuid('a0000003');
    dto.operation = 'cutting';
    dto.quantity = 100;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when quantity is below minimum', async () => {
    const dto = new CreateOrderDto();
    dto.name = 'Order-1';
    dto.priority = 5;
    dto.machine_id = vuid('a0000004');
    dto.operation = 'cutting';
    (dto as any).quantity = 0.5;
    const errorsQuantity = await validate(dto);
    expect(errorsQuantity.length).toBeGreaterThan(0);
  });
});

describe('UpdateOrderDto', () => {
  it('should be valid with empty object', async () => {
    const dto = new UpdateOrderDto();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with partial updates', async () => {
    const dto = new UpdateOrderDto();
    dto.status = 'in_progress' as any;
    dto.completed_quantity = 50;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept error_message', async () => {
    const dto = new UpdateOrderDto();
    dto.error_message = 'Spindle failure at position 42';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
