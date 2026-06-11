import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_admin/admin/instagram")({
  head: () => ({ meta: [{ title: "Instagram — RotainStay" }] }),
  component: InstagramAdmin,
});

type Post = {
  id: string;
  image_path: string;
  caption: string | null;
  post_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

function InstagramAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Post | null>(null);
  const [open, setOpen] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin", "instagram"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instagram_posts")
        .select("id, image_path, caption, post_url, sort_order, is_active, created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });

  // Get signed thumbnails
  useEffect(() => {
    if (posts.length === 0) return;
    let cancelled = false;
    (async () => {
      const paths = posts.map((p) => p.image_path).filter(Boolean);
      const { data } = await supabase.storage
        .from("instagram-photos")
        .createSignedUrls(paths, 60 * 30);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      for (const e of data) {
        if (e.path && e.signedUrl) map[e.path] = e.signedUrl;
      }
      setSignedUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [posts]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: Post) => {
    setEditing(p);
    setOpen(true);
  };

  const toggleActive = async (p: Post) => {
    const { error } = await supabase
      .from("instagram_posts")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) {
      toast.error("Erro ao atualizar.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin", "instagram"] });
    qc.invalidateQueries({ queryKey: ["instagram-posts"] });
  };

  const remove = async (p: Post) => {
    if (!confirm("Excluir este post?")) return;
    const { error } = await supabase.from("instagram_posts").delete().eq("id", p.id);
    if (error) {
      toast.error("Erro ao excluir.");
      return;
    }
    await supabase.storage.from("instagram-photos").remove([p.image_path]);
    toast.success("Post excluído.");
    qc.invalidateQueries({ queryKey: ["admin", "instagram"] });
    qc.invalidateQueries({ queryKey: ["instagram-posts"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>
            Posts do Instagram
          </h1>
          <p style={{ fontSize: 14, color: "#9A9890", marginTop: 4 }}>
            Cadastre as imagens exibidas no carrossel da home.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo post
        </Button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div className="p-6 text-sm text-text-muted">Carregando...</div>
        ) : posts.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">Nenhum post cadastrado.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#ECEBE7" }}>
            {posts.map((p) => (
              <div
                key={p.id}
                className="grid items-center gap-4 px-4 py-3"
                style={{
                  gridTemplateColumns: "72px 1fr 80px 100px 120px",
                }}
              >
                <div className="h-[72px] w-[72px] overflow-hidden rounded bg-muted">
                  {signedUrls[p.image_path] && (
                    <img
                      src={signedUrls[p.image_path]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className="line-clamp-2"
                    style={{ fontSize: 13, color: "#2F2E2A" }}
                  >
                    {p.caption || <span className="text-text-muted">Sem legenda</span>}
                  </div>
                  {p.post_url && (
                    <a
                      href={p.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir post
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#5C5B57" }}>#{p.sort_order}</div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={() => toggleActive(p)}
                  />
                  <span style={{ fontSize: 12, color: "#9A9890" }}>
                    {p.is_active ? "Ativo" : "Oculto"}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PostFormDialog
        open={open}
        onOpenChange={setOpen}
        post={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "instagram"] });
          qc.invalidateQueries({ queryKey: ["instagram-posts"] });
        }}
      />
    </div>
  );
}

function PostFormDialog({
  open,
  onOpenChange,
  post,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: Post | null;
  onSaved: () => void;
}) {
  const isEdit = !!post;
  const [caption, setCaption] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCaption(post?.caption ?? "");
    setPostUrl(post?.post_url ?? "");
    setSortOrder(post?.sort_order ?? 0);
    setIsActive(post?.is_active ?? true);
    setFile(null);
    setError(null);
  }, [open, post]);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED.includes(f.type)) {
      setError("Use JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Arquivo maior que 10MB.");
      return;
    }
    setFile(f);
  };

  const save = async () => {
    if (caption.length > 280) {
      setError("Legenda muito longa (máx. 280).");
      return;
    }
    if (postUrl) {
      try {
        new URL(postUrl);
      } catch {
        setError("URL do post inválida.");
        return;
      }
    }
    if (!isEdit && !file) {
      setError("Selecione uma imagem.");
      return;
    }

    setSaving(true);
    try {
      let image_path = post?.image_path ?? "";
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("instagram-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        // Remove old file on replace
        if (isEdit && post?.image_path) {
          await supabase.storage.from("instagram-photos").remove([post.image_path]);
        }
        image_path = path;
      }

      const payload = {
        image_path,
        caption: caption.trim() || null,
        post_url: postUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };

      if (isEdit && post) {
        const { error: upErr } = await supabase
          .from("instagram_posts")
          .update(payload)
          .eq("id", post.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("instagram_posts")
          .insert(payload);
        if (insErr) throw insErr;
      }

      toast.success(isEdit ? "Post atualizado." : "Post criado.");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] bg-white">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar post" : "Novo post"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Imagem {isEdit && "(opcional para manter atual)"}</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-text-muted">JPG, PNG ou WEBP até 10MB.</p>
          </div>
          <div>
            <Label>Legenda (opcional)</Label>
            <Textarea
              rows={2}
              maxLength={280}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Texto curto que aparece abaixo da imagem"
            />
          </div>
          <div>
            <Label>URL do post no Instagram (opcional)</Label>
            <Input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span style={{ fontSize: 13, color: "#5C5B57" }}>
                  {isActive ? "Ativo" : "Oculto"}
                </span>
              </div>
            </div>
          </div>
          {error && (
            <p className="text-sm" style={{ color: "#A63C2E" }}>
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}