package SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class CustomerDetailJWrapper {

    public List<CustomerDetail> fromJsonList(String json) {
        Optional<CustomerDetail[]> parsed = new JsonJUtil<>(CustomerDetail[].class).fromJson(json);
        CustomerDetail[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public CustomerDetail fromJson(String json) {
        Optional<CustomerDetail> parsed = new JsonJUtil<>(CustomerDetail.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(CustomerDetail.class).toJson(value);
        return parsed.get();
    }
}
