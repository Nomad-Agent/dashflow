"use client";

import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { fetchProjects } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function WorkspaceProjectsPage() {
  return (
    <RequireAuth>
      <WorkspaceProjectsInner />
    </RequireAuth>
  );
}

function WorkspaceProjectsInner() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const { token } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", workspaceId, token],
    queryFn: () => fetchProjects(token!, workspaceId),
    enabled: !!token && !!workspaceId,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/dashboard" className="text-sm text-neutral-600 underline">
          All workspaces
        </Link>
      </header>
      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(projects ?? []).map((p) => (
            <li key={p.id}>
              <Link
                href={`/w/${workspaceId}/projects/${p.id}/kanban`}
                className="block rounded border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
              >
                <span className="font-medium">{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(projects?.length ?? 0) === 0 && !isLoading ? (
        <p className="text-sm text-neutral-500">
          No projects yet. Create one via the API (POST{" "}
          <code className="rounded bg-neutral-100 px-1">/workspaces/…/projects</code>) or extend this UI.
        </p>
      ) : null}
    </main>
  );
}
