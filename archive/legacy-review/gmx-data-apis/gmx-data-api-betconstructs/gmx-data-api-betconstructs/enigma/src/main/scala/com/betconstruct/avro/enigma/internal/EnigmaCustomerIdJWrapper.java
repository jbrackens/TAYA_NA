package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EnigmaCustomerIdJWrapper {

    public List<EnigmaCustomerId> fromJsonList(String json) {
        Optional<EnigmaCustomerId[]> parsed = new JsonMapper(EnigmaCustomerId[].class).fromJson(json);
        EnigmaCustomerId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public EnigmaCustomerId fromJson(String json) {
        Optional<EnigmaCustomerId> parsed = new JsonMapper(EnigmaCustomerId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(EnigmaCustomerId.class).toJson(value);
        return parsed.get();
    }
}
