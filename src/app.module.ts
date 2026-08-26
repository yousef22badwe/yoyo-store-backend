import { Module } from '@nestjs/common';
import { UploadsModule } from './uploads/uploads.module';
import { ReportsModule } from './reports/reports.module';
import { PaymentChannelsModule } from './payment-channels/payment-channels.module';
import { StoreSettingsModule } from './store-settings/store-settings.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CustomersModule } from './customers/customers.module';
import { CashDrawerModule } from './cash-drawer/cash-drawer.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PrismaModule } from './prisma/prisma.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [
    UploadsModule,
    ReportsModule,
    PaymentChannelsModule,
    StoreSettingsModule,
    AuthModule,
    AttendanceModule,
    ProductsModule,
    InvoicesModule,
    CustomersModule,
    CashDrawerModule,
    ExpensesModule,
    PrismaModule,
    PlatformAdminModule,
    EmployeesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
