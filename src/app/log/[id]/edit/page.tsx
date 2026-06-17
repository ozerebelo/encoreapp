import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toNumber } from "@/lib/format";
import { EditLogForm } from "./EditLogForm";

export default async function EditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { id } = await params;

  const log = await prisma.log.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: "asc" } },
      companions: { include: { user: { select: { handle: true, displayName: true, avatarUrl: true } } } },
      performance: { include: { artist: { select: { name: true } }, event: { select: { name: true, venue: { select: { name: true } } } } } },
    },
  });
  if (!log) notFound();
  if (log.userId !== me.id) redirect(`/show/${log.performanceId}`);

  return (
    <main className="container container-narrow">
      <Link href={`/show/${log.performanceId}`} className="faint" style={{ fontSize: 13 }}>← back to show</Link>
      <h1 style={{ fontSize: 28, marginTop: 12 }}>Edit log</h1>
      <p className="muted" style={{ marginTop: -2 }}>
        {log.performance.artist.name} · {log.performance.event.venue?.name ?? log.performance.event.name}
      </p>
      <EditLogForm
        logId={log.id}
        handle={me.handle}
        initial={{
          rating: toNumber(log.rating) ?? 0,
          standing: log.standing ?? "",
          attendedWith: log.attendedWith ?? "",
          review: log.review ?? "",
          isFavorite: log.isFavorite,
          stubImageUrl: log.stubImageUrl,
          photos: log.photos.map((p) => p.url),
          companions: log.companions.map((c) => c.user),
        }}
      />
    </main>
  );
}
