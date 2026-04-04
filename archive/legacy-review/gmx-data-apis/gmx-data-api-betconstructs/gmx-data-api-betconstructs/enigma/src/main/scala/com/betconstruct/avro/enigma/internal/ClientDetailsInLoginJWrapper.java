package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class ClientDetailsInLoginJWrapper {

    public List<ClientDetailsInLogin> fromJsonList(String json) {
        Optional<ClientDetailsInLogin[]> parsed = new JsonMapper(ClientDetailsInLogin[].class).fromJson(json);
        ClientDetailsInLogin[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public ClientDetailsInLogin fromJson(String json) {
        Optional<ClientDetailsInLogin> parsed = new JsonMapper(ClientDetailsInLogin.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(ClientDetailsInLogin.class).toJson(value);
        return parsed.get();
    }
}
