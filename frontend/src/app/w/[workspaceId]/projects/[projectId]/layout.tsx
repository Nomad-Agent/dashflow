"use client";

import { RequireAuth } from "@/components/require-auth";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  { href: "kanban", label: "Kanban" },
  { href: "list", label: "List" },
  { href: "calendar", label: "Calendar" },
] as const;

export default function ProjectViewsLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  const pathname = usePathname();
  const base = `/w/${params.workspaceId}/projects/${params.projectId}`;

  return (
    <RequireAuth>
    <div className="mx-auto max-w-6xl p-6">
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {tabs.map((t) => {
          const href = `${base}/${t.href}`;
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={t.href}
              href={href}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
        <Link
          href={`/w/${params.workspaceId}`}
          className="ml-auto text-sm text-neutral-500 underline"
        >
          Back to projects
        </Link>
      </nav>
      {children}
    </div>
    </RequireAuth>
  );
}
