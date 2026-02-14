import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '@infra/database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const apiKey =
      (req.headers['x-api-key'] as string) ||
      (req.headers['authorization'] as string)?.replace('ApiKey ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const keyHash = this.hashKey(apiKey);

    const apiKeyRecord = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKeyRecord.tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Tenant is not active');
    }

    (req as any).tenantId = apiKeyRecord.tenantId;
    (req as any).apiKeyId = apiKeyRecord.id;

    next();
  }

  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }
}
