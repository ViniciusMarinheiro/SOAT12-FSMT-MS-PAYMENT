import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EnvConfigService } from "./env-config.service";
import { envSchema } from "./env";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env"],
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [EnvConfigService],
  exports: [EnvConfigService],
})
export class EnvConfigModule {}
