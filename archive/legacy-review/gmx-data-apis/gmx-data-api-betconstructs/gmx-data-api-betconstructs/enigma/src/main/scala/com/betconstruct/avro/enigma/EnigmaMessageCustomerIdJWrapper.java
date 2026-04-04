package com.betconstruct.avro.enigma;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EnigmaMessageCustomerIdJWrapper {

    public List<EnigmaMessageCustomerId> fromJsonList(String json) {
        Optional<EnigmaMessageCustomerId[]> parsed = new JsonMapper(EnigmaMessageCustomerId[].class).fromJson(json);
        EnigmaMessageCustomerId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public EnigmaMessageCustomerId fromJson(String json) {
        Optional<EnigmaMessageCustomerId> parsed = new JsonMapper(EnigmaMessageCustomerId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(EnigmaMessageCustomerId.class).toJson(value);
        return parsed.get();
    }
}
