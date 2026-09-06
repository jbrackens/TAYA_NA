/**
 * components/ui — shared plumbing (docs/archive/FRONTEND_POLISH_PLAN.md P1).
 *
 * variants(): the deliberately tiny local alternative to cva — a base
 * class list plus a named variant map. No dependency, no runtime cost
 * beyond string concat, and grep-able output classes.
 *
 * OVERLAY_Z: the app's single overlay layering contract. Page content
 * lives inside the AppShell `isolate` stacking context; portalled UI
 * layers BETWEEN the sticky TopBar (z-[100]) and toasts (z-[9999]).
 * Every portalled primitive must take its z from here — never ad hoc.
 */

export const OVERLAY_Z = {
  backdrop: "z-[200]",
  sheet: "z-[220]",
  dialog: "z-[240]",
  menu: "z-[260]",
  tooltip: "z-[280]",
  // Toasts sit above everything: they announce outcomes of actions taken
  // inside dialogs/sheets, so they must never render behind one.
  toast: "z-[300]",
} as const;

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function variants<V extends string>(
  base: string,
  map: Record<V, string>,
): (variant: V, extra?: string) => string {
  return (variant, extra) => cx(base, map[variant], extra);
}
