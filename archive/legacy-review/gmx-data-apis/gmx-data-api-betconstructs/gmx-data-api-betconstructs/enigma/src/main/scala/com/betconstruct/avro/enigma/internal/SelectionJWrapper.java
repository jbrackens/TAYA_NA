package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class SelectionJWrapper {

    public List<Selection> fromJsonList(String json) {
        Optional<Selection[]> parsed = new JsonMapper(Selection[].class).fromJson(json);
        Selection[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public Selection fromJson(String json) {
        Optional<Selection> parsed = new JsonMapper(Selection.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(Selection.class).toJson(value);
        return parsed.get();
    }
}
