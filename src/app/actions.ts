"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, currentUser, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/slug";
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from "@/lib/templates";

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

const inviteSchema = z.object({
  partnerOne: z.string().trim().min(1, "Add the first name.").max(60),
  partnerTwo: z.string().trim().min(1, "Add the second name.").max(60),
  templateId: z.string().refine((v) => TEMPLATES.some((t) => t.id === v), "Pick a template."),
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
});

function readInvite(formData: FormData) {
  return inviteSchema.safeParse({
    partnerOne: formData.get("partnerOne"),
    partnerTwo: formData.get("partnerTwo"),
    templateId: formData.get("templateId") ?? DEFAULT_TEMPLATE_ID,
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
    data: { ...data, mapsUrl: data.mapsUrl || null, slug, ...emptyToDefault(data) },
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
