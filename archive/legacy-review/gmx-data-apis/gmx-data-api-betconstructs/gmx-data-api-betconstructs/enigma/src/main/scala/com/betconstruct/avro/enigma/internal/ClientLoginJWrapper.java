package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class ClientLoginJWrapper {

    public List<ClientLogin> fromJsonList(String json) {
        Optional<ClientLogin[]> parsed = new JsonMapper(ClientLogin[].class).fromJson(json);
        ClientLogin[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public ClientLogin fromJson(String json) {
        Optional<ClientLogin> parsed = new JsonMapper(ClientLogin.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(ClientLogin.class).toJson(value);
        return parsed.get();
    }
}
