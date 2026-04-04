package SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class CustomerDetailCustomerIdJWrapper {

    public List<CustomerDetailCustomerId> fromJsonList(String json) {
        Optional<CustomerDetailCustomerId[]> parsed = new JsonJUtil<>(CustomerDetailCustomerId[].class).fromJson(json);
        CustomerDetailCustomerId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public CustomerDetailCustomerId fromJson(String json) {
        Optional<CustomerDetailCustomerId> parsed = new JsonJUtil<>(CustomerDetailCustomerId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(CustomerDetailCustomerId.class).toJson(value);
        return parsed.get();
    }
}
