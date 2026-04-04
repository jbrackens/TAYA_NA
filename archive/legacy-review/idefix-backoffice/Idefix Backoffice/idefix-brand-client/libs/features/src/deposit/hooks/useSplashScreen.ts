import { useState } from "react";
import * as React from "react";

function useSplashScreen() {
  const [splashScreenIsOpen, setSplashScreenIsOpen] = useState(true);

  const onToggleSplashScreen = React.useCallback(
    () => setSplashScreenIsOpen(prevState => !prevState),
    [setSplashScreenIsOpen]
  );

  return { splashScreenIsOpen, onToggleSplashScreen };
}

export { useSplashScreen };
