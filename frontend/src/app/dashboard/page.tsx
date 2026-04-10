"use client";

import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { createWorkspace, fetchWorkspaces, logoutRequest } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { token, setToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["workspaces", token],
    queryFn: () => fetchWorkspaces(token!),
    enabled: !!token,
  });

  const createWs = useMutation({
    mutationFn: () => createWorkspace(token!, name.trim() || "My workspace"),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["workspaces", token] });
    },
  });

  async function logout() {
    try {
      await logoutRequest();
    } catch {
      /* still clear client session */
    }
    setToken(null);
    router.replace("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Workspaces</h1>
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm text-muted underline underline-offset-4"
        >
          Log out
        </button>
      </header>

      <section className="rounded border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium text-muted">New workspace</h2>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createWs.mutate();
          }}
        >
          <input
            className="min-w-[12rem] flex-1 rounded border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={createWs.isPending}
            className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
          >
            Create
          </button>
        </form>
        {createWs.isError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{(createWs.error as Error).message}</p>
        ) : null}
      </section>

      {isLoading ? (
        <p className="text-muted-foreground">Loading workspaces…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(workspaces ?? []).map((w) => (
            <li key={w.id}>
              <Link
                href={`/w/${w.id}`}
                className="block rounded border border-border bg-card px-4 py-3 text-card-foreground hover:bg-accent"
              >
                <span className="font-medium">{w.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">{w.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-foreground underline underline-offset-4">
          Home
        </Link>
      </p>
    </main>
  );
}
