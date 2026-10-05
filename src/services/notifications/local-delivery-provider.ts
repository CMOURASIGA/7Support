import type { DeliveryMessage, DeliveryProvider, DeliveryResult } from "@/services/notifications/provider";

export type LocalDeliveryMode = "SUCCESS" | "FAILURE";
const MODE_KEY = "7support.spec05.delivery-mode.v1";
const MODE_EVENT = "7support-delivery-mode-changed";

export class LocalDeliveryProvider implements DeliveryProvider {
  mode(): LocalDeliveryMode {
    if (typeof window === "undefined") return "SUCCESS";
    return window.localStorage.getItem(MODE_KEY) === "FAILURE" ? "FAILURE" : "SUCCESS";
  }

  setMode(mode: LocalDeliveryMode) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MODE_KEY, mode);
    window.dispatchEvent(new Event(MODE_EVENT));
  }

  subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => { if (event.key === MODE_KEY) listener(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MODE_EVENT, listener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MODE_EVENT, listener);
    };
  }

  async send(message: DeliveryMessage): Promise<DeliveryResult> {
    if (this.mode() === "FAILURE") throw new Error("LOCAL_PROVIDER_FAILURE");
    return { providerMessageId: `local-${message.notificationId}`, deliveredAt: new Date().toISOString() };
  }
}

export const localDeliveryProvider = new LocalDeliveryProvider();
