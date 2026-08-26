import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyKeyDto {
  @ApiProperty({ description: 'The platform admin super key' })
  @IsString()
  @IsNotEmpty()
  key: string;
}
