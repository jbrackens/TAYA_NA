// React 19 moved the JSX namespace from the global `JSX` namespace to
// `React.JSX`. Libraries still typed against the global namespace
// (styled-components v5 via @types/styled-components 5.x) resolve intrinsic
// element props to `{}`, which breaks every `styled.<tag>` usage (TS2769:
// children/onClick/value not assignable). Re-export React's JSX namespace into
// the global namespace so those libraries type-check correctly. Actual JSX
// checking uses the react-jsx runtime (React.JSX), so this only restores what
// older library typings expect; it does not change app JSX semantics.
import type * as React from "react";

declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type Element = React.JSX.Element;
    interface ElementClass extends React.JSX.ElementClass {}
    interface ElementAttributesProperty
      extends React.JSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute
      extends React.JSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<
      C,
      P
    >;
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends React.JSX
      .IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
