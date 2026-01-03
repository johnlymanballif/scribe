"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Scribe" },
    { href: "/contacts", label: "Contacts" },
  ];

  return (
    <nav className="border-b border-border bg-background relative z-30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-8 h-14">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "text-primary font-medium"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

