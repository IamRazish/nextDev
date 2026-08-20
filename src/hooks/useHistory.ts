"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type HistoryEntry<T> = {
  id: string;
  /** ms epoch — stamped on push */
  at: number;
  value: T;
};

let counter = 0;
const nextId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

/**
 * Rolling "recent designs" list per tool. Consecutive duplicates collapse so
 * dragging a slider does not flood the list.
 */
export function useHistory<T>(toolSlug: string, limit = 10) {
  const { value: entries, setValue, hydrated } = useLocalStorage<HistoryEntry<T>[]>(
    `nextdev:history:${toolSlug}`,
    [],
  );

  const push = useCallback(
    (value: T) => {
      setValue((prev) => {
        const serialized = JSON.stringify(value);
        if (prev.length && JSON.stringify(prev[0].value) === serialized) return prev;
        return [{ id: nextId(), at: Date.now(), value }, ...prev].slice(0, limit);
      });
    },
    [setValue, limit],
  );

  const remove = useCallback(
    (id: string) => setValue((prev) => prev.filter((e) => e.id !== id)),
    [setValue],
  );

  const clear = useCallback(() => setValue([]), [setValue]);

  return { entries, push, remove, clear, hydrated } as const;
}
