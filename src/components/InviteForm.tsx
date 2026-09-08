"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { GenerationJob } from "@prisma/client";
import type { FormState } from "@/app/actions";
import { setAttire } from "@/app/actions";
import { getTemplate, type Template } from "@/lib/templates";
import { getAttireCategory, getAttireLook } from "@/lib/attire";
import { slugify } from "@/lib/slug";
import { AttirePicker } from "./AttirePicker";
import { AttirePreview } from "./AttirePreview";
import { CardStylePicker } from "./CardStylePicker";
import { CinematicPicker } from "./CinematicPicker";
import { GenerationPanel } from "./GenerationPanel";
import { PhotoUpload, type UploadedPhoto } from "./PhotoUpload";
import { Button, ErrorNote, Field, Input, Textarea } from "./ui";

export type InviteDraft = {
  id?: string;
  slug?: string;
  templateId: string;
  cardStyle: string;
  attireBrideId: string;
  attireGroomId: string;
  regenerationCount: number;
  maxRegenerations: number;
  partnerOne: string;
  partnerTwo: string;
  eyebrow: string;
  taglineLead: string;
  taglineSub: string;
  arrivalNote: string;
  blessing: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  mapsUrl: string;
  closingNote: string;
  published: boolean;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function InviteForm({
  action,
  draft,
  templates,
  submitLabel,
  existingPhotos,
  initialJob,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  draft: InviteDraft;
  templates: Template[];
  submitLabel: string;
  /** Only present once the invite exists — photos need an inviteId to attach to. */
  existingPhotos?: { bride: UploadedPhoto[]; groom: UploadedPhoto[] };
  initialJob?: GenerationJob | null;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [templateId, setTemplateId] = useState(draft.templateId);
  const [cardStyle, setCardStyle] = useState(draft.cardStyle);
  const [attireBrideId, setAttireBrideId] = useState(draft.attireBrideId);
  const [attireGroomId, setAttireGroomId] = useState(draft.attireGroomId);
  const [bridePhotos, setBridePhotos] = useState<UploadedPhoto[]>(existingPhotos?.bride ?? []);
  const [groomPhotos, setGroomPhotos] = useState<UploadedPhoto[]>(existingPhotos?.groom ?? []);
  const [names, setNames] = useState({ one: draft.partnerOne, two: draft.partnerTwo });
  const [slug, setSlug] = useState(draft.slug ?? "");

  const attireCategory = getAttireCategory(templateId);
  const brideLook = getAttireLook(templateId, "bride", attireBrideId);
  const groomLook = getAttireLook(templateId, "groom", attireGroomId);

  // Attire is scoped to the cinematic's category — switching templates can
  // leave a look selected that no longer exists in the new one.
  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const nextCategory = getAttireCategory(id);
    if (!nextCategory.bride.some((look) => look.id === attireBrideId)) setAttireBrideId("");
    if (!nextCategory.groom.some((look) => look.id === attireGroomId)) setAttireGroomId("");
  }

  // Persists immediately, like photo uploads — otherwise "Generate last
  // frame" (which reads the invite straight from the database) runs
  // before the big form's own Save button has ever saved this choice.
  function handleAttireChange(role: "bride" | "groom", lookId: string) {
    if (role === "bride") setAttireBrideId(lookId);
    else setAttireGroomId(lookId);
    if (draft.id) void setAttire(draft.id, role, lookId);
  }

  // Until the couple types their own link name, mirror it from their names.
  const autoSlug = slugify(`${names.one}-${names.two}`);
  const effectiveSlug = slug || autoSlug;

  // Card preview reflects the couple's live-typed names plus whatever was
  // last saved for everything else — accurate enough for "which layout do I
  // want" without lifting every field on the page to controlled state.
  const previewContent = {
    partnerOne: names.one || "Partner One",
    partnerTwo: names.two || "Partner Two",
    eyebrow: draft.eyebrow,
    taglineLead: draft.taglineLead,
    taglineSub: draft.taglineSub,
    arrivalNote: draft.arrivalNote,
    blessing: draft.blessing,
    eventDate: draft.eventDate || "Your wedding date",
    eventTime: draft.eventTime || "Ceremony times",
    venueName: draft.venueName || "Your venue",
    mapsUrl: draft.mapsUrl || null,
    closingNote: draft.closingNote,
  };

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-12">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <ErrorNote>{state?.error}</ErrorNote>

      <section className="flex flex-col gap-6">
        <SectionHeading title="The couple" note="Shown over the film and on the card." />
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="First name">
            <Input
              name="partnerOne"
              required
              value={names.one}
              onChange={(e) => setNames((n) => ({ ...n, one: e.target.value }))}
            />
          </Field>
          <Field label="Second name">
            <Input
              name="partnerTwo"
              required
              value={names.two}
              onChange={(e) => setNames((n) => ({ ...n, two: e.target.value }))}
            />
          </Field>
        </div>

        <Field
          label="Link name"
          hint={`Your invitation will live at /i/${effectiveSlug || "your-names"}`}
        >
          <Input
            name="slug"
            value={slug}
            placeholder={autoSlug || "your-names"}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Cinematic"
          note="The film your guests scroll through. Tap Preview to watch before you choose."
        />
        <CinematicPicker templates={templates} value={templateId} onChange={handleTemplateChange} />
        <input type="hidden" name="templateId" value={templateId} />
      </section>

      {draft.id ? (
        <>
          <section className="flex flex-col gap-6">
            <SectionHeading
              title="Bride & groom photos"
              note="2–3 clear, front-facing photos each. Sunglasses, group shots, and heavy filters get rejected at generation time."
            />
            <div className="grid gap-8 sm:grid-cols-2">
              <PhotoUpload
                inviteId={draft.id}
                role="BRIDE"
                label="Bride"
                hint="Used to personalize the bride's face in your film."
                initialPhotos={bridePhotos}
                onChange={setBridePhotos}
              />
              <PhotoUpload
                inviteId={draft.id}
                role="GROOM"
                label="Groom"
                hint="Used to personalize the groom's face in your film."
                initialPhotos={groomPhotos}
                onChange={setGroomPhotos}
              />
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <SectionHeading
              title="Attire"
              note={`Looks styled for ${getTemplate(templateId).name}. Choosing a different cinematic changes the options here.`}
            />
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-3 text-sm text-[#5a3f32]">Bride</p>
                <AttirePicker
                  label="Bride attire"
                  looks={attireCategory.bride}
                  value={attireBrideId || null}
                  onChange={(id) => handleAttireChange("bride", id)}
                />
              </div>
              <div>
                <p className="mb-3 text-sm text-[#5a3f32]">Groom</p>
                <AttirePicker
                  label="Groom attire"
                  looks={attireCategory.groom}
                  value={attireGroomId || null}
                  onChange={(id) => handleAttireChange("groom", id)}
                />
              </div>
            </div>
            <input type="hidden" name="attireBrideId" value={attireBrideId} />
            <input type="hidden" name="attireGroomId" value={attireGroomId} />
          </section>

          <section className="flex flex-col gap-6">
            <SectionHeading
              title="Preview"
              note="A mockup of your selections, so you can check them before generating anything."
            />
            <AttirePreview
              template={getTemplate(templateId)}
              brideLook={brideLook}
              groomLook={groomLook}
              bridePhoto={bridePhotos[0]?.storageUrl ?? null}
              groomPhoto={groomPhotos[0]?.storageUrl ?? null}
            />
          </section>

          <section className="flex flex-col gap-6">
            <SectionHeading
              title="Generate your film"
              note="Composes your last frame first for review, then generates the film once you approve it."
            />
            <GenerationPanel
              inviteId={draft.id}
              initialJob={initialJob ?? null}
              readyToStart={Boolean(attireBrideId && attireGroomId && bridePhotos.length > 0 && groomPhotos.length > 0)}
              regenerationCount={draft.regenerationCount}
              maxRegenerations={draft.maxRegenerations}
            />
          </section>
        </>
      ) : (
        <p className="-mt-6 text-xs text-[#8a6b5c]">
          Save your invitation to add bride &amp; groom photos and attire next.
        </p>
      )}

      <section className="flex flex-col gap-6">
        <SectionHeading title="Details" note="The three cards on your invitation." />
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Date">
            <Input name="eventDate" required defaultValue={draft.eventDate} placeholder="November 14, 2026" />
          </Field>
          <Field label="Venue">
            <Input name="venueName" required defaultValue={draft.venueName} placeholder="SP Grand Palace" />
          </Field>
        </div>
        <Field label="Time & ceremony" hint="Line breaks are preserved on the card.">
          <Textarea
            name="eventTime"
            required
            defaultValue={draft.eventTime}
            placeholder={"Reception: 6:30 PM\nMarriage: 9:00 AM - 10:00 AM"}
          />
        </Field>
        <Field label="Google Maps link" hint="Optional. Paste a full share URL.">
          <Input name="mapsUrl" type="url" defaultValue={draft.mapsUrl} placeholder="https://…" />
        </Field>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading title="Wording" note="Leave any of these blank to use the default." />
        <Field label="Opening line">
          <Input name="eyebrow" defaultValue={draft.eyebrow} />
        </Field>
        <Field label="Mid-film line">
          <Input name="taglineLead" defaultValue={draft.taglineLead} />
        </Field>
        <Field label="Mid-film subtitle">
          <Input name="taglineSub" defaultValue={draft.taglineSub} />
        </Field>
        <Field label="Arrival heading">
          <Input name="arrivalNote" defaultValue={draft.arrivalNote} />
        </Field>
        <Field label="Blessing">
          <Textarea name="blessing" defaultValue={draft.blessing} />
        </Field>
        <Field label="Closing line">
          <Input name="closingNote" defaultValue={draft.closingNote} />
        </Field>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Invitation card"
          note="The details card guests arrive at. Tap Preview to see it in your chosen cinematic's colors."
        />
        <CardStylePicker
          value={cardStyle}
          onChange={setCardStyle}
          content={previewContent}
          template={getTemplate(templateId)}
        />
        <input type="hidden" name="cardStyle" value={cardStyle} />
      </section>

      <section className="flex flex-col gap-6 border-t border-[#c9956a]/25 pt-10">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={draft.published}
            className="h-4 w-4 accent-[#2b1710]"
          />
          <span className="text-sm text-[#5a3f32]">
            Published — anyone with the link can view it
          </span>
        </label>
        <div>
          <Submit label={submitLabel} />
        </div>
      </section>
    </form>
  );
}

function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-2xl" style={{ fontFamily: "Georgia, serif" }}>
        {title}
      </h2>
      <p className="mt-1 text-sm text-[#6b4c3d]">{note}</p>
    </div>
  );
}
