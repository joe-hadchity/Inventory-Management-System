"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/team", label: "Team Management" },
  { href: "/admin/categories", label: "Category Management" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-7xl gap-2 px-6 pb-6">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
