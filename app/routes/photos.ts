import { data } from "react-router";

import { getPhotoBytes } from "~/lib/photos.server";
import type { Route } from "./+types/photos";

// Resource route: the photo's bytes. Signed-in only (it sits under _app).
// A photo never changes once stored (replacing one makes a new id), so the
// browser can keep it for a year without asking again.
export async function loader({ params, request }: Route.LoaderArgs) {
  const id = Number(params.photoId);
  const size = params.size;
  if (!Number.isInteger(id) || id <= 0 || (size !== "full" && size !== "thumb"))
    throw data("Not found", { status: 404 });

  const etag = `"photo-${id}-${size}"`;
  const headers = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, max-age=31536000, immutable",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("If-None-Match") === etag)
    return new Response(null, { status: 304, headers });

  const bytes = await getPhotoBytes(id, size);
  if (!bytes) throw data("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), { headers });
}
