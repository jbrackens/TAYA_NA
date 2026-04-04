package net.flipsports.gmx.common.internal.partner.sbtech.dict;

import org.cache2k.Cache;
import org.cache2k.Cache2kBuilder;
import org.cache2k.integration.CacheLoader;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

public class CountryDict {

  private static final String CACHE_KEY = "countryDict";

  private final Cache<String, Map<Long, CountryDictEntry>> cache;

  public CountryDict(Supplier<List<CountryDictEntry>> loader) {
    this.cache = cacheBuilder()
        .expireAfterWrite(1, TimeUnit.HOURS)
        .resilienceDuration(30, TimeUnit.SECONDS)
        .refreshAhead(true)
        .loader(new CountryLoader(loader))
        .build();
  }

  private Cache2kBuilder<String, Map<Long, CountryDictEntry>> cacheBuilder() {
    return new Cache2kBuilder<String, Map<Long, CountryDictEntry>>() {
    };
  }

  public Optional<String> getCode(Long countryID) {
    Map<Long, CountryDictEntry> cachedDict = cache.get(CACHE_KEY);
    return Optional.ofNullable(cachedDict.get(countryID))
        .map(CountryDictEntry::getCode);
  }

  private static class CountryLoader extends CacheLoader<String, Map<Long, CountryDictEntry>> {
    private final Supplier<List<CountryDictEntry>> loader;

    private CountryLoader(Supplier<List<CountryDictEntry>> loader) {
      this.loader = loader;
    }

    @Override
    public Map<Long, CountryDictEntry> load(String key) {
      List<CountryDictEntry> result = loader.get();
      return result.stream()
          .collect(Collectors.toMap(CountryDictEntry::getId, Function.identity()));
    }

  }
}
