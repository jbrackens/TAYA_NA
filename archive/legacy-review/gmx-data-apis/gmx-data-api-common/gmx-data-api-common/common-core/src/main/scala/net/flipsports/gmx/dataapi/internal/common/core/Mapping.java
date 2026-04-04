package net.flipsports.gmx.dataapi.internal.common.core;

import static java.util.function.Function.identity;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Mapping<FROM, TO> {

  private final Map<FROM, TO> keyToItem;

  public Mapping(TO[] items, Function<TO, FROM> keyExtractor) {
    this(items, keyExtractor, identity());
  }

  public <SOURCE> Mapping(
      SOURCE[] items, Function<SOURCE, FROM> keyExtractor, Function<SOURCE, TO> itemExtractor) {
    this.keyToItem =
        Arrays.stream(items).collect(Collectors.toMap(keyExtractor, itemExtractor));
  }

  public Optional<TO> find(FROM key) {
    return Optional.ofNullable(keyToItem.get(key));
  }

  public TO get(FROM key) {
    Optional<TO> result = find(key);
    return result.orElseThrow(() -> new IllegalStateException("Poison status of enum!"));
  }
}
