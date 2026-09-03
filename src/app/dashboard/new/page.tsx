import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { createInvite } from "@/app/actions";
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from "@/lib/templates";
import { InviteForm } from "@/components/InviteForm";
import { Brand, Shell } from "@/components/ui";

export default async function NewInvitePage() {
  if (!(await currentUser())) redirect("/login");

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <Brand />
        <Link href="/dashboard" className="text-xs uppercase tracking-[0.24em] text-[#9b5f36]">
          Back
        </Link>
      </header>

      <h1 className="mt-16 text-4xl" style={{ fontFamily: "Georgia, serif" }}>
        New invitation
      </h1>

      <InviteForm
        action={createInvite}
        templates={TEMPLATES}
        submitLabel="Create invitation"
        draft={{
          templateId: DEFAULT_TEMPLATE_ID,
          partnerOne: "",
          partnerTwo: "",
          eyebrow: "The beginning of a sacred day",
          taglineLead: "Two families gather, one story begins.",
          taglineSub: "Scroll through the cinematic entrance and arrive at the invitation.",
          arrivalNote: "Step into the celebration",
          blessing:
            "With the blessings of our elders, we joyfully invite you to witness and celebrate our union.",
          eventDate: "",
          eventTime: "",
          venueName: "",
          mapsUrl: "",
          closingNote: "Your presence is our greatest blessing",
          published: true,
        }}
      />
    </Shell>
  );
}
