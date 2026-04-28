import { Tag, Skeleton, Button, Row, Col, Card } from "antd";
import {
  // PhoneOutlined,
  EditOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { isEmpty } from "lodash";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getFixturesDetails,
  getFixturesDetailsSucceeded,
  selectBasicData,
} from "../../../lib/slices/fixturesDetailsSlice";
import { useApi } from "../../../services/api/api-service";
import { useTranslation } from "i18n";
import PageHeader from "../../../components/layout/page-header";
import { useRouter } from "next/router";
import { Id, Button as ButtonEnum, Method } from "@phoenix-ui/utils";
import { resolveStatus } from "../../../components/fixtures/utils/resolvers";
import { TalonFixture } from "../../../types/fixture";
import SportScore from "../../../components/sport/score";
import FixturesDetailsUpdate from "./update";
import { TalonMarket } from "../../../types/market";
import MarketsSelectionsPhoneBet from "../../../components/markets/phone-bet";
import MarketsSelectionsList from "../../../components/markets/odds";
import Spinner from "../../../components/layout/spinner";
import defaultMenuStructure from "../../../providers/menu/structure";
import { MenuModulesPathEnum } from "../../../providers/menu/structure";
// import FixtureLifecycleCancel from "../../../components/fixtures/lifecycle/cancel/index";
import FixtureLifecycleSuspend from "../../../components/fixtures/lifecycle/suspend/index";
import FixtureMarketsHistoryDrawer from "../../../components/fixtures/history/index";
import { FixtureMarketsHistoryData } from "../../../components/fixtures/history/index";

type FixturesDetailsContainerProps = {
  id: Id;
};

const FixturesDetailsContainer = ({ id }: FixturesDetailsContainerProps) => {
  const { push } = useRouter();
  const { t } = useTranslation("page-fixtures-details");
  const dispatch = useDispatch();
  const [forceUpdate, setForceUpdate] = useState(true);
  const [fixturePhoneBetModalVisible, setFixturePhoneBetModalVisible] =
    useState(false);

  const [historyVisible, setHistoryVisible] = useState(false);

  const basicData: TalonFixture = useSelector(selectBasicData);

  const [updateFormVisible, setUpdateFormVisible] = useState(false);

  const { fixtureName, markets, score, scoreHistory } = basicData || {};

  const [triggerFixturesDetailsApi, loadingData] = useApi(
    "admin/fixtures/:id",
    Method.GET,
    getFixturesDetailsSucceeded,
  );

  useEffect((): any => {
    if (forceUpdate) {
      const fetchFixtures = async () => {
        try {
          dispatch(getFixturesDetails());
          await triggerFixturesDetailsApi(undefined, {
            id,
          });
          setForceUpdate(false);
        } catch (err) {
          console.error({ err });
        }
      };
      fetchFixtures();
    }
  }, [forceUpdate]);

  const onLifecycleChange = () => {
    setForceUpdate(true);
  };

  const handleSelectionUpdate = () => {
    setForceUpdate(true);
  };

  const handleEditModalOpen = () => {
    setUpdateFormVisible(true);
  };

  const handleEditModalClose = () => {
    setUpdateFormVisible(false);
  };

  // const handlePhoneBetModalOpen = () => {
  //   setFixturePhoneBetModalVisible(true);
  // };

  const handlePhoneBetModalClose = () => {
    setFixturePhoneBetModalVisible(false);
  };

  const handleFixtureHistoryClick = () => {
    setHistoryVisible(true);
  };

  const handleCloseHistoryDrawer = () => {
    setHistoryVisible(false);
  };

  if (isEmpty(basicData)) {
    return <Skeleton loading={true} avatar active />;
  }

  const { color, tKey } = resolveStatus(basicData?.status, "STATUS");

  const extraComponents = loadingData
    ? [<Spinner key="action-pull" inline label={t("SPINNER_DATA")} />]
    : [];

  const extraButtons = [
    <FixtureLifecycleSuspend
      key="action-suspend"
      id={id}
      status={basicData?.status}
      labels={{
        active: t("ACTION_UNLOCK"),
        inactive: t("ACTION_LOCK"),
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
    // <FixtureLifecycleCancel
    //   key="action-cancel"
    //   id={id}
    //   status={basicData?.status}
    //   label={t("ACTION_CANCEL")}
    //   onComplete={onLifecycleChange}
    // />,
  ];

  const history: FixtureMarketsHistoryData = {
    scoreHistory,
    markets,
  };

  return (
    <>
      <PageHeader
        onBack={() =>
          push(
            defaultMenuStructure
              .get(MenuModulesPathEnum.RISK_MANAGEMENT)
              .fixtures.render(),
          )
        }
        title={t("HEADER", { fixtureName })}
        tags={<Tag color={color}>{t(tKey).toUpperCase()}</Tag>}
        extra={[...extraComponents, ...extraButtons]}
      />
      <Row gutter={16}>
        <Col span={8} xxl={4}>
          <Card
            title={t("HEADER_SCORE")}
            actions={[
              <Button
                key="fixture-history"
                type={ButtonEnum.Type.LINK}
                icon={<HistoryOutlined />}
                onClick={handleFixtureHistoryClick}
              >
                {t("ACTION_HISTORY")}
              </Button>,
            ]}
          >
            <SportScore score={score} wrapped={true} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          {markets.map((market: TalonMarket, n: number) => (
            <MarketsSelectionsList
              key={`${market.marketId}-selections`}
              data={market}
              onSelectionUpdate={handleSelectionUpdate}
              isLast={n === markets.length - 1}
            />
          ))}
        </Col>
      </Row>
      <FixtureMarketsHistoryDrawer
        visible={historyVisible}
        data={history}
        onClose={handleCloseHistoryDrawer}
      />
      <FixturesDetailsUpdate
        data={basicData}
        visible={updateFormVisible}
        onClose={handleEditModalClose}
      />
      <MarketsSelectionsPhoneBet
        fixtureName={fixtureName}
        markets={markets}
        visible={fixturePhoneBetModalVisible}
        onClose={handlePhoneBetModalClose}
      />
    </>
  );
};

export default FixturesDetailsContainer;
