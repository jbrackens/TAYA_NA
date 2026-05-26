"use client";

import type { CSSProperties } from "react";

interface AvatarProps {
  name?: string;
  size?: number;
  src?: string;
}

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

const avatarSizeClasses: Record<number, { container: string; text: string }> = {
  24: { container: "h-6 w-6", text: "text-[9.6px]" },
  32: { container: "h-8 w-8", text: "text-[12.8px]" },
  40: { container: "h-10 w-10", text: "text-base" },
  48: { container: "h-12 w-12", text: "text-[19.2px]" },
  64: { container: "h-16 w-16", text: "text-[25.6px]" },
};

const avatarBackgroundClasses = [
  "bg-[var(--accent)]",
  "bg-[#3b82f6]",
  "bg-[#ec4899]",
  "bg-[#8b5cf6]",
  "bg-[#06b6d4]",
  "bg-[#10b981]",
  "bg-[#f59e0b]",
  "bg-[#ef4444]",
];

function getSizeClasses(size: number) {
  return (
    avatarSizeClasses[size] ?? {
      container: "h-[var(--avatar-size)] w-[var(--avatar-size)]",
      text: "[font-size:var(--avatar-font-size)]",
    }
  );
}

function getSizeVars(size: number): CssVars | undefined {
  if (avatarSizeClasses[size]) return undefined;
  return {
    "--avatar-size": `${size}px`,
    "--avatar-font-size": `${size * 0.4}px`,
  };
}

export default function Avatar({ name = "", size = 40, src }: AvatarProps) {
  // Generate color from name hash
  const getColorClassFromHash = (str: string): string => {
    if (!str) return avatarBackgroundClasses[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % avatarBackgroundClasses.length;
    return avatarBackgroundClasses[index];
  };

  // Get initials from name
  const getInitials = (fullName: string): string => {
    return fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const backgroundClass = getColorClassFromHash(name);
  const initials = getInitials(name);
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizeClasses.container} ${
        src ? "bg-transparent" : backgroundClass
      }`}
      style={getSizeVars(size)}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className={`font-semibold text-white ${sizeClasses.text}`}>
          {initials || "?"}
        </span>
      )}
    </div>
  );
}
