package com.betconstruct.avro.enigma;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EnigmaMessageJWrapper {

    public List<EnigmaMessage> fromJsonList(String json) {
        Optional<EnigmaMessage[]> parsed = new JsonMapper(EnigmaMessage[].class).fromJson(json);
        EnigmaMessage[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public EnigmaMessage fromJson(String json) {
        Optional<EnigmaMessage> parsed = new JsonMapper(EnigmaMessage.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(EnigmaMessage.class).toJson(value);
        return parsed.get();
    }
}
