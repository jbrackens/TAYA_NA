package SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class CasinoBetJWrapper {

    public List<CasinoBet> fromJsonList(String json) {
        Optional<CasinoBet[]> parsed = new JsonJUtil<>(CasinoBet[].class).fromJson(json);
        CasinoBet[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public CasinoBet fromJson(String json) {
        Optional<CasinoBet> parsed = new JsonJUtil<>(CasinoBet.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(CasinoBet.class).toJson(value);
        return parsed.get();
    }
}
