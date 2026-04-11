import type { TaskRead } from "@/lib/types";

type DropTarget = { status: string; index: number };

type ResolveDropInput = {
  overId: string;
  columnKeys: string[];
  byStatus: Map<string, TaskRead[]>;
  tasksForLookup: TaskRead[];
  activeTaskId: string | null;
  activeCenterY?: number;
  overTop?: number;
  overHeight?: number;
};

// MUST stay pure: used by Kanban drag flow and Vitest.
export function sortTasksForBoard(items: TaskRead[]): TaskRead[] {
  return [...items].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
}

export function clampIndex(index: number, max: number): number {
  if (index < 0) return 0;
  if (index > max) return max;
  return index;
}

export function resolveDropFromOverId(input: ResolveDropInput): DropTarget | null {
  const {
    overId,
    columnKeys,
    byStatus,
    tasksForLookup,
    activeTaskId,
    activeCenterY,
    overTop,
    overHeight,
  } = input;

  if (columnKeys.includes(overId)) {
    const list = byStatus.get(overId) ?? [];
    return { status: overId, index: list.length };
  }

  if (overId.startsWith("task-gap:")) {
    const [, status, idxRaw] = overId.split(":");
    const idx = Number(idxRaw);
    if (!status || Number.isNaN(idx)) return null;
    return { status, index: idx };
  }

  if (overId.startsWith("task-drop:")) {
    const taskId = overId.slice("task-drop:".length);
    const overTask = tasksForLookup.find((t) => t.id === taskId);
    if (!overTask) return null;

    const list = (byStatus.get(overTask.status) ?? []).filter((t) => t.id !== activeTaskId);
    const idx = list.findIndex((t) => t.id === taskId);
    if (idx < 0) return null;

    const midpoint =
      overTop !== undefined && overHeight !== undefined ? overTop + overHeight / 2 : undefined;
    const insertAfter =
      midpoint !== undefined && activeCenterY !== undefined ? activeCenterY > midpoint : false;

    return { status: overTask.status, index: insertAfter ? idx + 1 : idx };
  }

  return null;
}

export function computeReorderedTasks(
  all: TaskRead[],
  activeId: string,
  targetStatus: string,
  targetIndex: number,
): TaskRead[] | null {
  const active = all.find((t) => t.id === activeId);
  if (!active) return null;

  const sourceStatus = active.status;
  const sourceList = all.filter((t) => t.status === sourceStatus && t.id !== activeId);
  const targetList = all.filter((t) => t.status === targetStatus && t.id !== activeId);

  const insertIndex = clampIndex(targetIndex, targetList.length);
  const moved: TaskRead = { ...active, status: targetStatus };

  const nextTarget = [...targetList];
  nextTarget.splice(insertIndex, 0, moved);

  const resequencedTarget = nextTarget.map((t, idx) => ({
    ...t,
    status: targetStatus,
    position: idx * 1024,
  }));

  const resequencedSource =
    sourceStatus === targetStatus
      ? []
      : sourceList.map((t, idx) => ({
          ...t,
          position: idx * 1024,
        }));

  const replacement = new Map<string, TaskRead>();
  for (const t of resequencedTarget) replacement.set(t.id, t);
  for (const t of resequencedSource) replacement.set(t.id, t);

  return all.map((t) => replacement.get(t.id) ?? t);
}
