package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.toggles;

import org.togglz.core.Feature;
import org.togglz.core.annotation.Label;
import org.togglz.core.context.FeatureContext;

public enum Toggles implements Feature {

  @Label("Simulate backend exceptions using http headers")
  SIMULATE_EXCEPTIONS;

  public boolean isActive() {
    return FeatureContext.getFeatureManager().isActive(this);
  }
}