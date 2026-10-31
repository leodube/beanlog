import { eq, sql } from "drizzle-orm";
import { data } from "react-router";

import { db } from "~/db/client.server";
import { bags, coffees, photos } from "~/db/schema.server";

// The browser sends an already-resized JPEG (about 2560 px, a few hundred KB)
// and a thumbnail. These limits leave room for a detailed photo while
// refusing anything that isn't what the form produces.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_THUMB_BYTES = 512 * 1024;
/** Whole request, checked before the body is read. */
const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + MAX_THUMB_BYTES + 256 * 1024;

export type PhotoChange =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "set"; image: Buffer; thumb: Buffer };

/**
 * Read a form that may carry a photo. Refuses an oversized body up front
 * (from Content-Length) so a huge upload is never buffered into memory.
 */
export async function readUploadForm(request: Request) {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > MAX_REQUEST_BYTES)
    throw data("That photo is too large.", { status: 413 });
  return request.formData();
}

const isJpeg = (b: Buffer) =>
  b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** What the form asks for: keep the current photo, remove it, or set a new one. */
export async function photoChange(
  form: FormData,
): Promise<{ ok: true; change: PhotoChange } | { ok: false; error: string }> {
  const image = form.get("photo");
  const thumb = form.get("photoThumb");
  if (image instanceof File && image.size > 0) {
    if (!(thumb instanceof File) || thumb.size === 0)
      return { ok: false, error: "The photo didn't upload fully. Try again." };
    if (image.size > MAX_IMAGE_BYTES || thumb.size > MAX_THUMB_BYTES)
      return { ok: false, error: "That photo is too large." };
    const [img, th] = await Promise.all([
      image.arrayBuffer().then((b) => Buffer.from(b)),
      thumb.arrayBuffer().then((b) => Buffer.from(b)),
    ]);
    if (!isJpeg(img) || !isJpeg(th))
      return { ok: false, error: "That file isn't a photo the app can use." };
    return { ok: true, change: { kind: "set", image: img, thumb: th } };
  }
  if (form.get("photoRemove") === "1")
    return { ok: true, change: { kind: "remove" } };
  return { ok: true, change: { kind: "keep" } };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Apply a photo change to a bag. Pass `tx` to make it part of a larger save. */
export async function applyPhotoChange(
  bagId: number,
  change: PhotoChange,
  tx: Tx | typeof db = db,
) {
  if (change.kind === "keep") return;
  await tx.delete(photos).where(eq(photos.bagId, bagId));
  if (change.kind === "set")
    await tx
      .insert(photos)
      .values({ bagId, image: change.image, thumb: change.thumb });
}

export async function getPhotoBytes(id: number, size: "full" | "thumb") {
  const [row] = await db
    .select({ bytes: size === "thumb" ? photos.thumb : photos.image })
    .from(photos)
    .where(eq(photos.id, id));
  return row?.bytes ?? null;
}

// ---------- Which photo to show ----------
// Correlated subqueries for a select that includes the coffees or bags table.
// The outer id is written as "coffees".id / "bags".id on purpose: Drizzle
// leaves a column unqualified when a select has one table, and a bare "id"
// inside the subquery would silently mean the photo's own id.

/** The photo of the coffee's most recently roasted bag that has one. */
export const coffeePhotoId = () =>
  sql<number | null>`(
    select p.id from ${photos} p join ${bags} b on b.id = p.bag_id
    where b.coffee_id = ${coffees}.id
    order by b.roasted_on desc, p.id desc limit 1)`;

/** A bag's own photo. */
export const bagPhotoId = () =>
  sql<
    number | null
  >`(select p.id from ${photos} p where p.bag_id = ${bags}.id)`;
