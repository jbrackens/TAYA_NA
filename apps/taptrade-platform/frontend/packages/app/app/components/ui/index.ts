/**
 * components/ui — the app's primitives layer (FRONTEND_POLISH_PLAN.md P1).
 *
 * Rules of the layer:
 *  - styled EXCLUSIVELY with DESIGN.md tokens (no hex literals);
 *  - portalled primitives take z from OVERLAY_Z and inherit theme via
 *    the html[data-theme] mirror — never ad hoc z-indexes or containers;
 *  - surfaces consume these instead of declaring *_CLASS recipes.
 *
 * Heavy primitives are deliberately NOT re-exported here. This package
 * has no `sideEffects` hygiene, so every module this barrel touches
 * lands in the chunk graph of every barrel consumer — the P5 cert
 * measured vaul + @number-flow/react + base-ui/dialog riding a shared
 * commons chunk into the first-load of 32/33 routes. Import these
 * directly from their module at the call site:
 *  - Dialog     → "components/ui/Dialog"     (base-ui dialog machinery)
 *  - Sheet      → "components/ui/Sheet"      (vaul + radix + remove-scroll)
 *  - PointsFlow → "components/ui/PointsFlow" (@number-flow/react)
 */

export { Button, type ButtonProps } from "./Button";
export { Card, type CardProps } from "./Card";
export { Input, Textarea, type InputProps, type TextareaProps } from "./Input";
export { OVERLAY_Z, cx, variants } from "./variants";
