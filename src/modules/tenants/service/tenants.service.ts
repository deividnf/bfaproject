import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from '../repository/tenants.repository';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import * as crypto from 'crypto';
import { PrismaService } from '@infra/database/prisma.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const tenant = await this.tenantsRepository.createTenant({
      name: dto.name,
      planId: dto.planId,
    });

    const rawApiKey = this.generateApiKey();
    const keyHash = this.hashKey(rawApiKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        keyHash,
        label: 'default',
      },
    });

    return {
      tenant,
      apiKey: {
        id: apiKey.id,
        key: rawApiKey,
      },
    };
  }

  async getTenantById(id: string, tenantIdFromApiKey: string) {
    if (id !== tenantIdFromApiKey) {
      throw new NotFoundException();
    }

    const tenant = await this.tenantsRepository.findByIdForTenant(id);

    if (!tenant) {
      throw new NotFoundException();
    }

    return tenant;
  }

  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }
}
