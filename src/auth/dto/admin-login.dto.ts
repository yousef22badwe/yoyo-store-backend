import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: '+201111111111', description: 'The phone number of the store owner' })
  @IsPhoneNumber('EG')
  @IsNotEmpty()
  ownerPhone: string;

  @ApiProperty({ example: 'securepassword123', description: 'The password for the admin account' })
  @IsString()
  @IsNotEmpty()
  ownerPassword: string;
}
