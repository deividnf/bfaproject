import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { TenantsService } from '../service/tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { Request } from 'express';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async createTenant(@Body() body: CreateTenantDto) {
    return this.tenantsService.createTenant(body);
  }

  @Get(':id')
  async getTenant(@Param('id') id: string, @Req() req: Request) {
    const tenantIdFromApiKey = (req as any).tenantId as string;
    // Enforce that a tenant only sees itself via its API key
    return this.tenantsService.getTenantById(id, tenantIdFromApiKey);
  }
}
