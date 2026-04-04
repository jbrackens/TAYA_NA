package net.flipsports.gmx.dataapi.internal.common.core;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Optional;

/**
 * Java Json util for DataAPI Wrappers.
 */
public class JsonJUtil<T> extends ObjectMapper {

  private final Class<T> clazz;

  public JsonJUtil(Class<T> clazz) {
    configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    this.clazz = clazz;
  }

  public Optional<String> toJson(Object value)  {
    try {
      return Optional.of(this.writeValueAsString(value));
    } catch (Exception ex) {
      return Optional.empty();
    }
  }

  public Optional<T> fromJson(String json) {
    try {
      return Optional.of(readValue(json, clazz));
    } catch (Exception ex) {
      return Optional.empty();
    }
  }
}
