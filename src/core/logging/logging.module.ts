import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
        genReqId: () => randomUUID(),
        customProps: (req, res) => ({
          request_id: (req as any).id,
          tenant_id: (req as any).tenantId ?? null,
          api_key_id: (req as any).apiKeyId ?? null,
          status: res.statusCode,
          latency: (res as any).responseTime,
        }),
      },
    }),
  ],
})
export class LoggingModule {}
