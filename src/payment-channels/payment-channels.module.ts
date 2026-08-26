import { Module } from '@nestjs/common';
import { PaymentChannelsService } from './payment-channels.service';
import { PaymentChannelsController } from './payment-channels.controller';

@Module({
  controllers: [PaymentChannelsController],
  providers: [PaymentChannelsService],
})
export class PaymentChannelsModule {}
