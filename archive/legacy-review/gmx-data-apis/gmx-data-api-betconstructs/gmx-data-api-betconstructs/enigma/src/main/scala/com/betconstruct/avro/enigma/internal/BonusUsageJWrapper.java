package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class BonusUsageJWrapper {

    public List<BonusUsage> fromJsonList(String json) {
        Optional<BonusUsage[]> parsed = new JsonMapper(BonusUsage[].class).fromJson(json);
        BonusUsage[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public BonusUsage fromJson(String json) {
        Optional<BonusUsage> parsed = new JsonMapper(BonusUsage.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(BonusUsage.class).toJson(value);
        return parsed.get();
    }
}
