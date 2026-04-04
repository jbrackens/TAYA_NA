package tech.argyll.video.datafeed.oddsfeed.countries;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.inject.Singleton;
import tech.argyll.video.datafeed.oddsfeed.countries.model.CountryDict;

@Singleton
public class CountriesCache {

  private Map<Long, String> id2code;

  public void build(List<CountryDict> countries) {
    id2code =
        countries.stream()
            .collect(Collectors.toMap(CountryDict::getCountryID, CountryDict::getCountryCode));
  }

  public String getCode(Long countryID) {
    return id2code.get(countryID);
  }
}
