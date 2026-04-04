import React, { useState } from "react";
import { useTranslation } from "i18n";
import { SelectionOdd, Layout, Button as ButtonEnum } from "@phoenix-ui/utils";
import Table from "../../layout/table";
// import MarketsSelectionsAlign from "./align-input";
import { Space, Button } from "antd";
import {
  // CalculatorOutlined,
  LockOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
// import TableActions from "../../layout/table/actions";
import PageHeader from "../../layout/page-header";
import { TalonMarket } from "../../../types/market.d";
import { TalonSelectionOddAlign } from "../../../types/selections";
import MarketsSelectionsPlaceStatic from "./static";
import { Wrapper, WrapperDivider } from "./index.styled";
import { useRouter } from "next/router";
import defaultMenuStructure from "../../../providers/menu/structure";
import { MenuModulesPathEnum } from "../../../providers/menu/structure";

type MarketsSelectionsListProps = {
  title?: string;
  data: TalonMarket;
  isLast?: boolean;
  onSelectionUpdate?: Function;
};

const MarketsSelectionsList = ({
  title,
  data,
  isLast,
  onSelectionUpdate,
}: MarketsSelectionsListProps) => {
  const { t } = useTranslation(["common", "page-markets-details"]);
  const router = useRouter();

  const { marketId, marketName, selectionOdds } = data;

  const columns = [
    {
      title: t("page-markets-details:HEADER_SELECTION_NAME"),
      dataIndex: "selectionName",
    },
    {
      title: t("page-markets-details:HEADER_SELECTION_ODD"),
      render: ({ displayOdds, isStatic }: SelectionOdd) => (
        <Space align={Layout.Align.CENTER}>
          {isStatic && <LockOutlined />}{" "}
          {displayOdds ? displayOdds.decimal : "-"}
        </Space>
      ),
    },
    // {
    //   title: t("page-markets-details:HEADER_SELECTION_ALIGN_BY"),
    //   render: ({ selectionId, displayOdds, isStatic }: SelectionOdd) => (
    //     <>
    //       {displayOdds ? (
    //         <Space align={Layout.Align.CENTER}>
    //           <MarketsSelectionsAlign
    //             marketId={marketId}
    //             selectionId={selectionId}
    //             disabled={isStatic}
    //             odds={displayOdds.decimal}
    //             title={t("common:APPLY")}
    //             onComplete={onSelectionUpdate}
    //           />
    //         </Space>
    //       ) : (
    //         <></>
    //       )}
    //     </>
    //   ),
    // },
    // {
    //   title: (
    //     <TableActions>{t("page-markets-details:HEADER_ACTIONS")}</TableActions>
    //   ),
    //   width: 100,
    //   render: (value: SelectionOdd) => (
    //     <TableActions>
    //       <Button
    //         size={Layout.Size.SMALL}
    //         type={ButtonEnum.Type.LINK}
    //         onClick={() => handleMarketSingleSelectionModalOpen(value)}
    //         icon={<CalculatorOutlined />}
    //       >
    //         {t("page-markets-details:ACTION_SELECTION_STATIC_BET")}
    //       </Button>
    //     </TableActions>
    //   ),
    // },
  ];

  const [activeSelection, setMarketSingleSelection] = useState<
    TalonSelectionOddAlign
  >();
  const [
    activeSelectionModalVisible,
    setMarketSingleSelectionModalVisibility,
  ] = useState(false);
  const [
    activeMarketSelectionModalVisible,
    setMarketBatchSelectionModalVisible,
  ] = useState(false);

  // const handleMarketSingleSelectionModalOpen = (value: SelectionOdd) => {
  //   setMarketSingleSelection(value);
  //   setMarketSingleSelectionModalVisibility(true);
  // };

  const handleMarketSingleSelectionModalClose = () => {
    setMarketSingleSelection(undefined);
    setMarketSingleSelectionModalVisibility(false);
  };

  // const handleMarketBatchSelectionModalOpen = () => {
  //   setMarketBatchSelectionModalVisible(true);
  // };

  const handleMarketBatchSelectionModalClose = () => {
    setMarketBatchSelectionModalVisible(false);
  };

  const handleMarketDetailsClick = () => {
    router.push(
      defaultMenuStructure
        .get(MenuModulesPathEnum.RISK_MANAGEMENT)
        .markets.details.render({
          id: marketId,
        }),
    );
  };

  return (
    <Wrapper>
      <PageHeader
        title={title || marketName}
        extra={
          <Space
            direction={Layout.Direction.HORIZONTAL}
            align={Layout.Align.CENTER}
          >
            {!title && (
              <Button
                shape={ButtonEnum.Shape.ROUND}
                icon={<EllipsisOutlined />}
                onClick={handleMarketDetailsClick}
              >
                {t("page-markets-details:ACTION_DETAILS")}
              </Button>
            )}
            {/* <Button
              shape={ButtonEnum.Shape.ROUND}
              icon={<CalculatorOutlined />}
              onClick={handleMarketBatchSelectionModalOpen}
            >
              {t("page-markets-details:ACTION_STATIC_BET")}
            </Button> */}
          </Space>
        }
      />
      <Table
        size={Layout.Size.SMALL}
        columns={columns}
        pagination={false}
        rowKey={(record: SelectionOdd) => record.selectionId}
        dataSource={selectionOdds}
      />
      <MarketsSelectionsPlaceStatic
        marketId={marketId}
        visible={activeSelectionModalVisible}
        onComplete={onSelectionUpdate}
        onClose={handleMarketSingleSelectionModalClose}
        selection={activeSelection}
      />
      <MarketsSelectionsPlaceStatic
        multi
        marketId={marketId}
        marketName={marketName}
        visible={activeMarketSelectionModalVisible}
        onComplete={onSelectionUpdate}
        onClose={handleMarketBatchSelectionModalClose}
        selection={selectionOdds}
      />
      {!isLast && <WrapperDivider />}
    </Wrapper>
  );
};

export default MarketsSelectionsList;
