import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/templates";
import { CinematicInvite } from "@/components/invite/CinematicInvite";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.invite.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const invite = await load(slug);
  if (!invite) return { title: "Invitation not found" };

  const names = `${invite.partnerOne} & ${invite.partnerTwo}`;
  return {
    title: `${names} — Wedding Invitation`,
    description: `${invite.eventDate} · ${invite.venueName}`,
    openGraph: {
      title: `${names} — Wedding Invitation`,
      description: `${invite.eventDate} · ${invite.venueName}`,
      type: "website",
    },
    // Invitations are private by nature: shared by link, not found by search.
    robots: { index: false, follow: false },
  };
}

export default async function InvitePage({ params }: Params) {
  const { slug } = await params;
  const invite = await load(slug);
  if (!invite) notFound();

  const template = getTemplate(invite.templateId);
  const base = `/templates/${template.id}`;

  // A completed generation replaces the static template film for this
  // invite — same player, same encoding contract either way, so nothing
  // else about CinematicInvite needs to know which source it's playing.
  const usingGeneratedFilm = Boolean(invite.generatedVideoUrl);
  const videoSrc = invite.generatedVideoUrl ?? `${base}/video.mp4`;
  const posterSrc = invite.posterUrl ?? null;

  return (
    <main className="relative w-full text-white">
      <CinematicInvite
        template={template}
        cardStyle={invite.cardStyle}
        videoSrc={videoSrc}
        videoMobileSrc={usingGeneratedFilm ? null : `${base}/video-mobile.mp4`}
        posterSrc={posterSrc}
        audioSrc={`${base}/music.mp3`}
        content={{
          partnerOne: invite.partnerOne,
          partnerTwo: invite.partnerTwo,
          eyebrow: invite.eyebrow,
          taglineLead: invite.taglineLead,
          taglineSub: invite.taglineSub,
          arrivalNote: invite.arrivalNote,
          blessing: invite.blessing,
          eventDate: invite.eventDate,
          eventTime: invite.eventTime,
          venueName: invite.venueName,
          mapsUrl: invite.mapsUrl,
          closingNote: invite.closingNote,
        }}
      />
    </main>
  );
}
