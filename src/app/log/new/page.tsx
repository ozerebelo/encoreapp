import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogForm } from "./LogForm";

export default async function NewLogPage({
  searchParams,
}: {
  searchParams: Promise<{ performance?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { performance } = await searchParams;
  return (
    <main className="container container-narrow">
      <h1 style={{ marginTop: 28, fontSize: 30 }}>Log a show</h1>
      <p className="muted" style={{ marginTop: -2 }}>
        Find the performance, then add your memory of it.
      </p>
      <LogForm initialPerformanceId={performance ?? null} />
    </main>
  );
}
