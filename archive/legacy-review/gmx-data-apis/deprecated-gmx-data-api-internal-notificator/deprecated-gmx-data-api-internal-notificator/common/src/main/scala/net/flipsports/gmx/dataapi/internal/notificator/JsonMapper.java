package net.flipsports.gmx.dataapi.internal.notificator;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

public class JsonMapper<T> extends ObjectMapper {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    private final Class<T> clazz;

    public JsonMapper(Class<T> clazz) {
        configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.clazz = clazz;
    }

    public Optional<String> toJson(Object value)  {
        try {
            return Optional.of(this.writeValueAsString(value));
        } catch (Exception ex) {
            logger.error("Exception during parsing Object to string", ex);
        }
        return Optional.empty();
    }

    public Optional<T> fromJson(String json) {
        try {
            return Optional.of(readValue(json, clazz));
        } catch (Exception ex) {
            logger.error("Exception during parsing Object to string", ex);
        }
        return Optional.empty();
    }
}