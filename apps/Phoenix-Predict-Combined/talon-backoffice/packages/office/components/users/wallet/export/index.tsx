import { Button, message } from "antd";
import React, { useEffect } from "react";
import { useApi } from "../../../../services/api/api-service";
import { useTranslation } from "i18n";
import { FileTextOutlined } from "@ant-design/icons";
import {
  Method,
  Id,
  Button as ButtonEnum,
  WalletActionTypeEnum,
  WalletProductEnum,
  useTimezone,
} from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import dayjs from "dayjs";

type UserDetailsWalletExportProps = {
  id: Id;
};

const UserDetailsWalletExport = ({ id }: UserDetailsWalletExportProps) => {
  const { t } = useTranslation("page-transactions");
  const router = useRouter();

  const [triggerExport, loadingExport, response] = useApi(
    "admin/punters/:id/transactions/export",
    Method.GET,
  );

  const { category, product, since, until } = router.query as {
    category?: Array<WalletActionTypeEnum>;
    product?: Array<WalletProductEnum>;
    since?: string;
    until?: string;
  };

  const { getTimeWithTimezone } = useTimezone();

  const onClick = () => {
    const filterSince = since
      ? getTimeWithTimezone(dayjs(since)).format("YYYY-MM-DDTHH:mm:ssZ")
      : undefined;

    const filterUntil = until
      ? getTimeWithTimezone(dayjs(until))
          .endOf("day")
          .format("YYYY-MM-DDTHH:mm:ssZ")
      : undefined;

    const filterCategory = category ? category : undefined;
    const filterProduct = product ? product : undefined;

    const filters = {
      category: filterCategory,
      product: filterProduct,
      since: filterSince,
      until: filterUntil,
    };

    const Export = async () => {
      try {
        await triggerExport(undefined, {
          id,
          query: {
            filters,
          },
        });
      } catch (err) {
        console.error({ err });
        message.error(`Failed to export transactions.`);
      }
    };
    Export();
  };

  useEffect(() => {
    if (!response.succeeded) return;
    message.success(`Export successful.`);
    const data = response.data;
    const url = window.URL.createObjectURL(
      new Blob([data], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Account Activity - ${id}.csv`);

    document.body.appendChild(link);

    link.click();
  }, [response.succeeded]);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          paddingRight: "30px",
        }}
      >
        <Button
          key="action-add-note"
          shape="round"
          loading={loadingExport}
          icon={<FileTextOutlined />}
          type={ButtonEnum.Type.PRIMARY}
          onClick={() => onClick()}
        >
          {t("ACTION_EXPORT")}
        </Button>
      </div>
    </>
  );
};

export default UserDetailsWalletExport;
