package SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

public class CasinoBetCustomerIdJWrapper {

    public List<CasinoBetCustomerId> fromJsonList(String json) {
        Optional<CasinoBetCustomerId[]> parsed = new JsonJUtil<>(CasinoBetCustomerId[].class).fromJson(json);
        CasinoBetCustomerId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public CasinoBetCustomerId fromJson(String json) {
        Optional<CasinoBetCustomerId> parsed = new JsonJUtil<>(CasinoBetCustomerId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(CasinoBetCustomerId.class).toJson(value);
        return parsed.get();
    }
}
