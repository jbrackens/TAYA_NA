package SBTech.Microservices.DataStreaming.DTO.SportBets.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class SettlementDataJWrapper {

    public List<SettlementData> fromJsonList(String json) {
        Optional<SettlementData[]> parsed = new JsonJUtil<>(SettlementData[].class).fromJson(json);
        SettlementData[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public SettlementData fromJson(String json) {
        Optional<SettlementData> parsed = new JsonJUtil<>(SettlementData.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(SettlementData.class).toJson(value);
        return parsed.get();
    }

}
