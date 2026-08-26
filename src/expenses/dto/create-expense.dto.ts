import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Category of the expense', example: 'Utilities' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Amount of the expense', example: 500.0 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: 'Optional description of the expense', example: 'Electricity bill for August' })
  @IsString()
  @IsOptional()
  description?: string;
}
