"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, currentUser, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/slug";
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from "@/lib/templates";
import { CARD_STYLES, DEFAULT_CARD_STYLE_ID } from "@/lib/cardStyles";
import { getAttireCategory } from "@/lib/attire";
import * as generation from "@/lib/generation/jobs";
import type { GenerationJob, PhotoRole } from "@prisma/client";

export type FormState = { error?: string } | undefined;

/* ---------------- auth ---------------- */

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { email, password } = parsed.data;
  const name = String(formData.get("name") ?? "").trim() || null;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "An account already exists for that email." };
  }

  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Same message either way, so this cannot be used to enumerate accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

/* ---------------- invites ---------------- */

const inviteSchema = z
  .object({
    partnerOne: z.string().trim().min(1, "Add the first name.").max(60),
    partnerTwo: z.string().trim().min(1, "Add the second name.").max(60),
    templateId: z.string().refine((v) => TEMPLATES.some((t) => t.id === v), "Pick a template."),
    cardStyle: z.string().refine((v) => CARD_STYLES.some((c) => c.id === v), "Pick a card design."),
    attireBrideId: z.string(),
    attireGroomId: z.string(),
    eventDate: z.string().trim().min(1, "Add the date.").max(120),
    eventTime: z.string().trim().min(1, "Add the ceremony times.").max(240),
    venueName: z.string().trim().min(1, "Add the venue.").max(160),
    mapsUrl: z.string().trim().url("Maps link must be a full URL.").or(z.literal("")),
    eyebrow: z.string().trim().max(120),
    taglineLead: z.string().trim().max(200),
    taglineSub: z.string().trim().max(300),
    arrivalNote: z.string().trim().max(120),
    blessing: z.string().trim().max(500),
    closingNote: z.string().trim().max(120),
    published: z.coerce.boolean(),
  })
  .superRefine((data, ctx) => {
    // Attire is optional (couples may fill this in after the initial save),
    // but if set it must be a real look from that template's own catalog.
    const category = getAttireCategory(data.templateId);
    if (data.attireBrideId && !category.bride.some((l) => l.id === data.attireBrideId)) {
      ctx.addIssue({ code: "custom", message: "Pick a valid bride attire.", path: ["attireBrideId"] });
    }
    if (data.attireGroomId && !category.groom.some((l) => l.id === data.attireGroomId)) {
      ctx.addIssue({ code: "custom", message: "Pick a valid groom attire.", path: ["attireGroomId"] });
    }
  });

function readInvite(formData: FormData) {
  return inviteSchema.safeParse({
    partnerOne: formData.get("partnerOne"),
    partnerTwo: formData.get("partnerTwo"),
    templateId: formData.get("templateId") ?? DEFAULT_TEMPLATE_ID,
    cardStyle: formData.get("cardStyle") ?? DEFAULT_CARD_STYLE_ID,
    attireBrideId: formData.get("attireBrideId") ?? "",
    attireGroomId: formData.get("attireGroomId") ?? "",
    eventDate: formData.get("eventDate"),
    eventTime: formData.get("eventTime"),
    venueName: formData.get("venueName"),
    mapsUrl: formData.get("mapsUrl") ?? "",
    eyebrow: formData.get("eyebrow") ?? "",
    taglineLead: formData.get("taglineLead") ?? "",
    taglineSub: formData.get("taglineSub") ?? "",
    arrivalNote: formData.get("arrivalNote") ?? "",
    blessing: formData.get("blessing") ?? "",
    closingNote: formData.get("closingNote") ?? "",
    published: formData.get("published") === "on",
  });
}

export async function createInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = readInvite(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const requested = slugify(String(formData.get("slug") ?? ""));
  const base = requested || `${data.partnerOne}-${data.partnerTwo}`;

  if (requested && !isValidSlug(requested)) {
    return { error: "That link name is reserved or invalid. Use letters, numbers and hyphens." };
  }

  const slug = await uniqueSlug(base, async (candidate) =>
    Boolean(await db.invite.findUnique({ where: { slug: candidate } })),
  );

  const invite = await db.invite.create({
    data: {
      ...data,
      mapsUrl: data.mapsUrl || null,
      attireBrideId: data.attireBrideId || null,
      attireGroomId: data.attireGroomId || null,
      slug,
      userId: user.id,
      ...emptyToDefault(data),
    },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/${invite.id}`);
}

export async function updateInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  // Scope by userId so one account can never edit another's invitation.
  const existing = await db.invite.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Invitation not found." };

  const parsed = readInvite(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const requested = slugify(String(formData.get("slug") ?? ""));
  let slug = existing.slug;
  if (requested && requested !== existing.slug) {
    if (!isValidSlug(requested)) {
      return { error: "That link name is reserved or invalid." };
    }
    if (await db.invite.findUnique({ where: { slug: requested } })) {
      return { error: "That link name is already taken." };
    }
    slug = requested;
  }

  await db.invite.update({
    where: { id: existing.id },
    data: {
      ...data,
      mapsUrl: data.mapsUrl || null,
      attireBrideId: data.attireBrideId || null,
      attireGroomId: data.attireGroomId || null,
      slug,
      ...emptyToDefault(data),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/i/${slug}`);
  redirect(`/dashboard/${existing.id}?saved=1`);
}

export async function deleteInvite(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  await db.invite.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/* ---------------- face photos ----------------
 *
 * Stored as data URLs directly on FacePhoto.storageUrl for now. This is a
 * deliberate placeholder: the real pipeline needs an object-storage
 * provider (Vercel Blob / S3 / R2 — not yet chosen), and swapping it in
 * later only touches this file, not the schema or the upload UI, since
 * storageUrl is just an opaque string either way. Not appropriate at real
 * scale — fine for building and demoing the upload flow now.
 */

const MAX_PHOTOS_PER_ROLE = 3;
const MIN_PHOTO_DIMENSION = 400;
const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024 * 1.4; // ~8MB image, base64-inflated

export async function addFacePhoto(
  inviteId: string,
  role: PhotoRole,
  dataUrl: string,
  width: number,
  height: number,
): Promise<{ error?: string; photo?: { id: string; storageUrl: string; role: PhotoRole } }> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const invite = await db.invite.findFirst({ where: { id: inviteId, userId: user.id } });
  if (!invite) return { error: "Invitation not found." };

  if (!dataUrl.startsWith("data:image/")) return { error: "That doesn't look like an image." };
  if (dataUrl.length > MAX_DATA_URL_LENGTH) return { error: "That photo is too large." };
  if (width < MIN_PHOTO_DIMENSION || height < MIN_PHOTO_DIMENSION) {
    return { error: `Photo must be at least ${MIN_PHOTO_DIMENSION}×${MIN_PHOTO_DIMENSION}px.` };
  }

  const count = await db.facePhoto.count({ where: { inviteId, role } });
  if (count >= MAX_PHOTOS_PER_ROLE) {
    return { error: `You can upload up to ${MAX_PHOTOS_PER_ROLE} photos.` };
  }

  const photo = await db.facePhoto.create({
    data: { inviteId, role, storageUrl: dataUrl, width, height },
  });

  revalidatePath(`/dashboard/${inviteId}`);
  return { photo: { id: photo.id, storageUrl: photo.storageUrl, role: photo.role } };
}

export async function removeFacePhoto(photoId: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  // Scope by userId through the relation so one account can never delete
  // another's photo by guessing an id.
  const photo = await db.facePhoto.findFirst({
    where: { id: photoId, invite: { userId: user.id } },
  });
  if (!photo) return { error: "Photo not found." };

  await db.facePhoto.delete({ where: { id: photoId } });
  revalidatePath(`/dashboard/${photo.inviteId}`);
  return {};
}

/**
 * Persists attire immediately, like photo uploads already do — the main
 * form's "Save changes" only covers the rest of the fields. Without this,
 * picking attire and clicking "Generate last frame" (which reads the
 * invite straight from the database) silently sees no attire at all,
 * since the big form hadn't been submitted yet.
 */
export async function setAttire(
  inviteId: string,
  role: "bride" | "groom",
  lookId: string,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const invite = await db.invite.findFirst({ where: { id: inviteId, userId: user.id } });
  if (!invite) return { error: "Invitation not found." };

  const category = getAttireCategory(invite.templateId);
  if (!category[role].some((look) => look.id === lookId)) {
    return { error: "Not a valid look for this cinematic." };
  }

  await db.invite.update({
    where: { id: inviteId },
    data: role === "bride" ? { attireBrideId: lookId } : { attireGroomId: lookId },
  });
  revalidatePath(`/dashboard/${inviteId}`);
  return {};
}

/* ---------------- generation pipeline ----------------
 *
 * Ownership is checked here (invite/job must belong to the signed-in
 * user); the actual state-machine work lives in src/lib/generation/jobs.ts
 * so it can be unit-tested and called from a future cron/webhook without
 * dragging auth through it.
 */

type GenerationResult = { error?: string; job?: GenerationJob };

async function ownedJob(jobId: string, userId: string) {
  return db.generationJob.findFirst({ where: { id: jobId, invite: { userId } } });
}

export async function startGeneration(inviteId: string): Promise<GenerationResult> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const invite = await db.invite.findFirst({ where: { id: inviteId, userId: user.id } });
  if (!invite) return { error: "Invitation not found." };

  const result = await generation.startGeneration(inviteId);
  if (result.job) revalidatePath(`/dashboard/${inviteId}`);
  return result;
}

export async function pollGeneration(jobId: string): Promise<GenerationResult> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const job = await ownedJob(jobId, user.id);
  if (!job) return { error: "Job not found." };

  const result = await generation.pollGeneration(jobId);
  if (result.job?.status === "READY") {
    revalidatePath(`/dashboard/${job.inviteId}`);
    revalidatePath(`/i/${(await db.invite.findUnique({ where: { id: job.inviteId } }))?.slug ?? ""}`);
  }
  return result;
}

export async function approveLastFrame(jobId: string): Promise<GenerationResult> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const job = await ownedJob(jobId, user.id);
  if (!job) return { error: "Job not found." };

  return generation.approveLastFrame(jobId);
}

export async function regenerateLastFrame(inviteId: string): Promise<GenerationResult> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const invite = await db.invite.findFirst({ where: { id: inviteId, userId: user.id } });
  if (!invite) return { error: "Invitation not found." };

  return generation.regenerateLastFrame(inviteId);
}

export async function retryGenerationJob(jobId: string): Promise<GenerationResult> {
  const user = await currentUser();
  if (!user) return { error: "Sign in required." };

  const job = await ownedJob(jobId, user.id);
  if (!job) return { error: "Job not found." };

  return generation.retryFailedJob(jobId);
}

/**
 * Optional copy fields fall back to the schema defaults when left blank, so a
 * couple can clear a field without ending up with an empty line on the page.
 */
const COPY_DEFAULTS = {
  eyebrow: "The beginning of a sacred day",
  taglineLead: "Two families gather, one story begins.",
  taglineSub: "Scroll through the cinematic entrance and arrive at the invitation.",
  arrivalNote: "Step into the celebration",
  blessing:
    "With the blessings of our elders, we joyfully invite you to witness and celebrate our union.",
  closingNote: "Your presence is our greatest blessing",
} as const;

function emptyToDefault(data: z.infer<typeof inviteSchema>) {
  const out: Partial<Record<keyof typeof COPY_DEFAULTS, string>> = {};
  for (const key of Object.keys(COPY_DEFAULTS) as (keyof typeof COPY_DEFAULTS)[]) {
    out[key] = data[key] || COPY_DEFAULTS[key];
  }
  return out;
}
