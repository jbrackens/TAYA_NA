package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class SportsbookTransactionJWrapper {

    public List<SportsbookTransaction> fromJsonList(String json) {
        Optional<SportsbookTransaction[]> parsed = new JsonMapper(SportsbookTransaction[].class).fromJson(json);
        SportsbookTransaction[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public SportsbookTransaction fromJson(String json) {
        Optional<SportsbookTransaction> parsed = new JsonMapper(SportsbookTransaction.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(SportsbookTransaction.class).toJson(value);
        return parsed.get();
    }
}
