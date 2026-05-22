"use client";

import React, { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import {
  ServerStyleSheet,
  StyleSheetManager,
  type StyleSheetManagerProps,
} from "styled-components";

// `@types/styled-components@5.1.x` types `ServerStyleSheet#instance` as the
// public sheet (without `clearTag`) and omits `children` from
// `StyleSheetManagerProps`, even though both are part of the supported v5
// runtime used by the standard Next.js App Router registry. Narrow to the
// exact shapes we rely on rather than reaching for `any`.
type ClearableSheet = { clearTag: () => void };
const StyleSheetManagerWithChildren = StyleSheetManager as React.ComponentType<
  StyleSheetManagerProps & { children?: React.ReactNode }
>;

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    (
      styledComponentsStyleSheet.instance as unknown as ClearableSheet
    ).clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== "undefined") {
    return <>{children}</>;
  }

  return (
    <StyleSheetManagerWithChildren sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManagerWithChildren>
  );
}
