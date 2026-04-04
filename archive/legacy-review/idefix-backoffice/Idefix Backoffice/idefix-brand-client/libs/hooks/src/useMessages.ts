import { useIntl } from "react-intl";
import mapValues from "lodash/mapValues";

interface MessageWithValues {
  id: string;
  default?: string;
  values?: {
    [key: string]: any;
  };
}

type Messages = {
  [key: string]: string | MessageWithValues;
};

const useMessages = (messages: Messages): { [key: string]: string } => {
  const intl = useIntl();
  return mapValues(messages, message => {
    if (typeof message === "string") {
      return intl.messages[message as string] || message;
    } else {
      return intl.formatMessage(
        { id: message.id, defaultMessage: message.default },
        message.values
      );
    }
  }) as { [key: string]: string };
};

export { useMessages };
