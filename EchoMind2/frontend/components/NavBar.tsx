"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { AuthAction } from "./AuthAction";

const LINKS = [
  { href: "/ask", label: "Ask" },
  { href: "/video-twin", label: "Video Twin" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-gradient-warm text-base font-semibold tracking-tight">
            EchoMind
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {data?.user?.email ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground-muted sm:flex">
              <Settings className="h-3.5 w-3.5 text-accent-soft" />
              {data.user.email}
            </div>
          ) : null}
          <AuthAction callbackUrl="/ask" variant="secondary" />
        </div>
      </nav>
    </header>
  );
}
