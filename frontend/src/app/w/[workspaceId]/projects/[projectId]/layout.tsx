"use client";

import { useAuth } from "@/components/auth-provider";
import { RequireAuth } from "@/components/require-auth";
import { WsClient } from "@/lib/ws-client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const tabs = [
  { href: "kanban", label: "Kanban" },
  { href: "list", label: "List" },
  { href: "calendar", label: "Calendar" },
] as const;

export default function ProjectViewsLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const base = `/w/${params.workspaceId}/projects/${params.projectId}`;
  const { token, setToken } = useAuth();
  const qc = useQueryClient();
  const [wsConnected, setWsConnected] = useState(false);

  const wsClient = useMemo(() => {
    if (!token) return null;
    return new WsClient({
      token,
      onMessage: (msg) => {
        if (
          typeof msg === "object" &&
          msg &&
          "type" in msg &&
          (msg as { type?: string }).type === "connected"
        ) {
          setWsConnected(true);
        }
        // Future-proof: once domain events arrive, invalidate project data.
        qc.invalidateQueries({ queryKey: ["tasks", params.projectId, token] });
        qc.invalidateQueries({ queryKey: ["projects", params.workspaceId, token] });
      },
      onUnauthorized: () => {
        setToken(null);
        router.replace("/login");
      },
    });
  }, [token, qc, params.projectId, params.workspaceId, setToken, router]);

  useEffect(() => {
    setWsConnected(false);
    wsClient?.connect();
    return () => {
      wsClient?.close();
    };
  }, [wsClient]);

  return (
    <RequireAuth>
      <div className="mx-auto max-w-6xl p-6">
        <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
          {tabs.map((t) => {
            const href = `${base}/${t.href}`;
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={t.href}
                href={href}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
          <span
            className={`ml-auto rounded px-2 py-1 text-xs ${
              wsConnected
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-accent text-muted-foreground"
            }`}
          >
            WS: {wsConnected ? "connected" : "connecting"}
          </span>
          <Link
            href={`/w/${params.workspaceId}`}
            className="text-sm text-muted underline underline-offset-4"
          >
            Back to projects
          </Link>
        </nav>
        {children}
      </div>
    </RequireAuth>
  );
}
