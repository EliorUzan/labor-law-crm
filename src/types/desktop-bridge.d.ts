export {};

declare global {
  interface Window {
    crmDesktop?: {
      getBridgeInfo(): Promise<unknown>;
      documentSettings(): Promise<unknown>;
      chooseDocumentRoot(): Promise<unknown>;
      chooseDocuments(): Promise<unknown>;
      droppedDocuments(files: File[]): Promise<unknown>;
      openDocument(relativePath: string): Promise<unknown>;
    };
  }
}
