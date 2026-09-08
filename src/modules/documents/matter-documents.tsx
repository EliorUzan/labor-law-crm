import { panelClass } from "@/modules/clients/presentation";
import { DocumentReferenceForm } from "./forms";
import { getSafeHttpsUrl, type DocumentReferenceFields } from "./validation";
import type { MatterDocumentReferences } from "./queries";

const providerLabels: Record<string, string> = {
  google_drive: "Google Drive", dropbox: "Dropbox", onedrive: "OneDrive", local: "מקומי", other: "אחר",
};

function providerLabel(provider: string | null) {
  return provider ? (providerLabels[provider] ?? provider) : null;
}

export function MatterDocuments({ matterId, documents }: { matterId: string; documents: MatterDocumentReferences }) {
  return <section className={panelClass} id="documents">
    <h2 className="text-lg font-bold">מסמכים</h2>
    <details className="mt-4 rounded-lg border border-stone-200 p-3"><summary className="cursor-pointer font-medium text-teal-800">+ הוסף מסמך</summary>
      <DocumentReferenceForm matterId={matterId} />
    </details>
    {documents.length ? <ol className="mt-4 divide-y divide-stone-100">{documents.map((document) => {
      const safeUrl = getSafeHttpsUrl(document.location);
      const initial: DocumentReferenceFields = { displayName: document.displayName, location: document.location, category: document.category, provider: document.provider, notes: document.notes };
      return <li key={document.id} className="py-4">
        <h3 className="break-words font-semibold" dir="auto">{document.displayName}</h3>
        {providerLabel(document.provider) && <p className="mt-1 text-sm text-stone-500" dir="auto">{providerLabel(document.provider)}</p>}
        <p className="mt-2 break-all text-sm text-stone-600" dir="ltr">{document.location}</p>
        {safeUrl && <a className="mt-2 inline-block text-sm text-teal-700 underline" href={safeUrl} target="_blank" rel="noreferrer">פתח</a>}
        {document.category && <p className="mt-2 text-sm text-stone-500" dir="auto">קטגוריה: {document.category}</p>}
        {document.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-600" dir="auto">{document.notes}</p>}
        <details className="mt-3"><summary className="cursor-pointer text-sm text-teal-700">עריכת מסמך</summary>
          <DocumentReferenceForm key={document.updatedAt.toISOString()} matterId={matterId} documentId={document.id} initial={initial} />
        </details>
      </li>;
    })}</ol> : <p className="mt-4 text-sm text-stone-500">אין מסמכים מקושרים לתיק</p>}
  </section>;
}
