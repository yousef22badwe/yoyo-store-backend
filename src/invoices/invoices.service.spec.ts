import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import {
  CreateInvoiceDto,
  InvoiceType,
  PaymentMethod,
} from './dto/create-invoice.dto';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      customer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'owner-employee' }),
        create: jest.fn(),
      },
      paymentChannel: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      paymentChannelTransaction: { create: jest.fn() },
      invoice: {
        create: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
      },
      cashDrawerTransaction: { create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    service = new InvoicesService(prisma);
  });

  it('creates a product sale and decrements stock in the same transaction', async () => {
    tx.product.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'شاحن سريع',
      salePrice: 250,
    });
    tx.product.updateMany.mockResolvedValue({ count: 1 });

    const dto: CreateInvoiceDto = {
      invoiceType: InvoiceType.CASH,
      paymentMethod: PaymentMethod.CASH,
      items: [
        {
          productId: '11111111-1111-4111-8111-111111111111',
          productName: 'شاحن سريع',
          quantity: 2,
          unitPrice: 250,
        },
      ],
    };

    await service.create('store-1', undefined as any, 'ADMIN', dto);

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: '11111111-1111-4111-8111-111111111111',
        storeId: 'store-1',
        quantity: { gte: 2 },
      },
      data: { quantity: { decrement: 2 } },
    });
    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: 500,
          paidAmount: 500,
          remainingAmount: 0,
          items: {
            create: [
              expect.objectContaining({
                productName: 'شاحن سريع',
                quantity: 2,
                unitPrice: 250,
                subtotal: 500,
              }),
            ],
          },
        }),
      }),
    );
    expect(tx.cashDrawerTransaction.create).toHaveBeenCalled();
  });

  it('adds credit debt to a customer created during the sale', async () => {
    tx.customer.findFirst.mockResolvedValue(null);
    tx.customer.create.mockResolvedValue({ id: 'customer-1' });

    const dto: CreateInvoiceDto = {
      customerName: 'أحمد علي',
      customerPhone: '01000000000',
      invoiceType: InvoiceType.CREDIT,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 100,
      items: [
        {
          productName: 'صيانة شاشة',
          quantity: 1,
          unitPrice: 400,
        },
      ],
    };

    await service.create('store-1', undefined as any, 'ADMIN', dto);

    expect(tx.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { totalDebt: { increment: 300 } },
    });
  });

  it('rejects the whole sale when current stock is insufficient', async () => {
    tx.product.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'جراب',
      salePrice: 50,
    });
    tx.product.updateMany.mockResolvedValue({ count: 0 });

    const dto: CreateInvoiceDto = {
      invoiceType: InvoiceType.CASH,
      paymentMethod: PaymentMethod.CASH,
      items: [
        {
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 3,
          unitPrice: 50,
        },
      ],
    };

    await expect(
      service.create('store-1', undefined as any, 'ADMIN', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });

  it('rejects a credit payment larger than the invoice total', async () => {
    const dto: CreateInvoiceDto = {
      customerName: 'عميل آجل',
      invoiceType: InvoiceType.CREDIT,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 600,
      items: [
        {
          productName: 'هاتف مستعمل',
          quantity: 1,
          unitPrice: 500,
        },
      ],
    };
    tx.customer.findFirst.mockResolvedValue({ id: 'customer-1' });

    await expect(
      service.create('store-1', undefined as any, 'ADMIN', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });
});
