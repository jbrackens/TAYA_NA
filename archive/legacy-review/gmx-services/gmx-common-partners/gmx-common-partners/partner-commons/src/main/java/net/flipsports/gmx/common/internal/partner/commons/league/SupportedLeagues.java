package net.flipsports.gmx.common.internal.partner.commons.league;

import net.flipsports.gmx.common.internal.partner.commons.cons.SportType;
import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public abstract class SupportedLeagues {

  private final Map<String, StreamingModelType> supportedLeagues = new HashMap<>();

  public SupportedLeagues() {
    initLeagues();
  }

  protected abstract void initLeagues();

  protected void addLeague(SportType sport, String countryCode, String league, StreamingModelType streamingModel) {
    supportedLeagues.put(prepareKey(sport, countryCode, league), streamingModel);
  }

  public boolean isSupported(SportType sport, String countryCode, String league) {
    return supportedLeagues.containsKey(prepareKey(sport, countryCode, league));
  }

  public StreamingModelType checkStreamingModel(SportType sport, String countryCode, String league) {
    return supportedLeagues.get(prepareKey(sport, countryCode, league));
  }

  private String prepareKey(SportType sport, String countryCode, String league) {
    return String.format("%s_%s_%s", sport, countryCode, league).toLowerCase();
  }


}
