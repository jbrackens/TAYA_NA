package SBTech.Microservices.DataStreaming.DTO.SportBets.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class SettlementDataCustomerIdJWrapper {

    public List<SettlementDataCustomerId> fromJsonList(String json) {
        Optional<SettlementDataCustomerId[]> parsed = new JsonJUtil<>(SettlementDataCustomerId[].class).fromJson(json);
        SettlementDataCustomerId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public SettlementDataCustomerId fromJson(String json) {
        Optional<SettlementDataCustomerId> parsed = new JsonJUtil<>(SettlementDataCustomerId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(SettlementDataCustomerId.class).toJson(value);
        return parsed.get();
    }

}
