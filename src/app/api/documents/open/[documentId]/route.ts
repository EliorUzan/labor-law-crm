import { resolveDocument } from "@/modules/documents/actions";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const result = await resolveDocument(documentId);
  if (!result.ok) return new Response(result.error, { status: 409, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  return Response.redirect(result.value.webUrl, 302);
}
