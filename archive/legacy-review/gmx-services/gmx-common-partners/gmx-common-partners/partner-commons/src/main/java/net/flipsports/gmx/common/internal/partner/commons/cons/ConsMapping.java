package net.flipsports.gmx.common.internal.partner.commons.cons;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static java.util.function.Function.identity;

public class ConsMapping<FROM, TO> {
  private final Map<FROM, TO> keyToItem;

  public ConsMapping(TO[] items, Function<TO, FROM> keyExtractor) {
    this.keyToItem = Arrays.stream(items).collect(Collectors.toMap(keyExtractor, identity()));
  }

  public <SOURCE> ConsMapping(
      SOURCE[] items, Function<SOURCE, TO> itemExtractor, Function<SOURCE, FROM> keyExtractor) {
    this.keyToItem =
        Arrays.stream(items).collect(Collectors.toMap(keyExtractor, itemExtractor, (o, n) -> o));
  }

  public TO find(FROM key) {
    return keyToItem.get(key);
  }
}
