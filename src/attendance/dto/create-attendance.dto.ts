import { IsOptional, IsString, IsNumber, Min, Max, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiPropertyOptional({ description: 'URL of the selfie taken during check-in/out', example: 'https://example.com/selfie.jpg' })
  @IsString()
  @IsOptional()
  selfieUrl?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate of the location', example: 40.7128 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate of the location', example: -74.0060 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;
}
