// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { clients, matters } from "@/db/schema";
import { createDocumentForTarget, getDocument, linkDocumentToTarget, listDocumentsForTarget, unlinkDocumentFromTarget } from "./service";
import { managedFolderSegments } from "./managed-folders";

const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/db/client", () => ({ createDatabaseClient: mocks.database }));

describe.skipIf(process.env.CRM_DOCUMENT_DB_TEST !== "1")("Document service against PostgreSQL (rolled back fixtures)", () => {
  it("preserves file identity, rejects other owners, routes folders, and unlinks without deleting", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the explicitly enabled integration test.");
    const connection = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
    const database = drizzle(connection);
    const rollback = new Error("ROLLBACK_TEST_FIXTURES");
    try {
      await database.transaction(async (transaction) => {
        mocks.database.mockReturnValue(transaction);
        const owner = randomUUID(); const other = randomUUID();
        const [client] = await transaction.insert(clients).values({ ownerUserId: owner, name: "לקוח בדיקת מסמכים" }).returning();
        const [foreign] = await transaction.insert(clients).values({ ownerUserId: other, name: "לקוח בעלים אחר" }).returning();
        const [matter] = await transaction.insert(matters).values({ ownerUserId: owner, clientId: client.id, title: "תיק בדיקת מסמכים" }).returning();
        const clientTarget = { type: "client" as const, id: client.id };
        const matterTarget = { type: "matter" as const, id: matter.id };
        const input = { displayName: "claim.docx", relativePath: "existing/claim.docx", driveFileId: `test-${randomUUID()}`, webUrl: "https://docs.google.com/document/d/test/edit" };
        const document = await createDocumentForTarget(owner, clientTarget, input);
        expect(document).not.toBeNull();
        expect(await createDocumentForTarget(owner, matterTarget, input)).toEqual(document);
        expect(await listDocumentsForTarget(owner, matterTarget)).toHaveLength(1);
        expect(await listDocumentsForTarget(other, clientTarget)).toEqual([]);
        expect(await getDocument(other, document!.id)).toBeNull();
        expect(await linkDocumentToTarget(owner, document!.id, { type: "client", id: foreign.id })).toBe(false);
        expect(await createDocumentForTarget(owner, clientTarget, { ...input, driveFileId: "another-file" })).toBeNull();
        expect(await createDocumentForTarget(owner, matterTarget, { ...input, relativePath: "renamed/claim.docx" })).toEqual(document);
        expect((await getDocument(owner, document!.id))?.relativePath).toBe("renamed/claim.docx");
        expect(await managedFolderSegments(owner, matterTarget)).toEqual(["CRM", `${client.name} (${client.id})`, `${matter.title} (${matter.id})`]);
        expect(await unlinkDocumentFromTarget(owner, document!.id, clientTarget)).toBe(true);
        expect(await listDocumentsForTarget(owner, clientTarget)).toEqual([]);
        expect(await listDocumentsForTarget(owner, matterTarget)).toHaveLength(1);
        expect(await getDocument(owner, document!.id)).not.toBeNull();
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { await connection.end(); }
  }, 30000);
});
