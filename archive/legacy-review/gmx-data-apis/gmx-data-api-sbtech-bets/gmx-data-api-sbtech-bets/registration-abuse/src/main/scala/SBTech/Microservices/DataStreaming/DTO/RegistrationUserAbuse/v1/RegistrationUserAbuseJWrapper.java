package SBTech.Microservices.DataStreaming.DTO.RegistrationUserAbuse.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class RegistrationUserAbuseJWrapper {

    public List<RegistrationUserAbuse> fromJsonList(String json) {
        Optional<RegistrationUserAbuse[]> parsed = new JsonJUtil<>(RegistrationUserAbuse[].class).fromJson(json);
        RegistrationUserAbuse[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public RegistrationUserAbuse fromJson(String json) {
        Optional<RegistrationUserAbuse> parsed = new JsonJUtil<>(RegistrationUserAbuse.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(RegistrationUserAbuse.class).toJson(value);
        return parsed.get();
    }

}
