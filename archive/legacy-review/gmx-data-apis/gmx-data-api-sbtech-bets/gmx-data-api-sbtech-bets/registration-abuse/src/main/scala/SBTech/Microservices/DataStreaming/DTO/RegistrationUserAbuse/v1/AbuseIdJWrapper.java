package SBTech.Microservices.DataStreaming.DTO.RegistrationUserAbuse.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class AbuseIdJWrapper {

    public List<AbuseId> fromJsonList(String json) {
        Optional<AbuseId[]> parsed = new JsonJUtil<>(AbuseId[].class).fromJson(json);
        AbuseId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public AbuseId fromJson(String json) {
        Optional<AbuseId> parsed = new JsonJUtil<>(AbuseId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(AbuseId.class).toJson(value);
        return parsed.get();
    }

}
