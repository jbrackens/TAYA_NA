package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EnigmaJWrapper {

    public List<Enigma> fromJsonList(String json) {
        Optional<Enigma[]> parsed = new JsonMapper(Enigma[].class).fromJson(json);
        Enigma[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public Enigma fromJson(String json) {
        Optional<Enigma> parsed = new JsonMapper(Enigma.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(Enigma.class).toJson(value);
        return parsed.get();
    }
}
