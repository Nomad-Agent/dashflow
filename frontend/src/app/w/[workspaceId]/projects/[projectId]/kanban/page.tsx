"use client";

import { useAuth } from "@/components/auth-provider";
import {
  createComment,
  createTask,
  deleteComment,
  fetchComments,
  fetchTasks,
  updateComment,
  updateTask,
} from "@/lib/api";
import {
  computeReorderedTasks,
  resolveDropFromOverId,
  sortTasksForBoard,
} from "@/lib/kanban/dnd-logic";
import type { TaskRead } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Fragment, useMemo, useRef, useState } from "react";

const STATUS_ORDER = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
] as const;
const DROP_ANIMATION_MS = 180;
const DROP_ANIMATION = {
  duration: DROP_ANIMATION_MS,
  easing: "cubic-bezier(0.4, 0, 1, 1)",
};

function label(s: string): string {
  return s.replace(/_/g, " ");
}

function matchesSearch(task: TaskRead, term: string): boolean {
  if (!term) return true;
  const q = term.toLowerCase();
  return (
    task.title.toLowerCase().includes(q) ||
    (task.description ? task.description.toLowerCase().includes(q) : false)
  );
}

function TaskCard({
  task,
  onClick,
  draggable: canDrag = true,
  onMeasure,
  isOverlay = false,
}: {
  task: TaskRead;
  onClick: () => void;
  draggable?: boolean;
  onMeasure?: (taskId: string, size: { width: number; height: number }) => void;
  isOverlay?: boolean;
}) {
  const draggable = useDraggable({
    id: task.id,
    disabled: !canDrag,
  });
  const droppable = useDroppable({
    id: `task-drop:${task.id}`,
  });

  const style = draggable.isDragging
    ? {
        opacity: 0,
        width: "100%",
        boxSizing: "border-box" as const,
      }
    : {
        transform: CSS.Transform.toString(draggable.transform),
        opacity: isOverlay ? 0.7 : 1,
        width: "100%",
        boxSizing: "border-box" as const,
      };

  return (
    <li
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
        if (node && onMeasure) {
          onMeasure(task.id, { width: node.offsetWidth, height: node.offsetHeight });
        }
      }}
      style={style}
      {...(canDrag ? draggable.attributes : {})}
      {...(canDrag ? draggable.listeners : {})}
      onClick={onClick}
      className={`list-none select-none rounded border border-border bg-card px-2 py-2 text-sm text-card-foreground transition-shadow ${
        isOverlay
          ? "cursor-grabbing shadow-lg ring-1 ring-sky-500/30"
          : "cursor-grab shadow-sm hover:shadow-md active:cursor-grabbing"
      }`}
    >
      <p className="font-medium leading-snug">{task.title}</p>
      {task.priority !== "none" ? (
        <p className="mt-1 text-xs text-muted-foreground">{task.priority}</p>
      ) : null}
    </li>
  );
}

function DropGap({
  status,
  index,
  isActive,
}: {
  status: string;
  index: number;
  isActive: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `task-gap:${status}:${index}`,
  });

  return (
    <li ref={setNodeRef} className="-mx-2 -my-2 list-none h-6 overflow-visible">
      <div
        className={`relative h-full w-full transition ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-sky-500 ${
            isActive ? "animate-pulse shadow-[0_0_0_1px_rgba(14,165,233,0.35)]" : ""
          }`}
        />
      </div>
    </li>
  );
}

function KanbanColumn({
  status,
  isAdding,
  addTitle,
  addPending,
  tasks,
  isDropTarget,
  activeGapIndex,
  activeTaskId,
  onToggleAdd,
  onAddTitleChange,
  onAddCancel,
  onAddSubmit,
  onTaskClick,
  onTaskMeasure,
}: {
  status: string;
  isAdding: boolean;
  addTitle: string;
  addPending: boolean;
  tasks: TaskRead[];
  isDropTarget: boolean;
  activeGapIndex: number | null;
  activeTaskId: string | null;
  onToggleAdd: () => void;
  onAddTitleChange: (value: string) => void;
  onAddCancel: () => void;
  onAddSubmit: () => void;
  onTaskClick: (taskId: string) => void;
  onTaskMeasure: (taskId: string, size: { width: number; height: number }) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[calc(100vh-14rem)] flex-col rounded border bg-accent/30 transition-colors hover:bg-accent/50 ${
        isDropTarget ? "border-sky-500 ring-2 ring-sky-500/30" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-2 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{label(status)}</h2>
        <button
          type="button"
          aria-label={`Add task to ${label(status)}`}
          className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground transition hover:bg-accent"
          onClick={onToggleAdd}
        >
          +
        </button>
      </div>
      {isAdding ? (
        <form
          className="flex gap-2 border-b border-border p-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAddSubmit();
          }}
        >
          <input
            autoFocus
            className="w-full rounded border border-border bg-input px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            placeholder="Task title"
            value={addTitle}
            onChange={(e) => onAddTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onAddCancel();
              }
            }}
          />
          <button
            type="submit"
            className="rounded bg-foreground px-2 py-1 text-xs text-background disabled:opacity-50"
            disabled={addPending}
          >
            Add
          </button>
        </form>
      ) : null}
      <ul className="flex flex-1 flex-col p-2">
        <DropGap
          status={status}
          index={0}
          isActive={activeGapIndex === 0}
        />
        {tasks
          .filter((t) => t.id !== activeTaskId)
          .map((t, idx) => (
          <Fragment key={t.id}>
            <TaskCard
              task={t}
              onClick={() => onTaskClick(t.id)}
              onMeasure={onTaskMeasure}
            />
            <DropGap
              status={status}
              index={idx + 1}
              isActive={activeGapIndex === idx + 1}
            />
          </Fragment>
          ))}
      </ul>
    </section>
  );
}

export default function KanbanPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { token } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overDrop, setOverDrop] = useState<{
    status: string;
    index: number;
  } | null>(null);
  const [previewTasks, setPreviewTasks] = useState<TaskRead[] | null>(null);
  const [taskSizes, setTaskSizes] = useState<Record<string, { width: number; height: number }>>(
    {},
  );
  const justDraggedTaskId = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", projectId, token],
    queryFn: () => fetchTasks(token!, projectId),
    enabled: !!token && !!projectId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async ({ status, title }: { status: string; title: string }) =>
      createTask(token!, projectId, {
        title: title.trim() || "New task",
        status,
      }),
    onSuccess: () => {
      setAddTitle("");
      setAddStatus(null);
      qc.invalidateQueries({ queryKey: ["tasks", projectId, token] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (
      updates: Array<{ taskId: string; status: string; position: number }>,
    ) => {
      await Promise.all(
        updates.map((u) =>
          updateTask(token!, u.taskId, {
            status: u.status,
            position: u.position,
          }),
        ),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId, token] });
    },
  });

  const selectedTask = useMemo(
    () => (tasks ?? []).find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const commentsQuery = useQuery({
    queryKey: ["comments", selectedTaskId, token],
    queryFn: () => fetchComments(token!, selectedTaskId!),
    enabled: !!token && !!selectedTaskId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async () =>
      createComment(token!, selectedTaskId!, {
        body: commentDraft.trim(),
      }),
    onSuccess: () => {
      setCommentDraft("");
      qc.invalidateQueries({ queryKey: ["comments", selectedTaskId, token] });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async () =>
      updateComment(token!, editingCommentId!, {
        body: editDraft.trim(),
      }),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditDraft("");
      qc.invalidateQueries({ queryKey: ["comments", selectedTaskId, token] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => deleteComment(token!, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", selectedTaskId, token] });
    },
  });

  const { columnKeys, byStatus } = useMemo(() => {
    const filtered = sortTasksForBoard(previewTasks ?? tasks ?? []).filter((t) =>
      matchesSearch(t, search.trim()),
    );
    const map = new Map<string, TaskRead[]>();
    for (const t of filtered) {
      const k = t.status || "todo";
      const list = map.get(k) ?? [];
      list.push(t);
      map.set(k, list);
    }
    const extra = Array.from(map.keys()).filter(
      (k) => !(STATUS_ORDER as readonly string[]).includes(k),
    );
    const columnKeys = [...STATUS_ORDER, ...extra.sort()];
    return { columnKeys, byStatus: map };
  }, [previewTasks, tasks, search]);

  const activeTask = useMemo(
    () => (previewTasks ?? tasks ?? []).find((t) => t.id === activeTaskId) ?? null,
    [previewTasks, tasks, activeTaskId],
  );

  const orderedTasks = useMemo(() => sortTasksForBoard(tasks ?? []), [tasks]);

  function handleDragStart(event: DragStartEvent): void {
    const id = String(event.active.id);
    setActiveTaskId(id);
    setPreviewTasks(orderedTasks);
    const src = orderedTasks.find((t) => t.id === id);
    if (src) {
      const srcList = orderedTasks.filter((t) => t.status === src.status);
      const srcIndex = srcList.findIndex((t) => t.id === id);
      setOverDrop({ status: src.status, index: Math.max(0, srcIndex) });
    }
  }

  function clearActiveOverlaySoon(): void {
    // Clear immediately to avoid delayed visual lag/flicker after drop.
    setActiveTaskId(null);
  }

  function handleDragOver(event: DragOverEvent): void {
    if (!activeTaskId || !event.over) return;
    const activeCenterY =
      event.active.rect.current.translated?.top !== undefined
        ? event.active.rect.current.translated.top +
          event.active.rect.current.translated.height / 2
        : undefined;
    const drop = resolveDropFromOverId({
      overId: String(event.over.id),
      columnKeys,
      byStatus,
      tasksForLookup: previewTasks ?? orderedTasks,
      activeTaskId,
      activeCenterY,
      overTop: event.over.rect.top,
      overHeight: event.over.rect.height,
    });
    if (!drop) return;

    const base = previewTasks ?? orderedTasks;
    const targetIndex = drop.index;

    const next = computeReorderedTasks(base, activeTaskId, drop.status, targetIndex);
    if (next) {
      setPreviewTasks(sortTasksForBoard(next));
      setOverDrop({ status: drop.status, index: targetIndex });
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || !active) {
      clearActiveOverlaySoon();
      setOverDrop(null);
      setPreviewTasks(null);
      return;
    }

    const taskId = String(active.id);
    const base = previewTasks ?? orderedTasks;
    const sourceTask = base.find((t) => t.id === taskId);
    if (!sourceTask) return;

    const activeCenterY =
      active.rect.current.translated?.top !== undefined
        ? active.rect.current.translated.top + active.rect.current.translated.height / 2
        : undefined;
    const drop = resolveDropFromOverId({
      overId: String(over.id),
      columnKeys,
      byStatus,
      tasksForLookup: previewTasks ?? orderedTasks,
      activeTaskId,
      activeCenterY,
      overTop: over.rect.top,
      overHeight: over.rect.height,
    });
    if (!drop) {
      clearActiveOverlaySoon();
      setOverDrop(null);
      setPreviewTasks(null);
      return;
    }
    const targetStatus = drop.status;
    const targetIndex = drop.index;

    justDraggedTaskId.current = taskId;
    setTimeout(() => {
      if (justDraggedTaskId.current === taskId) {
        justDraggedTaskId.current = null;
      }
    }, 200);

    const nextTasks = computeReorderedTasks(
      base,
      taskId,
      targetStatus,
      targetIndex,
    );
    if (nextTasks) {
      qc.setQueryData(["tasks", projectId, token], sortTasksForBoard(nextTasks));
      const changed = nextTasks
        .filter((t) => {
          const prev = orderedTasks.find((p) => p.id === t.id);
          return !!prev && (prev.status !== t.status || prev.position !== t.position);
        })
        .map((t) => ({ taskId: t.id, status: t.status, position: t.position }));
      if (changed.length > 0) {
        reorderMutation.mutate(changed);
      }
    }
    clearActiveOverlaySoon();
    setOverDrop(null);
    setPreviewTasks(null);
  }

  function handleDragCancel(): void {
    clearActiveOverlaySoon();
    setOverDrop(null);
    setPreviewTasks(null);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Kanban</h1>
      <div className="mb-4">
        <input
          type="search"
          aria-label="Search tasks"
          className="w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading tasks…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {columnKeys.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                isAdding={addStatus === status}
                addTitle={addTitle}
                addPending={createTaskMutation.isPending}
                tasks={byStatus.get(status) ?? []}
                isDropTarget={!!activeTaskId && overDrop?.status === status}
                activeGapIndex={
                  activeTaskId && overDrop?.status === status
                    ? overDrop.index
                    : null
                }
                activeTaskId={activeTaskId}
                onToggleAdd={() => {
                  setAddStatus((prev) => (prev === status ? null : status));
                  setAddTitle("");
                }}
                onAddTitleChange={setAddTitle}
                onAddCancel={() => {
                  setAddStatus(null);
                  setAddTitle("");
                }}
                onAddSubmit={() => createTaskMutation.mutate({ status, title: addTitle })}
                onTaskClick={(taskId) => {
                  if (justDraggedTaskId.current === taskId) return;
                  setSelectedTaskId(taskId);
                }}
                onTaskMeasure={(taskId, size) => {
                  setTaskSizes((prev) =>
                    prev[taskId]?.width === size.width && prev[taskId]?.height === size.height
                      ? prev
                      : { ...prev, [taskId]: size },
                  );
                }}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={DROP_ANIMATION}>
            {activeTask ? (
              <div
                className="pointer-events-none"
                style={{
                  width: taskSizes[activeTask.id]?.width,
                  height: taskSizes[activeTask.id]?.height,
                  transform: "scale(1.01)",
                }}
              >
                <TaskCard task={activeTask} onClick={() => {}} draggable={false} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {selectedTask ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setSelectedTaskId(null);
            setEditingCommentId(null);
            setEditDraft("");
          }}
        >
          <div
            className="w-full max-w-xl rounded border border-border bg-card p-4 text-card-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {label(selectedTask.status)} · {selectedTask.priority}
                </p>
              </div>
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-accent"
                onClick={() => {
                  setSelectedTaskId(null);
                  setEditingCommentId(null);
                  setEditDraft("");
                }}
              >
                Close
              </button>
            </div>

            {selectedTask.description ? (
              <p className="mb-4 rounded bg-accent p-2 text-sm">{selectedTask.description}</p>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">No description yet.</p>
            )}

            <section className="rounded border border-border bg-background p-3">
              <h4 className="mb-2 text-sm font-medium text-muted">Comments</h4>
              <form
                className="mb-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (commentDraft.trim()) {
                    createCommentMutation.mutate();
                  }
                }}
              >
                <input
                  className="w-full rounded border border-border bg-input px-2 py-1.5 text-sm text-foreground"
                  placeholder="Write a comment"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
                  disabled={createCommentMutation.isPending || !commentDraft.trim()}
                >
                  Add
                </button>
              </form>
              {commentsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading comments…</p>
              ) : (
                <ul className="space-y-2">
                  {(commentsQuery.data ?? []).map((c) => (
                    <li key={c.id} className="rounded border border-border bg-card p-2">
                      {editingCommentId === c.id ? (
                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (editDraft.trim()) {
                              updateCommentMutation.mutate();
                            }
                          }}
                        >
                          <input
                            className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="rounded border border-border px-2 py-1 text-xs"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-xs"
                            onClick={() => {
                              setEditingCommentId(null);
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
                              className="rounded border border-border px-2 py-1"
                              onClick={() => {
                                setEditingCommentId(c.id);
                                setEditDraft(c.body);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded border border-border px-2 py-1"
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
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
