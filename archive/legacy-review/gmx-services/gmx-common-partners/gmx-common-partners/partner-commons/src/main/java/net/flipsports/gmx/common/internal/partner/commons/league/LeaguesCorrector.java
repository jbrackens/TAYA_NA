package net.flipsports.gmx.common.internal.partner.commons.league;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public abstract class LeaguesCorrector {

  private final Map<String, String> corrections = new HashMap<>();

  public LeaguesCorrector() {
    initCorrections();
  }

  protected abstract void initCorrections();

  protected void addCorrection(String from, String to) {
    corrections.put(prepareKey(from), to);
  }

  public Optional<String> correctName(String input) {
    return Optional.ofNullable(corrections.get(prepareKey(input)));
  }

  private String prepareKey(String from) {
    return from.toLowerCase();
  }
}
