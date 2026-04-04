package SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class WalletTransactionJWrapper {

    public List<WalletTransaction> fromJsonList(String json) {
        Optional<WalletTransaction[]> parsed = new JsonJUtil<>(WalletTransaction[].class).fromJson(json);
        WalletTransaction[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public WalletTransaction fromJson(String json) {
        Optional<WalletTransaction> parsed = new JsonJUtil<>(WalletTransaction.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(WalletTransaction.class).toJson(value);
        return parsed.get();
    }

}
