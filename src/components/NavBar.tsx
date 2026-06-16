"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchBox } from "./SearchBox";

export function NavBar({
  user,
  unread = 0,
}: {
  user: { handle: string; displayName: string } | null;
  unread?: number;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href={user ? "/feed" : "/"} className="brand">
          ◉ Encore
        </Link>
        {user && <SearchBox />}
        <div className="nav-links">
          {user ? (
            <>
              <Link href="/feed">Feed</Link>
              <Link href="/upcoming">Upcoming</Link>
              <Link href="/lists">Lists</Link>
              <Link href="/discover">Discover</Link>
              <Link href={`/u/${user.handle}`}>Profile</Link>
              <Link href="/notifications" className="nav-bell" aria-label="Notifications">
                🔔
                {unread > 0 && <span className="nav-badge">{unread > 9 ? "9+" : unread}</span>}
              </Link>
              <Link href="/log/new" className="btn btn-primary btn-sm">
                + Log a show
              </Link>
              <button onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
