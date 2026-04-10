"use client";

import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { createProject, fetchProjects } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

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
  const qc = useQueryClient();
  const [projectName, setProjectName] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", workspaceId, token],
    queryFn: () => fetchProjects(token!, workspaceId),
    enabled: !!token && !!workspaceId,
  });

  const createProjectMutation = useMutation({
    mutationFn: async () =>
      createProject(token!, workspaceId, {
        name: projectName.trim() || "New project",
      }),
    onSuccess: () => {
      setProjectName("");
      qc.invalidateQueries({ queryKey: ["projects", workspaceId, token] });
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/dashboard" className="text-sm text-neutral-600 underline">
          All workspaces
        </Link>
      </header>
      <section className="rounded border border-neutral-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-neutral-600">Create project</h2>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createProjectMutation.mutate();
          }}
        >
          <input
            className="min-w-[12rem] flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Create
          </button>
        </form>
        {createProjectMutation.isError ? (
          <p className="mt-2 text-sm text-red-600">
            {(createProjectMutation.error as Error).message}
          </p>
        ) : null}
      </section>
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
          No projects yet. Create your first project above.
        </p>
      ) : null}
    </main>
  );
}
