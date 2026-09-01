import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiPropertyOptional({
    description:
      'A JPEG, PNG, or WebP selfie encoded as a data URL (maximum decoded size: 750 KB)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1_025_000)
  @Matches(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, {
    message: 'selfieUrl must be a valid JPEG, PNG, or WebP data URL',
  })
  selfieUrl?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate of the location',
    example: 40.7128,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate of the location',
    example: -74.006,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;
}
