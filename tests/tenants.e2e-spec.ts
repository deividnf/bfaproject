import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma.service';

describe('Tenants module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria um tenant e retorna API key', async () => {
    const res = await request(app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Tenant Teste' })
      .expect(201);

    expect(res.body.tenant).toBeDefined();
    expect(res.body.apiKey).toBeDefined();
    expect(res.body.apiKey.key).toBeDefined();
  });

  it('nega acesso sem API Key', async () => {
    await request(app.getHttpServer())
      .get('/tenants/some-id')
      .expect(401);
  });

  it('nega acesso com API Key inválida', async () => {
    await request(app.getHttpServer())
      .get('/tenants/some-id')
      .set('x-api-key', 'chave-invalida')
      .expect(401);
  });
});
