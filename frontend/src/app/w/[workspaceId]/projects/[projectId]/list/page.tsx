"use client";

import { useAuth } from "@/components/auth-provider";
import { fetchTasks } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export default function ListPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { token } = useAuth();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", projectId, token],
    queryFn: () => fetchTasks(token!, projectId),
    enabled: !!token && !!projectId,
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">List</h1>
      {isLoading ? (
        <p className="text-neutral-500">Loading tasks…</p>
      ) : (
        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((t) => (
                <tr key={t.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium">{t.title}</td>
                  <td className="px-3 py-2 text-neutral-600">{t.status.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-neutral-600">{t.priority}</td>
                  <td className="px-3 py-2 text-neutral-600">{t.due_date ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
