import { Injectable } from "@nestjs/common";
import { CustomLogger } from "./common/log/custom.logger";
import { EnvConfigService } from "./common/service/env/env-config.service";

@Injectable()
export class AppService {
  constructor(
    private readonly logger: CustomLogger,
    private readonly envConfig: EnvConfigService,
  ) {}

  async checkMercadoPagoConnection() {
    const accessToken = this.envConfig.get("MERCADOPAGO_ACCESS_TOKEN");
    const publicKey = this.envConfig.get("MERCADOPAGO_PUBLIC_KEY");

    if (!accessToken || !publicKey) {
      this.logger.warn("Missing Mercado Pago credentials");
      return {
        status: "error",
        message: "Missing Mercado Pago credentials",
      };
    }

    try {
      const response = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await response.clone().json().catch(() => ({}));

      this.logger.log("Mercado Pago response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("Mercado Pago connection failed", undefined, {
          statusCode: response.status,
          error: errorData,
        });
        return {
          status: "error",
          message: "Mercado Pago connection failed",
          statusCode: response.status,
        };
      }

      return { status: "ok", id: body.id };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("Mercado Pago connection error", undefined, {
        message,
        error: String(error),
      });
      return {
        status: "error",
        message: "Mercado Pago connection error",
        error: message,
      };
    }
  }
}
