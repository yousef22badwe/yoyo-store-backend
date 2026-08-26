import { IsNotEmpty, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterStoreDto {
  @ApiProperty({ example: 'My Awesome Store', description: 'The name of the store' })
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ApiProperty({ example: 'John Doe', description: 'The name of the store owner' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: '+1234567890', description: 'The phone number of the owner (acts as login)' })
  @IsPhoneNumber('EG')
  @IsNotEmpty()
  ownerPhone: string;

  @ApiProperty({ example: 'securepassword123', description: 'The password for the admin account', minLength: 6 })
  @IsString()
  @MinLength(6)
  ownerPassword: string;

  @ApiProperty({ example: '1234', description: 'The 4-digit PIN for the owner to access inventory' })
  @IsString()
  @MinLength(4)
  inventoryPin: string;
}
