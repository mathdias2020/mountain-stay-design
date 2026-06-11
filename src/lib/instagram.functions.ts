import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";

export type InstagramPostPublic = {
  id: string;
  image_url: string;
  caption: string | null;
  post_url: string | null;
};

const SIGNED_TTL_SECONDS = 60 * 60; // 1h

export const getInstagramPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ posts: InstagramPostPublic[] }> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );

    const { data: rows, error } = await supabaseAdmin
      .from("instagram_posts")
      .select("id, image_path, caption, post_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { posts: [] };

    const paths = rows.map((r) => r.image_path).filter(Boolean);
    const { data: signed } = await supabaseAdmin.storage
      .from("instagram-photos")
      .createSignedUrls(paths, SIGNED_TTL_SECONDS);

    const urlByPath = new Map<string, string>();
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) {
        urlByPath.set(entry.path, entry.signedUrl);
      }
    }

    const posts: InstagramPostPublic[] = rows
      .map((r) => ({
        id: r.id,
        image_url: urlByPath.get(r.image_path) ?? "",
        caption: r.caption,
        post_url: r.post_url,
      }))
      .filter((p) => p.image_url);

    return { posts };
  },
);