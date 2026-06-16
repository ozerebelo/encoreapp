import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notify";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Encore — your live music memory",
  description:
    "Log the shows you've been to. Keep the stubs. Relive the memories.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const notifs = user ? await unreadCount(user.id) : 0;
  return (
    <html lang="en">
      <body>
        <NavBar
          user={user ? { handle: user.handle, displayName: user.displayName } : null}
          unread={notifs}
        />
        {children}
      </body>
    </html>
  );
}
