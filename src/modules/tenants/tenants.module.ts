import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantsController } from './controller/tenants.controller';
import { TenantsService } from './service/tenants.service';
import { TenantsRepository } from './repository/tenants.repository';
import { PrismaService } from '@infra/database/prisma.service';
import { ApiKeyMiddleware } from '@core/auth/api-key.middleware';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository, PrismaService],
})
export class TenantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyMiddleware).forRoutes('tenants/:id');
  }
}
