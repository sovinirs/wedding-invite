"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
import type { Template } from "@/lib/templates";
import { slugify } from "@/lib/slug";
import { Button, ErrorNote, Field, Input, Textarea } from "./ui";

export type InviteDraft = {
  id?: string;
  slug?: string;
  templateId: string;
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
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  draft: InviteDraft;
  templates: Template[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [templateId, setTemplateId] = useState(draft.templateId);
  const [names, setNames] = useState({ one: draft.partnerOne, two: draft.partnerTwo });
  const [slug, setSlug] = useState(draft.slug ?? "");

  // Until the couple types their own link name, mirror it from their names.
  const autoSlug = slugify(`${names.one}-${names.two}`);
  const effectiveSlug = slug || autoSlug;

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
        <SectionHeading title="Cinematic" note="The film your guests scroll through." />
        <div className="grid gap-4 md:grid-cols-3">
          {templates.map((t) => {
            const selected = t.id === templateId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={`rounded-sm border p-5 text-left transition-colors ${
                  selected
                    ? "border-[#2b1710] bg-white"
                    : "border-[#c9956a]/25 bg-white/60 hover:bg-white"
                }`}
              >
                <span
                  className="block text-lg"
                  style={{ fontFamily: "Georgia, serif", color: t.palette.ink }}
                >
                  {t.name}
                </span>
                <span className="mt-2 block text-xs leading-5 text-[#6b4c3d]">
                  {t.description}
                </span>
                <span
                  className="mt-4 block h-1 w-12 rounded-full"
                  style={{ background: selected ? t.palette.ink : t.palette.soft }}
                />
              </button>
            );
          })}
        </div>
        <input type="hidden" name="templateId" value={templateId} />
      </section>

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
