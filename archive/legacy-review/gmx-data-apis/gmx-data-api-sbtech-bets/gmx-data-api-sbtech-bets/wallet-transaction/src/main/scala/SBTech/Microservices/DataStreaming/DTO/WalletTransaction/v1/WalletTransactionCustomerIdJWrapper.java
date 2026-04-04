package SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class WalletTransactionCustomerIdJWrapper {

    public List<WalletTransactionCustomerId> fromJsonList(String json) {
        Optional<WalletTransactionCustomerId[]> parsed = new JsonJUtil<>(WalletTransactionCustomerId[].class).fromJson(json);
        WalletTransactionCustomerId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public WalletTransactionCustomerId fromJson(String json) {
        Optional<WalletTransactionCustomerId> parsed = new JsonJUtil<>(WalletTransactionCustomerId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(WalletTransactionCustomerId.class).toJson(value);
        return parsed.get();
    }

}
