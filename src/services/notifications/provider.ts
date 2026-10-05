export type DeliveryMessage = {
  notificationId: string;
  recipientUserId: string;
  title: string;
  body: string;
};

export type DeliveryResult = { providerMessageId: string; deliveredAt: string };

export interface DeliveryProvider {
  send(message: DeliveryMessage): Promise<DeliveryResult>;
}
