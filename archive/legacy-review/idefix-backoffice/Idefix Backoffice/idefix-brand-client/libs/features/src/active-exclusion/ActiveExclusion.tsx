import * as React from "react";
import styled from "styled-components";
import { IntlContext, IntlShape } from "react-intl";
import { useDispatch } from "react-redux";
import { format, parseISO } from "date-fns";
import { Exclusion } from "@brandserver-client/types";
import {
  useMessages,
  useLimitPeriodTranslation
} from "@brandserver-client/hooks";
import { formatMoney, getFnsLocale } from "@brandserver-client/utils";
import { getPlayer, fetchDeleteExclusion } from "@brandserver-client/lobby";
import { useSelector } from "react-redux";
import { useRegistry } from "@brandserver-client/ui";
import formatDistance from "date-fns/formatDistance";

const StyledActiveExclusion = styled.div`
  align-items: center;
  padding: 17px 24px;
  border-radius: 10px;
  width: 100%;
  background: ${p => p.theme.palette.secondaryLightest};
  display: flex;
  flex-direction: column;
  align-items: center;

  &.active-exclusion__internal {
    height: 136px;
  }

  .active-exclusion__title {
    ${p => p.theme.typography.text18Bold}
    color: ${p => p.theme.palette.primary};

    &--margin {
      margin-bottom: 33px;
    }
  }

  .active-exclusion__expires {
    ${p => p.theme.typography.text12}
    color: ${p => p.theme.palette.secondaryDarkest3};
    margin-bottom: 13px;
  }

  .active-exclusion__limit-left {
    ${p => p.theme.typography.text16}
    color: ${p => p.theme.palette.primary};
    text-align: center;
  }

  .active-exclusion__button,
  .active-exclusion__loader {
    margin-top: 18px;
  }

  .active-exclusion__loader {
    width: 56px;
    height: 56px;
  }

  .active-exclusion__button {
    height: 56px;
  }

  .active-exclusion__contact {
    margin-top: 1px;
    ${p => p.theme.typography.text14};
    color: ${p => p.theme.palette.secondaryDarkest3};
    text-align: center;
  }
`;

interface Props {
  exclusion: Exclusion;
  className?: string;
}

const ActiveExclusion: React.FC<Props> = ({
  exclusion: {
    limitLeft,
    limitId,
    limitDate,
    limitType,
    limitPeriodType,
    limitValue,
    expires,
    canBeCancelled,
    isInternal
  },
  className
}) => {
  const [loading, setLoading] = React.useState(false);
  const { currencySymbol } = useSelector(getPlayer);
  const { Button, Loader } = useRegistry();
  const dispatch = useDispatch();

  const intl = React.useContext(IntlContext as React.Context<IntlShape>);

  const messages = useMessages({
    lossLimit: {
      id: "active-exclusion.loss-limit",
      values: {
        value: formatMoney(limitValue!, currencySymbol)
      }
    },
    test: "active-exclusion.deposit-limit",
    depositLimit: {
      id: "active-exclusion.deposit-limit",
      values: {
        value: formatMoney(limitValue!, currencySymbol)
      }
    },
    playtimeLimit: {
      id: "active-exclusion.playtime-limit",
      values: {
        value: limitValue && limitValue / 60
      }
    },
    timeoutLimit: "active-exclusion.timeout",
    betLimit: {
      id: "active-exclusion.bet",
      values: {
        value: formatMoney(limitValue!, currencySymbol)
      }
    },
    expires: {
      id: "active-exclusion.expires",
      values: {
        value:
          expires &&
          format(parseISO(expires), "do MMMM yyyy HH:mm", {
            locale: getFnsLocale(intl.locale)
          })
      }
    },
    cancel: "active-exclusion.cancel",
    hours: "selfexclusion.confirmation.hours",
    session: "selfexclusion.confirmation.session",
    isFull: "selfexclusion.is-full",
    lossLimitLeft: {
      id: "active-exclusion.loss-limit.left",
      values: {
        value: formatMoney(limitLeft!, currencySymbol)
      }
    },
    depositLimitLeft: {
      id: "active-exclusion.deposit-limit.left",
      values: {
        value: formatMoney(limitLeft!, currencySymbol)
      }
    },
    paytimeLimitLeft: {
      id: "active-exclusion.playtime-limit.left",
      values: {
        value:
          limitDate &&
          formatDistance(new Date(limitDate), new Date(), {
            locale: getFnsLocale(intl.locale)
          })
      }
    },
    timeoutLimitLeft: "active-exclusion.timeout-limit.left",
    contactSupport: "active-exclusion.contact-support"
  });

  const limitPeriodTranslation = useLimitPeriodTranslation(limitPeriodType);

  const getTitle = () => {
    switch (limitType) {
      case "loss":
        return `${messages.lossLimit}/${limitPeriodTranslation}`;
      case "deposit":
        return `${messages.depositLimit}/${limitPeriodTranslation}`;

      case "play":
        return messages.playtimeLimit;
      case "timeout":
        return messages.timeoutLimit;
      case "bet":
        return `${messages.betLimit}/${limitPeriodTranslation}`;
    }
  };

  const getLimitLeft = () => {
    switch (limitType) {
      case "loss":
        return messages.lossLimitLeft;
      case "deposit":
        return messages.depositLimitLeft;
      case "play":
        return messages.paytimeLimitLeft;
      case "timeout":
        return messages.timeoutLimitLeft;
      default:
        return "";
    }
  };

  const cancelLimit = async () => {
    setLoading(true);
    if (limitId) {
      await dispatch(fetchDeleteExclusion(limitId) as any);
    }
    setLoading(false);
  };

  if (isInternal) {
    return (
      <StyledActiveExclusion
        className={`${className} active-exclusion__internal`}
      >
        <div
          className={"active-exclusion__title active-exclusion__title--margin"}
        >
          {getTitle()}
        </div>
        <div className="active-exclusion__limit-left">{getLimitLeft()}</div>
        <div className="active-exclusion__contact">
          {messages.contactSupport}
        </div>
      </StyledActiveExclusion>
    );
  }

  return (
    <StyledActiveExclusion className={className}>
      <div className={"active-exclusion__title"}>{getTitle()}</div>
      <div className="active-exclusion__expires">{messages.expires}</div>
      <div className="active-exclusion__limit-left">{getLimitLeft()}</div>
      {loading ? (
        <Loader className="active-exclusion__loader" />
      ) : (
        <Button
          className="active-exclusion__button"
          color={Button.Color.accent}
          onClick={cancelLimit}
          disabled={!canBeCancelled}
        >
          {messages.cancel}
        </Button>
      )}
    </StyledActiveExclusion>
  );
};

export { ActiveExclusion };
