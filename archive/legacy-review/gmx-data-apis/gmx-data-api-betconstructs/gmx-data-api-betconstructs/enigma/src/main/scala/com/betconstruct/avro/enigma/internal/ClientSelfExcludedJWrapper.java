package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class ClientSelfExcludedJWrapper {

    public List<ClientSelfExcluded> fromJsonList(String json) {
        Optional<ClientSelfExcluded[]> parsed = new JsonMapper(ClientSelfExcluded[].class).fromJson(json);
        ClientSelfExcluded[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public ClientSelfExcluded fromJson(String json) {
        Optional<ClientSelfExcluded> parsed = new JsonMapper(ClientSelfExcluded.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(ClientSelfExcluded.class).toJson(value);
        return parsed.get();
    }
}
