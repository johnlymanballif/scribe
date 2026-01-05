"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border/30 sticky top-0 z-50 bg-background">
      <div className="flex h-16 items-center px-6 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-2 h-6 bg-primary rounded-full" />
          <span className="text-lg font-medium tracking-tight">Scribe</span>
        </Link>
        
        <nav className="flex items-center ml-12 gap-8">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors relative ${
              pathname === "/"
                ? "text-primary"
                : "text-secondary hover:text-primary"
            }`}
          >
            Summary
            {pathname === "/" && (
              <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-primary" />
            )}
          </Link>
          <Link
            href="/contacts"
            className={`text-sm font-medium transition-colors relative ${
              pathname === "/contacts"
                ? "text-primary"
                : "text-secondary hover:text-primary"
            }`}
          >
            Contacts
            {pathname === "/contacts" && (
              <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-primary" />
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
