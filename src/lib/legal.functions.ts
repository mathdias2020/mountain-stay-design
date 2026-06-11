import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signOne } from "@/lib/storage-signing";

export type LegalDocType = "terms" | "privacy";

export type LegalDocSummary = {
  id: string;
  doc_type: LegalDocType;
  version: number;
  original_filename: string;
  file_size: number;
  is_current: boolean;
  created_at: string;
};

export type CurrentLegalDoc = LegalDocSummary & { signed_url: string };

const docTypeSchema = z.enum(["terms", "privacy"]);
const SIGNED_URL_TTL = 60 * 60; // 1h
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

// ---------- Public ----------

export const getCurrentLegalDoc = createServerFn({ method: "GET" })
  .inputValidator((data: { docType: LegalDocType }) =>
    z.object({ docType: docTypeSchema }).parse(data),
  )
  .handler(async ({ data }): Promise<CurrentLegalDoc | null> => {
    setResponseHeader(
      "cache-control",
      "private, max-age=60, stale-while-revalidate=300",
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row } = await supabaseAdmin
      .from("legal_documents")
      .select(
        "id, doc_type, version, original_filename, file_size, is_current, created_at, storage_path",
      )
      .eq("doc_type", data.docType)
      .eq("is_current", true)
      .maybeSingle();
    if (!row) return null;
    const signed = await signOne(
      "legal-documents",
      row.storage_path,
      SIGNED_URL_TTL,
    );
    if (!signed) return null;
    return {
      id: row.id,
      doc_type: row.doc_type as LegalDocType,
      version: row.version,
      original_filename: row.original_filename,
      file_size: row.file_size,
      is_current: row.is_current,
      created_at: row.created_at,
      signed_url: signed,
    };
  });

// ---------- Admin ----------

export const listLegalDocs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { docType: LegalDocType }) =>
    z.object({ docType: docTypeSchema }).parse(data),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<(LegalDocSummary & { signed_url: string | null })[]> => {
      await assertAdmin(context.userId);
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: rows, error } = await supabaseAdmin
        .from("legal_documents")
        .select(
          "id, doc_type, version, original_filename, file_size, is_current, created_at, storage_path",
        )
        .eq("doc_type", data.docType)
        .order("version", { ascending: false });
      if (error) throw new Error(error.message);
      const out: (LegalDocSummary & { signed_url: string | null })[] = [];
      for (const r of rows ?? []) {
        const signed = await signOne(
          "legal-documents",
          r.storage_path,
          SIGNED_URL_TTL,
        );
        out.push({
          id: r.id,
          doc_type: r.doc_type as LegalDocType,
          version: r.version,
          original_filename: r.original_filename,
          file_size: r.file_size,
          is_current: r.is_current,
          created_at: r.created_at,
          signed_url: signed,
        });
      }
      return out;
    },
  );

export const uploadLegalDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: FormData) => {
    if (!(data instanceof FormData)) {
      throw new Error("Esperado FormData");
    }
    const docTypeRaw = data.get("docType");
    const file = data.get("file");
    const docType = docTypeSchema.parse(docTypeRaw);
    if (!(file instanceof File)) throw new Error("Arquivo ausente");
    if (file.size === 0) throw new Error("Arquivo vazio");
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("Arquivo excede 10 MB");
    }
    if (file.type && file.type !== "application/pdf") {
      throw new Error("Apenas arquivos PDF são aceitos");
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Apenas arquivos .pdf são aceitos");
    }
    return { docType, file };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { docType, file } = data;

    // Verify PDF magic bytes
    const buf = new Uint8Array(await file.arrayBuffer());
    const header = String.fromCharCode(...buf.slice(0, 5));
    if (header !== "%PDF-") {
      throw new Error("Arquivo não é um PDF válido");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Next version number
    const { data: latest } = await supabaseAdmin
      .from("legal_documents")
      .select("version")
      .eq("doc_type", docType)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (latest?.version ?? 0) + 1;
    const ts = Date.now();
    const storagePath = `${docType}/v${nextVersion}-${ts}.pdf`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("legal-documents")
      .upload(storagePath, buf, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) throw new Error(upErr.message);

    // Demote previous current then insert new as current
    const { error: demoteErr } = await supabaseAdmin
      .from("legal_documents")
      .update({ is_current: false })
      .eq("doc_type", docType)
      .eq("is_current", true);
    if (demoteErr) {
      await supabaseAdmin.storage.from("legal-documents").remove([storagePath]);
      throw new Error(demoteErr.message);
    }

    const { error: insErr } = await supabaseAdmin
      .from("legal_documents")
      .insert({
        doc_type: docType,
        version: nextVersion,
        storage_path: storagePath,
        original_filename: file.name,
        file_size: file.size,
        is_current: true,
        uploaded_by: context.userId,
      });
    if (insErr) {
      await supabaseAdmin.storage.from("legal-documents").remove([storagePath]);
      throw new Error(insErr.message);
    }

    return { ok: true, version: nextVersion };
  });

export const setCurrentLegalDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: target, error: fetchErr } = await supabaseAdmin
      .from("legal_documents")
      .select("id, doc_type")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!target) throw new Error("Documento não encontrado");

    const { error: demoteErr } = await supabaseAdmin
      .from("legal_documents")
      .update({ is_current: false })
      .eq("doc_type", target.doc_type)
      .eq("is_current", true);
    if (demoteErr) throw new Error(demoteErr.message);

    const { error: promoteErr } = await supabaseAdmin
      .from("legal_documents")
      .update({ is_current: true })
      .eq("id", data.id);
    if (promoteErr) throw new Error(promoteErr.message);

    return { ok: true };
  });

export const deleteLegalDocVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("legal_documents")
      .select("id, is_current, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!row) throw new Error("Documento não encontrado");
    if (row.is_current) {
      throw new Error(
        "Não é possível excluir a versão atual. Defina outra como atual primeiro.",
      );
    }
    const { error: delErr } = await supabaseAdmin
      .from("legal_documents")
      .delete()
      .eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    await supabaseAdmin.storage
      .from("legal-documents")
      .remove([row.storage_path]);
    return { ok: true };
  });