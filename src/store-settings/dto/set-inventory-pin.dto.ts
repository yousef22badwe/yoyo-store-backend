import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetInventoryPinDto {
  @ApiProperty({ description: 'The new inventory PIN (4-6 digits)', example: '1234' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  inventoryPin: string;
}
