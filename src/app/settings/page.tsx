import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="container container-narrow">
      <div className="spread" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: 28 }}>Settings</h1>
        <Link href={`/u/${user.handle}`} className="btn btn-ghost btn-sm">View profile</Link>
      </div>
      <SettingsForm
        initial={{
          handle: user.handle,
          displayName: user.displayName,
          bio: user.bio,
          homeCity: user.homeCity,
          avatarUrl: user.avatarUrl,
        }}
      />
    </main>
  );
}
