import { IsNotEmpty, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: 'The new subscription end date in ISO format', example: '2026-12-31T23:59:59Z' })
  @IsISO8601()
  @IsNotEmpty()
  subscriptionEndsAt: string;
}
