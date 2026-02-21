export enum SagaWorkOrderStep {
  CREATE = 'create',
  BUDGET_GENERATED = 'budget_generated',
  AWAITING_APPROVAL = 'awaiting_approval',
  SEND_TO_PRODUCTION = 'send_to_production',
}
