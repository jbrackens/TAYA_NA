package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class ClientDetailsJWrapper {

    public List<ClientDetails> fromJsonList(String json) {
        Optional<ClientDetails[]> parsed = new JsonMapper(ClientDetails[].class).fromJson(json);
        ClientDetails[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public ClientDetails fromJson(String json) {
        Optional<ClientDetails> parsed = new JsonMapper(ClientDetails.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(ClientDetails.class).toJson(value);
        return parsed.get();
    }
}
