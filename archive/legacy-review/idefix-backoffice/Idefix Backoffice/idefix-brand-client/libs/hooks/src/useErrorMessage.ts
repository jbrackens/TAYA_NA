import { useMessages } from "./useMessages";

const NOT_FOUND_ERROR = 404;
const SERVICE_UNAVAILABLE_ERROR = 503;

export const useErrorMessage = (statusCode?: number | null): string => {
  const messages = useMessages({
    notFound: { id: "error.not-found", default: "I can't find it" },
    serviceUnavailable: {
      id: "error.server-unreachable",
      default: "Unable to reach the server"
    },
    generic: {
      id: "error.generic",
      default: "An unknown error occurred, please try again or reload the page"
    }
  });

  switch (statusCode) {
    case NOT_FOUND_ERROR:
      return messages.notFound;
    case SERVICE_UNAVAILABLE_ERROR:
      return messages.serviceUnavailable;
    default:
      return messages.generic;
  }
};
