package com.betconstruct.avro.enigma.internal;

import com.betconstruct.avro.enigma.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class FinanceTransactionJWrapper {

    public List<FinanceTransaction> fromJsonList(String json) {
        Optional<FinanceTransaction[]> parsed = new JsonMapper(FinanceTransaction[].class).fromJson(json);
        FinanceTransaction[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public FinanceTransaction fromJson(String json) {
        Optional<FinanceTransaction> parsed = new JsonMapper(FinanceTransaction.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper(FinanceTransaction.class).toJson(value);
        return parsed.get();
    }
}
