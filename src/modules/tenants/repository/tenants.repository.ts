import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma.service';

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createTenant(data: { name: string; planId?: string }) {
    return this.prisma.tenant.create({
      data,
    });
  }

  findByIdForTenant(id: string) {
    return this.prisma.tenant.findFirst({
      where: {
        id,
      },
    });
  }
}
