import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { CreatePaymentUseCase } from "../application/use-cases/create-payment.use-case";
import { EnvConfigService } from "@/common/service/env/env-config.service";
import { CreatePaymentDto } from "../infrastructure/web/dto/create-payment.dto";

describe("CreatePaymentUseCase", () => {
  let useCase: CreatePaymentUseCase;
  let envConfig: jest.Mocked<EnvConfigService>;

  beforeEach(async () => {
    const mockEnvConfig = {
      get: jest.fn((key: string) => {
        if (key === "MERCADOPAGO_ACCESS_TOKEN") return "TEST_TOKEN";
        return "";
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentUseCase,
        { provide: EnvConfigService, useValue: mockEnvConfig },
      ],
    }).compile();

    useCase = module.get(CreatePaymentUseCase);
    envConfig = module.get(EnvConfigService) as jest.Mocked<EnvConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock | undefined)?.mockClear?.();
  });

  it("should be defined", () => {
    expect(useCase).toBeDefined();
  });

  it("should create preference and return Mercado Pago response", async () => {
    const dto: CreatePaymentDto = {
      title: "Test Product",
      quantity: 1,
      unitPrice: 100,
    };
    const mockResponse = {
      id: "preference_123",
      init_point: "https://www.mercadopago.com.br/checkout/v1/redirect",
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.mercadopago.com/checkout/preferences",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer TEST_TOKEN",
        }),
      }),
    );
  });

  it("should throw InternalServerErrorException when access token is missing", async () => {
    envConfig.get.mockReturnValue("");

    await expect(
      useCase.execute({
        title: "Test",
        quantity: 1,
        unitPrice: 100,
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it("should throw BadRequestException when Mercado Pago returns error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "invalid_request" }),
    });

    await expect(
      useCase.execute({
        title: "Test",
        quantity: 1,
        unitPrice: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("should include payer when payerEmail provided", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "pref_1" }),
    });

    await useCase.execute({
      title: "Test",
      quantity: 1,
      unitPrice: 100,
      payerEmail: "customer@email.com",
    });

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.payer).toEqual({ email: "customer@email.com" });
  });

  it("should use BRL as default currencyId", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "pref_1" }),
    });

    await useCase.execute({
      title: "Test",
      quantity: 1,
      unitPrice: 100,
    });

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.items[0].currency_id).toBe("BRL");
  });
});
