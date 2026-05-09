export type EventId = string;

export interface InboundEvent {
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  clientId?: string;
  requestId?: string;
}
