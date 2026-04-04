package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class ClientRegistrationJWrapper {

    public List<ClientRegistration> fromJsonList(String json) {
        Optional<ClientRegistration[]> parsed = new JsonMapper(ClientRegistration[].class).fromJson(json);
        ClientRegistration[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public ClientRegistration fromJson(String json) {
        Optional<ClientRegistration> parsed = new JsonMapper(ClientRegistration.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(ClientRegistration.class).toJson(value);
        return parsed.get();
    }
}
