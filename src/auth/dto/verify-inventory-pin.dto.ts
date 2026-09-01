import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyInventoryPinDto {
  @ApiProperty({ example: '1234', description: 'The store security PIN' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'pin must contain 4 to 6 digits' })
  pin: string;
}
