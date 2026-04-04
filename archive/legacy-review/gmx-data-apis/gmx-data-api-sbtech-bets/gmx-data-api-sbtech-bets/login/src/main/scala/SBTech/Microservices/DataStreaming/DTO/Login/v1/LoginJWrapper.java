package SBTech.Microservices.DataStreaming.DTO.Login.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class LoginJWrapper {

    public List<Login> fromJsonList(String json) {
        Optional<Login[]> parsed = new JsonJUtil<>(Login[].class).fromJson(json);
        Login[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public Login fromJson(String json) {
        Optional<Login> parsed = new JsonJUtil<>(Login.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(Login.class).toJson(value);
        return parsed.get();
    }

}
