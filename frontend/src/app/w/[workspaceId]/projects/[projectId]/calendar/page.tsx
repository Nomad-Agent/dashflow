"use client";

import { useAuth } from "@/components/auth-provider";
import { fetchTasks } from "@/lib/api";
import type { TaskRead } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo } from "react";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { token } = useAuth();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", projectId, token],
    queryFn: () => fetchTasks(token!, projectId),
    enabled: !!token && !!projectId,
  });

  const now = useMemo(() => new Date(), []);
  const key = monthKey(now);

  const byDate = useMemo(() => {
    const map = new Map<string, TaskRead[]>();
    for (const t of tasks ?? []) {
      if (!t.due_date) continue;
      const k = t.due_date.slice(0, 10);
      const list = map.get(k) ?? [];
      list.push(t);
      map.set(k, list);
    }
    return map;
  }, [tasks]);

  const daysInMonth = useMemo(() => {
    const y = now.getFullYear();
    const m = now.getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [now]);

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Calendar</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Month <span className="font-mono">{key}</span> — tasks with a due date
      </p>
      {isLoading ? (
        <p className="text-neutral-500">Loading tasks…</p>
      ) : (
        <div className="grid grid-cols-7 gap-px rounded border border-neutral-200 bg-neutral-200 text-xs sm:text-sm">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="bg-neutral-100 px-1 py-2 text-center font-medium text-neutral-600">
              {d}
            </div>
          ))}
          {daysInMonth.map((day) => {
            const iso = `${key}-${String(day).padStart(2, "0")}`;
            const list = byDate.get(iso) ?? [];
            return (
              <div key={iso} className="min-h-[5rem] bg-white p-1 sm:p-2">
                <div className="mb-1 font-medium text-neutral-400">{day}</div>
                <ul className="space-y-1">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="truncate rounded bg-neutral-900/5 px-1 py-0.5 text-[11px] sm:text-xs"
                      title={t.title}
                    >
                      {t.title}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
