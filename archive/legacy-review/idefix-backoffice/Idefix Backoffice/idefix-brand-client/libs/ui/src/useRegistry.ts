import { useContext } from "react";
import { UIContext } from "./UIContext";
import { defaultRegistry, UIRegistry } from "./UIRegistry";

function useRegistry(): UIRegistry {
  const registry = useContext(UIContext);

  if (registry === null) {
    console.error("useRegistry hook should be used inside of UIProvider");
    return defaultRegistry;
  }

  return registry;
}

export { useRegistry };
