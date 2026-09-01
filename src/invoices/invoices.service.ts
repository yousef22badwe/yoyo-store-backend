import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInvoiceDto,
  InvoiceType,
  PaymentMethod,
} from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    storeId: string,
    employeeId: string,
    role: string,
    dto: CreateInvoiceDto,
  ) {
    // For CREDIT: require either customerId or customerName
    if (
      dto.invoiceType === InvoiceType.CREDIT &&
      !dto.customerId &&
      !dto.customerName
    ) {
      throw new BadRequestException(
        'customerId or customerName is required for CREDIT invoices',
      );
    }

    // Prisma transaction
    return this.prisma.$transaction(async (prisma) => {
      // 0. Resolve/create customer if customerName provided instead of customerId
      let resolvedCustomerId = dto.customerId;
      if (resolvedCustomerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: resolvedCustomerId, storeId },
          select: { id: true },
        });
        if (!customer) {
          throw new BadRequestException('Customer not found in this store');
        }
      } else if (dto.customerName) {
        // Try to find existing customer by phone or name in this store
        let customer = await prisma.customer.findFirst({
          where: {
            storeId,
            OR: [
              dto.customerPhone ? { phone: dto.customerPhone } : undefined,
              { name: dto.customerName },
            ].filter(Boolean) as any,
          },
        });
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              storeId,
              name: dto.customerName,
              phone: dto.customerPhone ?? null,
            },
          });
        }
        resolvedCustomerId = customer.id;
      }

      // 1. Verify and fetch all products, calculate totals
      let totalAmount = 0;
      const verifiedItems: Array<{
        productId: string | null;
        productName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

      for (const item of dto.items) {
        // Support custom/freetext items (no productId required)
        if (!item.productId) {
          if (!item.productName?.trim()) {
            throw new BadRequestException(
              'Product name is required for custom items',
            );
          }
          const unitPrice = item.unitPrice ?? 0;
          const subtotal = unitPrice * item.quantity;
          totalAmount += subtotal;
          verifiedItems.push({
            productId: null,
            productName: item.productName ?? 'منتج',
            quantity: item.quantity,
            unitPrice: unitPrice,
            subtotal: subtotal,
          });
          continue;
        }

        const product = await prisma.product.findFirst({
          where: { id: item.productId, storeId },
        });

        if (!product) {
          throw new BadRequestException(
            `Product with ID ${item.productId} not found`,
          );
        }

        const unitPrice = item.unitPrice ?? Number(product.salePrice);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        verifiedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: unitPrice,
          subtotal: subtotal,
        });

        // Decrement only when enough stock still exists. This remains safe when
        // two devices sell the same product at the same time.
        const stockUpdate = await prisma.product.updateMany({
          where: {
            id: product.id,
            storeId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (stockUpdate.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}`,
          );
        }
      }

      if (totalAmount <= 0) {
        throw new BadRequestException(
          'Invoice total must be greater than zero',
        );
      }

      // 3. Determine payment and status
      let paidAmount = 0;
      let remainingAmount = 0;
      let status: InvoiceStatus = InvoiceStatus.PAID;

      if (dto.invoiceType === InvoiceType.CASH) {
        paidAmount = totalAmount;
        remainingAmount = 0;
        status = InvoiceStatus.PAID;
      } else {
        // CREDIT
        paidAmount = dto.paidAmount ?? 0;
        if (paidAmount > totalAmount) {
          throw new BadRequestException(
            'Paid amount cannot exceed invoice total',
          );
        }
        remainingAmount = totalAmount - paidAmount;
        status =
          remainingAmount === 0
            ? InvoiceStatus.PAID
            : paidAmount > 0
              ? InvoiceStatus.PARTIAL
              : InvoiceStatus.UNPAID;
      }

      // 4. Handle employeeId for ADMIN vs EMPLOYEE
      // Admins might not have an Employee record linked to them in the same way, but the schema requires `createdByEmployeeId` mapping to Employee model.
      // Wait, let's check schema: createdByEmployee Employee @relation...
      // If the user is ADMIN, their ID in JWT is `storeId` but they might not have an `employeeId`.
      // The requirement says: "createdByEmployeeId from JWT (employeeId if role is EMPLOYEE, or look up/create a system reference if ADMIN)"

      let actualEmployeeId = employeeId;
      if (role === 'ADMIN' && !employeeId) {
        // Look for an admin employee or create a dummy one for the store owner
        let adminEmp = await prisma.employee.findFirst({
          where: {
            storeId,
            name: 'Store Owner',
            phone: '0000000000',
          },
        });
        if (!adminEmp) {
          adminEmp = await prisma.employee.create({
            data: {
              storeId,
              name: 'Store Owner',
              phone: '0000000000',
              pin: await bcrypt.hash(`disabled-owner-${storeId}`, 10),
              role: 'ADMIN',
              isActive: false,
            },
          });
        }
        actualEmployeeId = adminEmp.id;
      } else if (!actualEmployeeId) {
        throw new ForbiddenException(
          'Employee ID is required to create an invoice',
        );
      }

      // 4.5. Validate Payment Channel if ELECTRONIC
      if (
        dto.paymentMethod === PaymentMethod.ELECTRONIC &&
        dto.paymentChannelId
      ) {
        const channel = await prisma.paymentChannel.findFirst({
          where: { id: dto.paymentChannelId!, storeId },
        });
        if (!channel) {
          throw new BadRequestException('Invalid payment channel');
        }
        if (!channel.isActive) {
          throw new BadRequestException('Payment channel is inactive');
        }
      }

      // 5. Create Invoice
      const invoice = await prisma.invoice.create({
        data: {
          storeId,
          customerId: resolvedCustomerId,
          createdByEmployeeId: actualEmployeeId,
          invoiceType: dto.invoiceType,
          paymentMethod: dto.paymentMethod,
          paymentChannelId: dto.paymentChannelId,
          totalAmount,
          paidAmount,
          remainingAmount,
          status,
          items: {
            create: verifiedItems.map((item) => ({
              ...(item.productId
                ? { product: { connect: { id: item.productId } } }
                : {}),
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 6. Update customer debt if credit or partial
      if (resolvedCustomerId && remainingAmount > 0) {
        await prisma.customer.update({
          where: { id: resolvedCustomerId },
          data: { totalDebt: { increment: remainingAmount } },
        });
      }

      // 7. Auto-log CashDrawerTransaction if paymentMethod is CASH and paidAmount > 0
      if (dto.paymentMethod === PaymentMethod.CASH && paidAmount > 0) {
        await prisma.cashDrawerTransaction.create({
          data: {
            storeId,
            employeeId: actualEmployeeId,
            type: 'SALE',
            amount: paidAmount,
            paymentMethod: 'CASH',
            description: `Auto-generated from Invoice ${invoice.id}`,
          },
        });
      }

      // 8. Auto-log PaymentChannelTransaction if paymentMethod is ELECTRONIC and paidAmount > 0
      if (
        dto.paymentMethod === PaymentMethod.ELECTRONIC &&
        dto.paymentChannelId &&
        paidAmount > 0
      ) {
        await prisma.paymentChannel.update({
          where: { id: dto.paymentChannelId! },
          data: { balance: { increment: paidAmount } },
        });

        await prisma.paymentChannelTransaction.create({
          data: {
            storeId,
            paymentChannelId: dto.paymentChannelId!,
            employeeId: actualEmployeeId,
            type: 'SERVICE',
            amount: paidAmount,
            description: `Invoice payment for Invoice ${invoice.id}`,
          },
        });
      }

      return invoice;
    });
  }

  async findAll(storeId: string, status?: InvoiceStatus, customerId?: string) {
    const where: any = { storeId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(storeId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, storeId },
      include: {
        customer: true,
        createdByEmployee: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
        debtPayments: true,
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async addPayment(storeId: string, id: string, dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (prisma) => {
      const invoice = await prisma.invoice.findFirst({
        where: { id, storeId },
        include: { customer: true },
      });

      if (!invoice) throw new NotFoundException('Invoice not found');
      if (!invoice.customerId)
        throw new BadRequestException('Invoice has no associated customer');
      if (invoice.status === InvoiceStatus.PAID)
        throw new BadRequestException('Invoice is already fully paid');
      if (dto.amountPaid > Number(invoice.remainingAmount)) {
        throw new BadRequestException(
          'Payment amount cannot exceed remaining invoice amount',
        );
      }

      const newPaidAmount = Number(invoice.paidAmount) + dto.amountPaid;
      const newRemainingAmount =
        Number(invoice.remainingAmount) - dto.amountPaid;
      const newStatus =
        newRemainingAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      // 1. Record debt payment
      const debtPayment = await prisma.debtPayment.create({
        data: {
          invoiceId: id,
          customerId: invoice.customerId,
          amountPaid: dto.amountPaid,
          notes: dto.notes,
        },
      });

      // 2. Update invoice
      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        },
        include: { debtPayments: true },
      });

      // 3. Update customer debt
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: { totalDebt: { decrement: dto.amountPaid } },
      });

      return updatedInvoice;
    });
  }
}
