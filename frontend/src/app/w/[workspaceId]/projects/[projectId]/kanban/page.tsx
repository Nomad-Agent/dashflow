"use client";

import { useAuth } from "@/components/auth-provider";
import { createTask, fetchTasks, updateTask } from "@/lib/api";
import type { TaskRead } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

const STATUS_ORDER = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
] as const;

function label(s: string): string {
  return s.replace(/_/g, " ");
}

export default function KanbanPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { token } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", projectId, token],
    queryFn: () => fetchTasks(token!, projectId),
    enabled: !!token && !!projectId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async () =>
      createTask(token!, projectId, {
        title: title.trim() || "New task",
      }),
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["tasks", projectId, token] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) =>
      updateTask(token!, taskId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId, token] });
    },
  });

  const { columnKeys, byStatus } = useMemo(() => {
    const map = new Map<string, TaskRead[]>();
    for (const t of tasks ?? []) {
      const k = t.status || "todo";
      const list = map.get(k) ?? [];
      list.push(t);
      map.set(k, list);
    }
    const extra = Array.from(map.keys()).filter(
      (k) => !(STATUS_ORDER as readonly string[]).includes(k),
    );
    const columnKeys = [...STATUS_ORDER.filter((s) => map.has(s)), ...extra.sort()];
    return { columnKeys, byStatus: map };
  }, [tasks]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Kanban</h1>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          createTaskMutation.mutate();
        }}
      >
        <input
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Add a task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          disabled={createTaskMutation.isPending}
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {isLoading ? (
        <p className="text-neutral-500">Loading tasks…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {columnKeys.map((status) => (
            <section key={status} className="flex min-h-[12rem] flex-col rounded border border-neutral-200 bg-neutral-50/80">
              <h2 className="border-b border-neutral-200 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                {label(status)}
              </h2>
              <ul className="flex flex-1 flex-col gap-2 p-2">
                {(byStatus.get(status) ?? []).map((t) => (
                  <li
                    key={t.id}
                    className="rounded border border-neutral-200 bg-white px-2 py-2 text-sm shadow-sm"
                  >
                    <p className="font-medium leading-snug">{t.title}</p>
                    {t.priority !== "none" ? (
                      <p className="mt-1 text-xs text-neutral-500">{t.priority}</p>
                    ) : null}
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        className="rounded border border-neutral-300 px-2 py-0.5 text-[11px]"
                        disabled={
                          updateTaskMutation.isPending ||
                          STATUS_ORDER.indexOf(t.status as (typeof STATUS_ORDER)[number]) <= 0
                        }
                        onClick={() => {
                          const idx = STATUS_ORDER.indexOf(
                            t.status as (typeof STATUS_ORDER)[number],
                          );
                          if (idx > 0) {
                            updateTaskMutation.mutate({
                              taskId: t.id,
                              status: STATUS_ORDER[idx - 1],
                            });
                          }
                        }}
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        className="rounded border border-neutral-300 px-2 py-0.5 text-[11px]"
                        disabled={
                          updateTaskMutation.isPending ||
                          STATUS_ORDER.indexOf(t.status as (typeof STATUS_ORDER)[number]) ===
                            STATUS_ORDER.length - 1
                        }
                        onClick={() => {
                          const idx = STATUS_ORDER.indexOf(
                            t.status as (typeof STATUS_ORDER)[number],
                          );
                          if (idx >= 0 && idx < STATUS_ORDER.length - 1) {
                            updateTaskMutation.mutate({
                              taskId: t.id,
                              status: STATUS_ORDER[idx + 1],
                            });
                          }
                        }}
                      >
                        ▶
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
