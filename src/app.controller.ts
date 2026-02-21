import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('mercadopago')
  async healthMercadoPago() {
    return this.appService.checkMercadoPagoConnection();
  }
}
