import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MatterDocuments } from "./matter-documents";
import type { MatterDocumentReferences } from "./queries";

const matterId = "22222222-2222-4222-8222-222222222222";
const base = { id: "33333333-3333-4333-8333-333333333333", displayName: "הסכם", category: null, provider: "local", notes: null, updatedAt: new Date() };

describe("Matter documents presentation", () => {
  it("offers an external action only for safe HTTPS locations and preserves local paths as text", () => {
    const documents: MatterDocumentReferences = [
      { ...base, location: "https://drive.google.com/file/d/123" },
      { ...base, id: "44444444-4444-4444-8444-444444444444", displayName: "כתב תביעה", location: "C:\\Cases\\claim.pdf" },
    ];
    const html = renderToStaticMarkup(<MatterDocuments matterId={matterId} documents={documents} />);
    expect(html).toContain("מסמכים"); expect(html).toContain("C:\\Cases\\claim.pdf");
    expect(html).toContain('href="https://drive.google.com/file/d/123"');
    expect(html).not.toContain('href="C:\\Cases\\claim.pdf"');
  });

  it("shows the approved empty state and keeps only name/location required", () => {
    const html = renderToStaticMarkup(<MatterDocuments matterId={matterId} documents={[]} />);
    expect(html).toContain("אין מסמכים מקושרים לתיק");
    expect((html.match(/required=""/g) ?? [])).toHaveLength(2);
  });
});
