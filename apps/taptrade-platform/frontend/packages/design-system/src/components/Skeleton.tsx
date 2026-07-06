import React from "react";
import { cx } from "../utils/classNames";

interface SkeletonProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

type CssVars = React.CSSProperties & Record<`--${string}`, string | number>;
type SkeletonVarName =
  | "--skeleton-width"
  | "--skeleton-height"
  | "--skeleton-radius";
type ResolvedClass =
  | { className: string; variableName?: undefined; variableValue?: undefined }
  | { className: string; variableName: SkeletonVarName; variableValue: string };

const skeletonWidthClasses: Record<string, string> = {
  "100%": "w-full",
  "75%": "w-3/4",
  "50%": "w-1/2",
  "25%": "w-1/4",
  auto: "w-auto",
  "16": "w-4",
  "20": "w-5",
  "24": "w-6",
  "32": "w-8",
  "40": "w-10",
  "48": "w-12",
  "64": "w-16",
};

const skeletonHeightClasses: Record<string, string> = {
  "100%": "h-full",
  "12": "h-3",
  "16": "h-4",
  "20": "h-5",
  "24": "h-6",
  "32": "h-8",
  "40": "h-10",
  "48": "h-12",
  "64": "h-16",
};

const skeletonRadiusClasses: Record<string, string> = {
  "4px": "rounded",
  "6px": "rounded-md",
  "8px": "rounded-lg",
  "12px": "rounded-xl",
  "50%": "rounded-full",
  "9999px": "rounded-full",
};

function toCssSize(value: string | number) {
  return typeof value === "number" ? `${value}px` : value;
}

function resolveSizeClass(
  value: string | number,
  classes: Record<string, string>,
  variableName: "--skeleton-width" | "--skeleton-height",
): ResolvedClass {
  const key = String(value);
  if (classes[key]) return { className: classes[key] };
  return {
    className:
      variableName === "--skeleton-width"
        ? "w-[var(--skeleton-width)]"
        : "h-[var(--skeleton-height)]",
    variableName,
    variableValue: toCssSize(value),
  };
}

function resolveRadiusClass(borderRadius?: string): ResolvedClass {
  const radius = borderRadius || "8px";
  if (skeletonRadiusClasses[radius]) {
    return { className: skeletonRadiusClasses[radius] };
  }
  return {
    className: "rounded-[var(--skeleton-radius)]",
    variableName: "--skeleton-radius" as const,
    variableValue: radius,
  };
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    { width = "100%", height = 20, borderRadius, className, style, ...props },
    ref,
  ) => {
    const widthClass = resolveSizeClass(
      width,
      skeletonWidthClasses,
      "--skeleton-width",
    );
    const heightClass = resolveSizeClass(
      height,
      skeletonHeightClasses,
      "--skeleton-height",
    );
    const radiusClass = resolveRadiusClass(borderRadius);
    const variableStyle: CssVars = {};

    for (const resolved of [widthClass, heightClass, radiusClass]) {
      if (resolved.variableName) {
        variableStyle[resolved.variableName] = resolved.variableValue;
      }
    }

    const mergedStyle =
      Object.keys(variableStyle).length > 0 || style
        ? ({ ...variableStyle, ...style } as React.CSSProperties)
        : undefined;

    return (
      <div
        ref={ref}
        className={cx(
          "animate-pulse bg-gradient-to-r from-[#2d2d44] via-[#4a4a5e] to-[#2d2d44]",
          widthClass.className,
          heightClass.className,
          radiusClass.className,
          className,
        )}
        style={mergedStyle}
        {...props}
      />
    );
  },
);

Skeleton.displayName = "Skeleton";

export default Skeleton;
