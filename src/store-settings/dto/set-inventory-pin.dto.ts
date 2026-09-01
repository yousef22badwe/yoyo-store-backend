import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetInventoryPinDto {
  @ApiProperty({
    description: 'The new inventory PIN (4-6 digits)',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'inventoryPin must contain 4 to 6 digits' })
  inventoryPin: string;
}
