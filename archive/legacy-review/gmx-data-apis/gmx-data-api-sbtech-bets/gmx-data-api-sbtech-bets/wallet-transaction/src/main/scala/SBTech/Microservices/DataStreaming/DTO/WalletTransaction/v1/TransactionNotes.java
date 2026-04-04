package SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class TransactionNotes {

  public static final String CARD_NUMBER_LINE_PREFIX = "Card Number: ";
  public static final String REASON_LINE_PREFIX = "Reason: ";
  public static final String DETAILS_LINE_PREFIX = "Provider: ";
  public static final String CORRELATION_ID_LINE_PREFIX = "EPS Log Correlation Id: ";

  public static List<String> parseString(String in) {
    return Arrays.stream(in.split("\\n"))
        .map(line -> line.replaceAll("\\r", ""))
        .filter(line -> !line.isEmpty())
        .collect(Collectors.toList());
  }

  public static String mkString(List<String> lines) {
    return String.join("\n", lines);
  }
}
