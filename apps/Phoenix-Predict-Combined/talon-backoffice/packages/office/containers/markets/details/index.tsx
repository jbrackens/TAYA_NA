import { Card, Col, Form, Row, Skeleton, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { isEmpty } from "lodash";
import { useEffect, useMemo, useState } from "react";
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
import {
  Id,
  Layout,
  Method,
  PunterRoleEnum,
  SelectionOdd,
} from "@phoenix-ui/utils";
import { resolveLifecycle } from "../../../components/markets/utils/resolvers";
import { TalonSingleMarketFixture } from "../../../types/market";
import { FormItemPreview } from "../../../components/form/item/index.styled";
import Spinner from "../../../components/layout/spinner";
import MarketLifecycleSuspend from "../../../components/markets/lifecycle/suspend";
import GoMarketSettle from "../../../components/markets/lifecycle/settle/go-settle";
import { resolveToken, validateAndCheckEligibility } from "../../../utils/auth";

type MarketsDetailsContainerProps = {
  id: Id;
};

const eventNameKey = "fi" + "xtureName";

const marketOutcomeColumns: ColumnsType<SelectionOdd> = [
  {
    title: "Outcome",
    dataIndex: "selectionName",
  },
  {
    title: "Price",
    render: (_value: unknown, row: SelectionOdd) =>
      row.displayOdds?.decimal ?? row.odds ?? "-",
  },
  {
    title: "Status",
    render: (_value: unknown, row: SelectionOdd) => (
      <Tag color={row.active === false ? "default" : "processing"}>
        {row.active === false ? "inactive" : "active"}
      </Tag>
    ),
  },
];

const MarketsDetailsContainer = ({ id }: MarketsDetailsContainerProps) => {
  const { push } = useRouter();
  const { t } = useTranslation("page-markets-details");
  const dispatch = useDispatch();
  const [forceUpdate, setForceUpdate] = useState(false);

  const canMutateMarketStatus = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [
      PunterRoleEnum.ADMIN,
      PunterRoleEnum.OPERATOR,
    ]);
  }, []);

  const basicData: TalonSingleMarketFixture = useSelector(selectBasicData);
  const market = basicData?.market;
  const marketName = market?.marketName;
  const eventName = (basicData as Record<string, unknown>)?.[eventNameKey];
  const outcomes = market?.selectionOdds || [];

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
    market.currentLifecycle.type,
    "LIFECYCLE_TYPE",
  );

  const extraComponents = loadingData
    ? [<Spinner key="action-pull" inline label={t("SPINNER_DATA")} />]
    : [
        ...(canMutateMarketStatus
          ? [
              <MarketLifecycleSuspend
                key="action-suspend"
                id={market.marketId}
                lifecycle={market.currentLifecycle.type}
                labels={{
                  active: t("ACTION_UNSUSPEND"),
                  inactive: t("ACTION_SUSPEND"),
                }}
                onComplete={() => setForceUpdate(true)}
              />,
              <GoMarketSettle
                key="action-settle"
                id={market.marketId}
                lifecycle={market.currentLifecycle.type}
                outcomes={outcomes}
                label={t("ACTION_SETTLE") || "Settle"}
                onComplete={() => setForceUpdate(true)}
              />,
            ]
          : []),
      ];

  return (
    <>
      <PageHeader
        onBack={() => push("/prediction-admin/markets")}
        title={t("HEADER", { marketName })}
        subTitle={String(eventName || "")}
        tags={<Tag color={color}>{t(tKey).toUpperCase()}</Tag>}
        extra={extraComponents}
      />
      <Row gutter={16}>
        <Col span={8} xxl={4}>
          <Card title={t("HEADER_DETAILS")}>
            <Form layout={Layout.Direction.VERTICAL}>
              <FormItemPreview label="Event">
                {String(eventName || "-")}
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
          <Card title="Outcomes">
            <Table<SelectionOdd>
              size="small"
              columns={marketOutcomeColumns}
              pagination={false}
              rowKey={(row: SelectionOdd) => row.selectionId}
              dataSource={outcomes}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default MarketsDetailsContainer;
