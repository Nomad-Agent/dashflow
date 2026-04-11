// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  clampIndex,
  computeReorderedTasks,
  resolveDropFromOverId,
  sortTasksForBoard,
} from "@/lib/kanban/dnd-logic";
import type { TaskRead } from "@/lib/types";

function task(
  id: string,
  status: string,
  position: number,
  overrides: Partial<TaskRead> = {},
): TaskRead {
  return {
    id,
    project_id: "project-1",
    title: `Task ${id}`,
    description: null,
    status,
    priority: "none",
    due_date: null,
    start_date: null,
    assignee_id: null,
    created_by_id: null,
    position,
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
    ...overrides,
  };
}

describe("sortTasksForBoard", () => {
  it("sorts by position then created_at", () => {
    const items = [
      task("b", "todo", 1024, { created_at: "2026-04-10T00:00:03Z" }),
      task("a", "todo", 0, { created_at: "2026-04-10T00:00:04Z" }),
      task("c", "todo", 1024, { created_at: "2026-04-10T00:00:01Z" }),
    ];

    const sorted = sortTasksForBoard(items);
    expect(sorted.map((t) => t.id)).toEqual(["a", "c", "b"]);
  });
});

describe("clampIndex", () => {
  it("clamps to list boundaries", () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(2, 3)).toBe(2);
    expect(clampIndex(99, 3)).toBe(3);
  });
});

describe("resolveDropFromOverId", () => {
  const todoA = task("a", "todo", 0);
  const todoB = task("b", "todo", 1024);
  const inProgress = task("c", "in_progress", 0);
  const qaTask = task("d", "qa", 0);

  const byStatus = new Map<string, TaskRead[]>([
    ["todo", [todoA, todoB]],
    ["in_progress", [inProgress]],
    ["qa", [qaTask]],
  ]);

  const columnKeys = ["todo", "in_progress", "done", "qa"];
  const tasksForLookup = [todoA, todoB, inProgress, qaTask];

  it("resolves column body drop to append index", () => {
    const drop = resolveDropFromOverId({
      overId: "todo",
      columnKeys,
      byStatus,
      tasksForLookup,
      activeTaskId: "a",
    });
    expect(drop).toEqual({ status: "todo", index: 2 });
  });

  it("resolves empty column body to index 0", () => {
    const drop = resolveDropFromOverId({
      overId: "done",
      columnKeys,
      byStatus,
      tasksForLookup,
      activeTaskId: "a",
    });
    expect(drop).toEqual({ status: "done", index: 0 });
  });

  it("resolves task-gap targets", () => {
    const drop = resolveDropFromOverId({
      overId: "task-gap:in_progress:1",
      columnKeys,
      byStatus,
      tasksForLookup,
      activeTaskId: "a",
    });
    expect(drop).toEqual({ status: "in_progress", index: 1 });
  });

  it("resolves task-drop with midpoint hit-testing", () => {
    const before = resolveDropFromOverId({
      overId: "task-drop:b",
      columnKeys,
      byStatus,
      tasksForLookup,
      activeTaskId: "a",
      activeCenterY: 20,
      overTop: 20,
      overHeight: 20,
    });
    const after = resolveDropFromOverId({
      overId: "task-drop:b",
      columnKeys,
      byStatus,
      tasksForLookup,
      activeTaskId: "a",
      activeCenterY: 50,
      overTop: 20,
      overHeight: 20,
    });

    expect(before).toEqual({ status: "todo", index: 0 });
    expect(after).toEqual({ status: "todo", index: 1 });
  });

  it("returns null when hovered task is filtered out of visible status list", () => {
    const filteredByStatus = new Map<string, TaskRead[]>([["todo", [todoA]]]);
    const drop = resolveDropFromOverId({
      overId: "task-drop:b",
      columnKeys,
      byStatus: filteredByStatus,
      tasksForLookup,
      activeTaskId: "a",
      activeCenterY: 30,
      overTop: 20,
      overHeight: 20,
    });
    expect(drop).toBeNull();
  });

  it("supports unknown status columns when present in keys", () => {
    const drop = resolveDropFromOverId({
      overId: "qa",
      columnKeys,
      byStatus,
      tasksForLookup,
      activeTaskId: "a",
    });
    expect(drop).toEqual({ status: "qa", index: 1 });
  });
});

describe("computeReorderedTasks", () => {
  it("reorders inside the same column", () => {
    const all = [task("a", "todo", 0), task("b", "todo", 1024), task("c", "todo", 2048)];
    const next = computeReorderedTasks(all, "a", "todo", 2);
    expect(next).not.toBeNull();

    const todo = sortTasksForBoard((next ?? []).filter((t) => t.status === "todo"));
    expect(todo.map((t) => t.id)).toEqual(["b", "c", "a"]);
    expect(todo.map((t) => t.position)).toEqual([0, 1024, 2048]);
  });

  it("reorders across columns and resequences source/target positions", () => {
    const all = [
      task("a", "todo", 0),
      task("b", "todo", 1024),
      task("c", "in_progress", 0),
      task("d", "in_progress", 1024),
    ];
    const next = computeReorderedTasks(all, "b", "in_progress", 1);
    expect(next).not.toBeNull();

    const todo = sortTasksForBoard((next ?? []).filter((t) => t.status === "todo"));
    const inProgress = sortTasksForBoard(
      (next ?? []).filter((t) => t.status === "in_progress"),
    );

    expect(todo.map((t) => t.id)).toEqual(["a"]);
    expect(todo.map((t) => t.position)).toEqual([0]);
    expect(inProgress.map((t) => t.id)).toEqual(["c", "b", "d"]);
    expect(inProgress.map((t) => t.position)).toEqual([0, 1024, 2048]);
  });

  it("returns null for missing active task", () => {
    const all = [task("a", "todo", 0)];
    expect(computeReorderedTasks(all, "missing", "todo", 0)).toBeNull();
  });
});
