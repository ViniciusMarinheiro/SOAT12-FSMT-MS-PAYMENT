export type CreatePaymentDto = {
  title: string;
  quantity: number;
  unitPrice: number;
  currencyId?: string;
  payerEmail?: string;
};
