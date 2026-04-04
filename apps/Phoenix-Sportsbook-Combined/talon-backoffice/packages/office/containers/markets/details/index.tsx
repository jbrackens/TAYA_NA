import { Tag, Skeleton, Row, Col, Card, Statistic, Form } from "antd";
import { isEmpty } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getMarketsDetails,
  getMarketsDetailsSucceeded,
  selectBasicData,
} from "../../../lib/slices/marketsDetailsSlice";
import { useApi } from "../../../services/api/api-service";
import { useTranslation } from "i18n";
import PageHeader from "../../../components/layout/page-header";
import { useRouter } from "next/router";
import { Id, Method, Layout, PunterRoleEnum } from "@phoenix-ui/utils";
import { resolveLifecycle } from "../../../components/markets/utils/resolvers";
import { TalonSingleMarketFixture } from "../../../types/market.d";
import SportScore from "../../../components/sport/score";
import MarketsSelectionsList from "../../../components/markets/odds";
import { FormItemPreview } from "../../../components/form/item/index.styled";
import defaultMenuStructure from "../../../providers/menu/structure";
import { MenuModulesPathEnum } from "../../../providers/menu/structure";
import Spinner from "../../../components/layout/spinner";
import MarketLifecycleSuspend from "../../../components/markets/lifecycle/suspend";
import GoMarketSettle from "../../../components/markets/lifecycle/settle/go-settle";
import {
  resolveToken,
  validateAndCheckEligibility,
} from "../../../utils/auth";

type MarketsDetailsContainerProps = {
  id: Id;
};

const MarketsDetailsContainer = ({ id }: MarketsDetailsContainerProps) => {
  const { push } = useRouter();
  const { t } = useTranslation("page-markets-details");
  const dispatch = useDispatch();
  const [forceUpdate, setForceUpdate] = useState(false);

  // Backend PUT /admin/markets/:id/status allows operator + admin only (not trader).
  // Hide the suspend/reopen button for roles that would 403.
  const canMutateMarketStatus = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.OPERATOR,
    ]);
  }, []);

  const basicData: TalonSingleMarketFixture = useSelector(selectBasicData);

  const { fixtureName, market, score } = basicData || {};
  const { marketName } = market || {};

  const [triggerMarketsDetailsApi, loadingData] = useApi(
    "admin/markets/:id",
    Method.GET,
    getMarketsDetailsSucceeded,
  );

  useEffect((): any => {
    const fetchDetails = async () => {
      try {
        dispatch(getMarketsDetails());
        await triggerMarketsDetailsApi(undefined, {
          id,
        });
        setForceUpdate(false);
      } catch (err) {
        console.error({ err });
      }
    };
    fetchDetails();
  }, [forceUpdate]);

  if (isEmpty(basicData)) {
    return <Skeleton loading={true} avatar active />;
  }

  const { color, tKey } = resolveLifecycle(
    basicData.market.currentLifecycle.type,
    "LIFECYCLE_TYPE",
  );

  const extraComponents = loadingData
    ? [<Spinner key="action-pull" inline label={t("SPINNER_DATA")} />]
    : [
        // M3-S1: suspend/reopen uses Go PUT /admin/markets/:id/status
        // M3-S2: settle uses Go POST /admin/markets/:id/settle
        // Only shown for operator/admin — trader can view but not mutate
        ...(canMutateMarketStatus
          ? [
              <MarketLifecycleSuspend
                key="action-suspend"
                id={basicData.market.marketId}
                lifecycle={basicData.market.currentLifecycle.type}
                labels={{
                  active: t("ACTION_UNSUSPEND"),
                  inactive: t("ACTION_SUSPEND"),
                }}
                onComplete={() => setForceUpdate(true)}
              />,
              <GoMarketSettle
                key="action-settle"
                id={basicData.market.marketId}
                lifecycle={basicData.market.currentLifecycle.type}
                selections={basicData.market.selectionOdds || []}
                label={t("ACTION_SETTLE") || "Settle"}
                onComplete={() => setForceUpdate(true)}
              />,
            ]
          : []),
      ];

  // Target B: cancel, edit, and history remain gated.
  // Suspend/reopen (M3-S1) and single-winner settle (M3-S2) are live.

  return (
    <>
      <PageHeader
        onBack={() =>
          push(
            defaultMenuStructure
              .get(MenuModulesPathEnum.RISK_MANAGEMENT)
              .markets.render(),
          )
        }
        title={t("HEADER", { marketName })}
        subTitle={t("HEADER_SUB", { fixtureName })}
        tags={<Tag color={color}>{t(tKey).toUpperCase()}</Tag>}
        extra={extraComponents}
      />
      <Row gutter={16}>
        <Col span={8} xxl={4}>
          <Card title={t("HEADER_DETAILS")}>
            <Form layout={Layout.Direction.VERTICAL}>
              <FormItemPreview label={t("HEADER_FIXTURE_NAME")}>
                {fixtureName}
              </FormItemPreview>
              <FormItemPreview label={t("HEADER_SCORE")}>
                <SportScore score={score} wrapped={true} />
              </FormItemPreview>
            </Form>
          </Card>
        </Col>
        <Col span={8} xxl={4}>
          <Card title={t("HEADER_EXPOSURE")}>
            <Statistic
              value={market?.exposure?.amount}
              precision={2}
              prefix={market?.exposure?.currency}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <MarketsSelectionsList title={t("HEADER_SELECTION")} data={market} />
        </Col>
      </Row>
    </>
  );
};

export default MarketsDetailsContainer;
