import { Tag, Skeleton, Button, Row, Col, Card, Statistic, Form } from "antd";
import {
  // PhoneOutlined,
  EditOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { isEmpty } from "lodash";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getMarketsDetails,
  getMarketsDetailsSucceeded,
  selectBasicData,
  postMarketDetailsUpdate,
  postMarketDetailsUpdateSucceeded,
} from "../../../lib/slices/marketsDetailsSlice";
import { useApi } from "../../../services/api/api-service";
import { useTranslation } from "i18n";
import PageHeader from "../../../components/layout/page-header";
import { useRouter } from "next/router";
import { Id, Button as ButtonEnum, Method, Layout } from "@phoenix-ui/utils";
import { resolveLifecycle } from "../../../components/markets/utils/resolvers";
import { TalonMarket, TalonSingleMarketFixture } from "../../../types/market.d";
import SportScore from "../../../components/sport/score";
import MarketsSelectionsList from "../../../components/markets/odds";
import MarketsDetailsUpdate from "./update";
import MarketsSelectionsPhoneBet from "../../../components/markets/phone-bet";
import { EllipsisOutlined } from "@ant-design/icons";
import { FormItemPreview } from "../../../components/form/item/index.styled";
import defaultMenuStructure from "../../../providers/menu/structure";
import { MenuModulesPathEnum } from "../../../providers/menu/structure";
import MarketLifecycleSuspend from "../../../components/markets/lifecycle/suspend";
import MarketLifecycleSettle from "../../../components/markets/lifecycle/settle";
import MarketLifecycleCancel from "../../../components/markets/lifecycle/cancel";
import Spinner from "../../../components/layout/spinner";
import FixtureMarketsHistoryDrawer from "../../../components/fixtures/history";
import { FixtureMarketsHistoryData } from "../../../components/fixtures/history/index";

type MarketsDetailsContainerProps = {
  id: Id;
};

type MarketDetailsPayload = Pick<TalonMarket, "marketName">;

const MarketsDetailsContainer = ({ id }: MarketsDetailsContainerProps) => {
  const { push } = useRouter();
  const { t } = useTranslation("page-markets-details");
  const dispatch = useDispatch();
  const router = useRouter();
  const [forceUpdate, setForceUpdate] = useState(false);
  const [submitDataChanged, setSubmitDataChanged] = useState(false);
  const [submitDataPayload, setSubmitDataPayload] = useState<
    MarketDetailsPayload | undefined
  >(undefined);
  const [marketPhoneBetModalVisible, setMarketPhoneBetModalVisible] = useState(
    false,
  );
  const [historyVisible, setHistoryVisible] = useState(false);

  const basicData: TalonSingleMarketFixture = useSelector(selectBasicData);

  const [updateFormVisible, setUpdateFormVisible] = useState(false);

  const { fixtureName, market, score, scoreHistory } = basicData || {};
  const { marketName, currentLifecycle, lifecycleChanges, selectionOdds } =
    market || {};
  const { type: lifecycle } = currentLifecycle || {};

  const [triggerMarketsDetailsApi, loadingData] = useApi(
    "admin/trading/markets/:id",
    Method.GET,
    getMarketsDetailsSucceeded,
  );

  const [triggerMarketsDetailsUpdateApi, loadingDataChange] = useApi(
    "admin/trading/markets/:id",
    Method.POST,
    postMarketDetailsUpdateSucceeded,
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

  useEffect(() => {
    if (submitDataChanged) {
      const postChanges = async () => {
        try {
          dispatch(postMarketDetailsUpdate());
          await triggerMarketsDetailsUpdateApi(submitDataPayload, {
            id,
          });
        } catch (err) {
          console.error({ err });
        }
        setSubmitDataChanged(false);
        setSubmitDataPayload(undefined);
        handleEditModalClose();
      };
      postChanges();
    }
  }, [submitDataChanged]);

  const onLifecycleChange = () => {
    setForceUpdate(true);
  };

  const handleDataUpdate = (payload: MarketDetailsPayload) => {
    setSubmitDataPayload(payload);
    setSubmitDataChanged(true);
  };

  const handleEditModalOpen = () => {
    setUpdateFormVisible(true);
  };

  const handleEditModalClose = () => {
    setUpdateFormVisible(false);
  };

  // const handlePhoneBetModalOpen = () => {
  //   setMarketPhoneBetModalVisible(true);
  // };

  const handlePhoneBetModalClose = () => {
    setMarketPhoneBetModalVisible(false);
  };

  const handleMarketHistoryClick = () => {
    setHistoryVisible(true);
  };

  const handleCloseHistoryDrawer = () => {
    setHistoryVisible(false);
  };

  if (isEmpty(basicData)) {
    return <Skeleton loading={true} avatar active />;
  }

  const handleFixtureDetailsClick = () => {
    router.push(
      defaultMenuStructure
        .get(MenuModulesPathEnum.RISK_MANAGEMENT)
        .fixtures.details.render({
          id: basicData.fixtureId,
        }),
    );
  };

  const { color, tKey } = resolveLifecycle(
    basicData.market.currentLifecycle.type,
    "LIFECYCLE_TYPE",
  );

  const extraComponents = loadingData
    ? [<Spinner key="action-pull" inline label={t("SPINNER_DATA")} />]
    : [];

  const extraButtons = [
    <MarketLifecycleSuspend
      key="action-suspend"
      id={id}
      lifecycle={lifecycle}
      labels={{
        active: t("ACTION_UNLOCK"),
        inactive: t("ACTION_LOCK"),
      }}
      onComplete={onLifecycleChange}
    />,
    <MarketLifecycleSettle
      key="action-settle"
      id={id}
      lifecycle={lifecycle}
      selections={selectionOdds}
      labels={{
        settle: t("ACTION_SETTLE"),
        resettle: t("ACTION_RESETTLE"),
      }}
      onComplete={onLifecycleChange}
    />,
    // <Button
    //   key="action-phone-bet"
    //   shape={ButtonEnum.Shape.ROUND}
    //   icon={<PhoneOutlined />}
    //   onClick={handlePhoneBetModalOpen}
    // >
    //   {t("ACTION_PHONE_BET")}
    // </Button>,
    <Button
      key="action-edit"
      shape={ButtonEnum.Shape.ROUND}
      icon={<EditOutlined />}
      onClick={handleEditModalOpen}
    >
      {t("ACTION_EDIT")}
    </Button>,
    <MarketLifecycleCancel
      key="action-cancel"
      id={id}
      lifecycle={lifecycle}
      label={t("ACTION_CANCEL")}
      onComplete={onLifecycleChange}
    />,
  ];

  const history: FixtureMarketsHistoryData = {
    scoreHistory,
    lifecycleChanges,
  };

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
        extra={[...extraComponents, ...extraButtons]}
      />
      <Row gutter={16}>
        <Col span={8} xxl={4}>
          <Card
            title={t("HEADER_DETAILS")}
            actions={[
              <Button
                key="fixture-details"
                type={ButtonEnum.Type.LINK}
                icon={<EllipsisOutlined />}
                onClick={handleFixtureDetailsClick}
              >
                {t("ACTION_DETAILS")}
              </Button>,
              <Button
                key="fixture-history"
                type={ButtonEnum.Type.LINK}
                icon={<HistoryOutlined />}
                onClick={handleMarketHistoryClick}
              >
                {t("ACTION_HISTORY")}
              </Button>,
            ]}
          >
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

      <FixtureMarketsHistoryDrawer
        visible={historyVisible}
        data={history}
        onClose={handleCloseHistoryDrawer}
        single
      />
      <MarketsDetailsUpdate
        data={market}
        visible={updateFormVisible}
        loading={loadingDataChange}
        onSubmit={handleDataUpdate}
        onClose={handleEditModalClose}
      />
      <MarketsSelectionsPhoneBet
        fixtureName={fixtureName}
        markets={[market]}
        visible={marketPhoneBetModalVisible}
        onClose={handlePhoneBetModalClose}
      />
    </>
  );
};

export default MarketsDetailsContainer;
