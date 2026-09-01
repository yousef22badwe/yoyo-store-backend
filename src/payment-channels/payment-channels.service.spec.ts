import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentChannelTxType, PaymentChannelType } from '@prisma/client';
import { PaymentChannelsService } from './payment-channels.service';

describe('PaymentChannelsService', () => {
  let service: PaymentChannelsService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'employee-1' }),
        create: jest.fn(),
      },
      paymentChannel: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      paymentChannelTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    prisma = {
      paymentChannel: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      paymentChannelTransaction: { findMany: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    service = new PaymentChannelsService(prisma);
  });

  it('returns only active channels for the current store', async () => {
    prisma.paymentChannel.findMany.mockResolvedValue([]);

    await service.findAll('store-1');

    expect(prisma.paymentChannel.findMany).toHaveBeenCalledWith({
      where: { storeId: 'store-1', isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('records a deposit and updates the balance atomically', async () => {
    tx.paymentChannel.findFirst.mockResolvedValue({
      id: 'channel-1',
      storeId: 'store-1',
      balance: 100,
      isActive: true,
    });
    tx.paymentChannelTransaction.create.mockResolvedValue({ id: 'tx-1' });
    tx.paymentChannel.update.mockResolvedValue({ balance: 125.5 });

    await service.createTransaction(
      'store-1',
      'channel-1',
      'employee-1',
      'ADMIN',
      {
        type: PaymentChannelTxType.DEPOSIT,
        amount: 25.5,
        description: 'Top up',
      },
    );

    expect(tx.paymentChannelTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: 'store-1',
        paymentChannelId: 'channel-1',
        employeeId: 'employee-1',
        type: PaymentChannelTxType.DEPOSIT,
        amount: 25.5,
      }),
    });
    const update = tx.paymentChannel.update.mock.calls[0][0];
    expect(update.data.balance.toString()).toBe('125.5');
  });

  it('rejects a withdrawal that exceeds the current balance', async () => {
    tx.paymentChannel.findFirst.mockResolvedValue({
      id: 'channel-1',
      storeId: 'store-1',
      balance: 20,
      isActive: true,
    });

    await expect(
      service.createTransaction(
        'store-1',
        'channel-1',
        'employee-1',
        'EMPLOYEE',
        {
          type: PaymentChannelTxType.SERVICE,
          amount: 30,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.paymentChannelTransaction.create).not.toHaveBeenCalled();
    expect(tx.paymentChannel.update).not.toHaveBeenCalled();
  });

  it('allows employees to sell services but not adjust balances', async () => {
    await expect(
      service.createTransaction(
        'store-1',
        'channel-1',
        'employee-1',
        'EMPLOYEE',
        {
          type: PaymentChannelTxType.DEPOSIT,
          amount: 30,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates an opening-balance audit transaction with a new channel', async () => {
    tx.paymentChannel.findFirst.mockResolvedValue(null);
    tx.paymentChannel.create.mockResolvedValue({
      id: 'channel-1',
      balance: 0,
    });
    tx.paymentChannelTransaction.create.mockResolvedValue({ id: 'tx-1' });
    tx.paymentChannel.update.mockResolvedValue({
      id: 'channel-1',
      balance: 500,
    });

    await service.create('store-1', 'employee-1', 'ADMIN', {
      name: 'محفظة الفرع',
      type: PaymentChannelType.WALLET,
      initialBalance: 500,
    });

    expect(tx.paymentChannelTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentChannelId: 'channel-1',
        type: PaymentChannelTxType.DEPOSIT,
        amount: 500,
      }),
    });
  });

  it('scopes the combined history to the current store', async () => {
    prisma.paymentChannelTransaction.findMany.mockResolvedValue([]);

    await service.getAllTransactions('store-1');

    expect(prisma.paymentChannelTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: 'store-1' } }),
    );
  });
});
