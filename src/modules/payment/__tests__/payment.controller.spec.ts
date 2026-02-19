import { Test, TestingModule } from "@nestjs/testing";
import { PaymentController } from "../infrastructure/web/payment.controller";
import { CreatePaymentUseCase } from "../application/use-cases/create-payment.use-case";
import { CreatePaymentDto } from "../infrastructure/web/dto/create-payment.dto";

describe("PaymentController", () => {
  let controller: PaymentController;
  let createPaymentUseCase: jest.Mocked<CreatePaymentUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: CreatePaymentUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(PaymentController);
    createPaymentUseCase = module.get(CreatePaymentUseCase);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("create should call createPaymentUseCase.execute with DTO", async () => {
    const dto: CreatePaymentDto = {
      title: "Test Product",
      quantity: 1,
      unitPrice: 100,
    };
    const mockResponse = {
      id: "preference_123",
      init_point: "https://www.mercadopago.com.br/checkout/v1/redirect",
    };
    createPaymentUseCase.execute.mockResolvedValue(mockResponse);

    const result = await controller.create(dto);

    expect(createPaymentUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockResponse);
  });

  it("webhook should log and return status ok", () => {
    const body = { action: "payment.created", data: { id: "pay_1" } };
    const headers = { "x-signature": "mock" };
    const logSpy = jest.spyOn(controller["logger"], "log");

    const result = controller.webhook(body, headers);

    expect(result).toEqual({ status: "ok" });
    expect(logSpy).toHaveBeenCalledWith("Mercado Pago webhook received", {
      body,
      headers,
    });
  });
});
