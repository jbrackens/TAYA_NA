import React from "react";
import { Space, Typography } from "antd";
import {
  Competitor,
  CompetitorScore,
  CompetitorQualifier,
  CompetitorQualifierEnum,
  Layout,
} from "@phoenix-ui/utils";
import { find, get } from "lodash";
import { ColorsEnum } from "../../../lib/enums/colors";
import { useTranslation } from "i18n";

const { Text } = Typography;

export type SportScoreProps = {
  score: CompetitorScore;
  competitors?: Competitor[];
  wrapped?: boolean;
};

const SportScore = ({ score, competitors }: SportScoreProps) => {
  const { t } = useTranslation("sports");

  const awayColor = score.away > score.home ? ColorsEnum.GREEN : ColorsEnum.RED;
  const homeColor = score.home > score.away ? ColorsEnum.GREEN : ColorsEnum.RED;

  const resolveCompetitorName = (
    type: CompetitorQualifier,
    fallbackLabel: string,
  ): string | undefined =>
    get(
      find(competitors, (comp) => comp.qualifier === type),
      "name",
      fallbackLabel,
    );

  return (
    <Space align={Layout.Align.START} direction={Layout.Direction.VERTICAL}>
      <Text style={{ color: homeColor }} strong>
        {resolveCompetitorName(CompetitorQualifierEnum.HOME, t("HOME"))}:{" "}
        {score.home}
      </Text>

      <Text style={{ color: awayColor }} strong>
        {resolveCompetitorName(CompetitorQualifierEnum.AWAY, t("AWAY"))}:{" "}
        {score.away}
      </Text>
    </Space>
  );
};

export default SportScore;
