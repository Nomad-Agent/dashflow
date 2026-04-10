"use client";

import { useAuth } from "@/components/auth-provider";
import {
  createComment,
  createTask,
  deleteComment,
  fetchComments,
  fetchTasks,
  updateComment,
} from "@/lib/api";
import type { CommentRead, TaskRead } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function ListPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { token } = useAuth();
  const qc = useQueryClient();
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskRead | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingComment, setEditingComment] = useState<CommentRead | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", projectId, token],
    queryFn: () => fetchTasks(token!, projectId),
    enabled: !!token && !!projectId,
  });

  const taskList = useMemo(() => tasks ?? [], [tasks]);

  const createTaskMutation = useMutation({
    mutationFn: async () =>
      createTask(token!, projectId, {
        title: taskTitle.trim() || "New task",
      }),
    onSuccess: () => {
      setTaskTitle("");
      qc.invalidateQueries({ queryKey: ["tasks", projectId, token] });
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", selectedTask?.id, token],
    queryFn: () => fetchComments(token!, selectedTask!.id),
    enabled: !!token && !!selectedTask?.id,
  });

  const createCommentMutation = useMutation({
    mutationFn: async () =>
      createComment(token!, selectedTask!.id, {
        body: commentDraft.trim(),
      }),
    onSuccess: () => {
      setCommentDraft("");
      qc.invalidateQueries({ queryKey: ["comments", selectedTask?.id, token] });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async () => updateComment(token!, editingComment!.id, { body: editDraft.trim() }),
    onSuccess: () => {
      setEditingComment(null);
      setEditDraft("");
      qc.invalidateQueries({ queryKey: ["comments", selectedTask?.id, token] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => deleteComment(token!, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", selectedTask?.id, token] });
    },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">List</h1>
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
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
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
              {taskList.map((t) => (
                <tr
                  key={t.id}
                  className={`cursor-pointer border-b border-neutral-100 last:border-0 ${
                    selectedTask?.id === t.id ? "bg-neutral-50" : ""
                  }`}
                  onClick={() => setSelectedTask(t)}
                >
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
      <section className="mt-6 rounded border border-neutral-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-neutral-600">Comments</h2>
        {!selectedTask ? (
          <p className="text-sm text-neutral-500">Select a task row to view/add comments.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-neutral-700">
              Task: <span className="font-medium">{selectedTask.title}</span>
            </p>
            <form
              className="mb-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (commentDraft.trim()) createCommentMutation.mutate();
              }}
            >
              <input
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Write a comment"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
              />
              <button
                type="submit"
                disabled={createCommentMutation.isPending || !commentDraft.trim()}
                className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Add
              </button>
            </form>
            {commentsQuery.isLoading ? (
              <p className="text-sm text-neutral-500">Loading comments…</p>
            ) : (
              <ul className="space-y-2">
                {(commentsQuery.data ?? []).map((c) => (
                  <li key={c.id} className="rounded border border-neutral-200 p-2">
                    {editingComment?.id === c.id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editDraft.trim()) updateCommentMutation.mutate();
                        }}
                      >
                        <input
                          className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                          onClick={() => {
                            setEditingComment(null);
                            setEditDraft("");
                          }}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <p className="text-sm">{c.body}</p>
                        <div className="mt-1 flex gap-2 text-xs">
                          <button
                            type="button"
                            className="rounded border border-neutral-300 px-2 py-1"
                            onClick={() => {
                              setEditingComment(c);
                              setEditDraft(c.body);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded border border-neutral-300 px-2 py-1"
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
