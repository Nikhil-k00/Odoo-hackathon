"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * React 19 resets a <form> after its Server Action settles, which wipes what the user typed
 * when validation fails. This hook snapshots the submitted FormData and restores text-like
 * fields whenever the action returns an error state, so people only fix the flagged field.
 *
 * Usage:
 *   const { formRef, wrap } = useFormPersist(state);
 *   <form ref={formRef} action={wrap(formAction)}>
 */
export function useFormPersist(state: unknown) {
  const formRef = useRef<HTMLFormElement>(null);
  const snapshot = useRef<Record<string, string>>({});
  const lastState = useRef<unknown>(null);

  const wrap = useCallback(
    (action: (formData: FormData) => void) => (formData: FormData) => {
      const entries: Record<string, string> = {};
      formData.forEach((v, k) => { if (typeof v === "string") entries[k] = v; });
      snapshot.current = entries;
      action(formData);
    },
    []
  );

  useEffect(() => {
    if (!state || state === lastState.current) return;
    lastState.current = state;
    const ok = typeof state === "object" && state !== null && (state as { ok?: boolean }).ok === true;
    if (ok) return;
    const form = formRef.current;
    if (!form) return;
    // Run after React's own form reset.
    const t = setTimeout(() => {
      for (const [name, value] of Object.entries(snapshot.current)) {
        const el = form.elements.namedItem(name);
        if (el instanceof HTMLInputElement) {
          if (["hidden", "checkbox", "radio", "file", "submit", "password"].includes(el.type)) continue;
          if (el.value === "") el.value = value;
        } else if (el instanceof HTMLTextAreaElement) {
          if (el.value === "") el.value = value;
        }
      }
    }, 0);
    return () => clearTimeout(t);
  }, [state]);

  return { formRef, wrap };
}
