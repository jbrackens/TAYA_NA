// React 18 type augmentation: restore implicit children on React.FC
// This preserves backward compatibility with the existing codebase.
// Individual components can be migrated to explicit children over time.
import "react";

declare module "react" {
  interface FunctionComponent<P = {}> {
    (props: P & { children?: ReactNode }, context?: unknown): ReactElement<unknown, unknown> | null;
  }
}
