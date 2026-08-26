import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, InvoiceType } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, employeeId: string, role: string, dto: CreateInvoiceDto) {
    if (dto.invoiceType === InvoiceType.CREDIT && !dto.customerId) {
      throw new BadRequestException('customerId is required for CREDIT invoices');
    }

    if (dto.paymentMethod === 'ELECTRONIC' && !dto.paymentChannelId) {
      throw new BadRequestException('paymentChannelId is required for ELECTRONIC payments');
    }

    // Prisma transaction
    return this.prisma.$transaction(async (prisma) => {
      // 1. Verify and fetch all products, calculate totals
      let totalAmount = 0;
      const verifiedItems = [];

      for (const item of dto.items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, storeId },
        });

        if (!product) {
          throw new BadRequestException(`Product with ID ${item.productId} not found`);
        }

        if (product.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}`);
        }

        const subtotal = Number(product.salePrice) * item.quantity;
        totalAmount += subtotal;

        verifiedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          subtotal: subtotal,
        });

        // 2. Decrement product stock
        await prisma.product.update({
          where: { id: product.id },
          data: { quantity: { decrement: item.quantity } },
        });
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
          throw new BadRequestException('Paid amount cannot exceed total amount');
        }
        remainingAmount = totalAmount - paidAmount;
        status = remainingAmount === 0 ? InvoiceStatus.PAID : (paidAmount > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID);
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
          where: { storeId, role: 'ADMIN' }
        });
        if (!adminEmp) {
          adminEmp = await prisma.employee.create({
            data: {
              storeId,
              name: 'Store Owner',
              phone: '0000000000',
              pin: '0000', // Dummy
              role: 'ADMIN',
              isActive: true,
            }
          });
        }
        actualEmployeeId = adminEmp.id;
      } else if (!actualEmployeeId) {
          throw new ForbiddenException('Employee ID is required to create an invoice');
      }

      // 4.5. Validate Payment Channel if ELECTRONIC
      if (dto.paymentMethod === 'ELECTRONIC') {
        const channel = await prisma.paymentChannel.findFirst({
          where: { id: dto.paymentChannelId!, storeId }
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
          customerId: dto.customerId,
          createdByEmployeeId: actualEmployeeId,
          invoiceType: dto.invoiceType,
          paymentMethod: dto.paymentMethod,
          paymentChannelId: dto.paymentChannelId,
          totalAmount,
          paidAmount,
          remainingAmount,
          status,
          items: {
            create: verifiedItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: true,
        }
      });

      // 6. Update customer debt if credit or partial
      if (dto.customerId && remainingAmount > 0) {
        await prisma.customer.update({
          where: { id: dto.customerId },
          data: { totalDebt: { increment: remainingAmount } },
        });
      }

      // 7. Auto-log CashDrawerTransaction if paymentMethod is CASH and paidAmount > 0
      if (dto.paymentMethod === 'CASH' && paidAmount > 0) {
        await prisma.cashDrawerTransaction.create({
          data: {
            storeId,
            employeeId: actualEmployeeId,
            type: 'SALE',
            amount: paidAmount,
            paymentMethod: 'CASH',
            description: `Auto-generated from Invoice ${invoice.id}`,
          }
        });
      }

      // 8. Auto-log PaymentChannelTransaction if paymentMethod is ELECTRONIC and paidAmount > 0
      if (dto.paymentMethod === 'ELECTRONIC' && paidAmount > 0) {
        await prisma.paymentChannel.update({
          where: { id: dto.paymentChannelId! },
          data: { balance: { increment: paidAmount } }
        });

        await prisma.paymentChannelTransaction.create({
          data: {
            storeId,
            paymentChannelId: dto.paymentChannelId!,
            employeeId: actualEmployeeId,
            type: 'SERVICE',
            amount: paidAmount,
            description: `Invoice payment for Invoice ${invoice.id}`
          }
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
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' }
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
            product: { select: { name: true } }
          }
        },
        debtPayments: true,
      }
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async addPayment(storeId: string, id: string, dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (prisma) => {
      const invoice = await prisma.invoice.findFirst({
        where: { id, storeId },
        include: { customer: true }
      });

      if (!invoice) throw new NotFoundException('Invoice not found');
      if (!invoice.customerId) throw new BadRequestException('Invoice has no associated customer');
      if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Invoice is already fully paid');
      if (dto.amountPaid > Number(invoice.remainingAmount)) {
        throw new BadRequestException('Payment amount cannot exceed remaining invoice amount');
      }

      const newPaidAmount = Number(invoice.paidAmount) + dto.amountPaid;
      const newRemainingAmount = Number(invoice.remainingAmount) - dto.amountPaid;
      const newStatus = newRemainingAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      // 1. Record debt payment
      const debtPayment = await prisma.debtPayment.create({
        data: {
          invoiceId: id,
          customerId: invoice.customerId,
          amountPaid: dto.amountPaid,
          notes: dto.notes,
        }
      });

      // 2. Update invoice
      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        },
        include: { debtPayments: true }
      });

      // 3. Update customer debt
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: { totalDebt: { decrement: dto.amountPaid } }
      });

      return updatedInvoice;
    });
  }
}
