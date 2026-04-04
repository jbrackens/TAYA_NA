package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class CasinoTransactionJWrapper {

    public List<CasinoTransaction> fromJsonList(String json) {
        Optional<CasinoTransaction[]> parsed = new JsonMapper(CasinoTransaction[].class).fromJson(json);
        CasinoTransaction[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public CasinoTransaction fromJson(String json) {
        Optional<CasinoTransaction> parsed = new JsonMapper(CasinoTransaction.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(CasinoTransaction.class).toJson(value);
        return parsed.get();
    }
}
