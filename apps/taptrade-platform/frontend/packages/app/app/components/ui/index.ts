/**
 * components/ui — the app's primitives layer (FRONTEND_POLISH_PLAN.md P1).
 *
 * Rules of the layer:
 *  - styled EXCLUSIVELY with DESIGN.md tokens (no hex literals);
 *  - portalled primitives take z from OVERLAY_Z and inherit theme via
 *    the html[data-theme] mirror — never ad hoc z-indexes or containers;
 *  - surfaces consume these instead of declaring *_CLASS recipes.
 */

export { Button, type ButtonProps } from "./Button";
export { Card, type CardProps } from "./Card";
export { Input, Textarea, type InputProps, type TextareaProps } from "./Input";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";
export { PointsFlow, type PointsFlowProps } from "./PointsFlow";
export { Sheet, type SheetProps } from "./Sheet";
export { OVERLAY_Z, cx, variants } from "./variants";
