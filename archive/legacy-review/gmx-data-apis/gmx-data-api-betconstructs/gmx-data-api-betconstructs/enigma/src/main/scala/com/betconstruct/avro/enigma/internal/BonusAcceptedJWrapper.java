package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class BonusAcceptedJWrapper {

    public List<BonusAccepted> fromJsonList(String json) {
        Optional<BonusAccepted[]> parsed = new JsonMapper(BonusAccepted[].class).fromJson(json);
        BonusAccepted[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public BonusAccepted fromJson(String json) {
        Optional<BonusAccepted> parsed = new JsonMapper(BonusAccepted.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(BonusAccepted.class).toJson(value);
        return parsed.get();
    }
}
