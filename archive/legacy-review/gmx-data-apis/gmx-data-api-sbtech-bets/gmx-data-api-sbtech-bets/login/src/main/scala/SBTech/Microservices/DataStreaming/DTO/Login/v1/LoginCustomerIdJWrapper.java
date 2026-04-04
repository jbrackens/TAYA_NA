package SBTech.Microservices.DataStreaming.DTO.Login.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class LoginCustomerIdJWrapper {

    public List<LoginCustomerId> fromJsonList(String json) {
        Optional<LoginCustomerId[]> parsed = new JsonJUtil<>(LoginCustomerId[].class).fromJson(json);
        LoginCustomerId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public LoginCustomerId fromJson(String json) {
        Optional<LoginCustomerId> parsed = new JsonJUtil<>(LoginCustomerId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(LoginCustomerId.class).toJson(value);
        return parsed.get();
    }

}
