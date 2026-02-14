import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infra/database/database.module';
import { LoggingModule } from './core/logging/logging.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { HealthModule } from './core/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggingModule,
    DatabaseModule,
    HealthModule,
    TenantsModule,
  ],
})
export class AppModule {}
