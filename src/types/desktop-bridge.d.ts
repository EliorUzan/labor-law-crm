export {};

declare global {
  interface Window {
    crmDesktop?: {
      getBridgeInfo(): Promise<unknown>;
    };
  }
}
