import React from "react";
import { BreakTimeContainer } from "./index.styled";
import { useTranslation } from "i18n";
const dayjs = require("dayjs");

type CountDownComponentProps = {
  periodName: string;
  time: string;
};

const CountDownComponent: React.FC<CountDownComponentProps> = ({
  periodName,
  time,
}) => {
  const { t } = useTranslation(["deposit-limits"]);

  const currentDate = dayjs();
  const endDate = dayjs(time);
  const difference = endDate.diff(currentDate, "hours");
  const days = Math.trunc(difference / 24);
  const hours = difference - days * 24;

  return (
    <BreakTimeContainer>
      {periodName}
      <span>{days}</span>
      <span>{t("DAYS")},</span>
      {hours > 0 ? (
        <>
          <span>{hours}</span>
          <span>{t("HOURS")}</span>
        </>
      ) : (
        <span></span>
      )}
    </BreakTimeContainer>
  );
};
export { CountDownComponent };
