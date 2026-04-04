import React from "react";
import { useTranslation } from "i18n";
import dayjs from "dayjs";
import { TablePagination } from "../../../../types/filters";
import {
  TalonPunterNotes,
  TalonPunterNotesItem,
  TalonPunterNotesTypeEnum,
  TalonPunterNotesAuthor,
} from "../../../../types/punters.d";
import Table from "../../../layout/table";
import { Popover } from "antd";
import { useTimezone } from "@phoenix-ui/utils";

type UsersDetailsNotesListProps = {
  data: TalonPunterNotes;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
};

const UsersDetailsNotesList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: UsersDetailsNotesListProps) => {
  const { t } = useTranslation(["common", "page-users-details"]);

  const { getTimeWithTimezone } = useTimezone();

  const columns = [
    {
      title: t("page-users-details:HEADER_NOTE_DATE"),
      width: 240,
      dataIndex: "createdAt",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
    },
    {
      title: t("page-users-details:HEADER_NOTE_AUTHOR"),
      width: 240,
      dataIndex: "authorName",
      render: (value: TalonPunterNotesAuthor, record: TalonPunterNotesItem) => (
        <>
          {record.noteType === TalonPunterNotesTypeEnum.MANUAL ? (
            <Popover
              content={
                <>
                  <strong>
                    {t("page-users-details:HEADER_NOTE_ADMIN_ID")}:{" "}
                  </strong>
                  {record.authorId}
                </>
              }
              title={
                <>
                  {value.firstName} {value.lastName}
                </>
              }
            >
              {value.firstName} {value.lastName}
            </Popover>
          ) : (
            <>System</>
          )}
        </>
      ),
    },
    {
      title: t("page-users-details:HEADER_NOTE"),
      dataIndex: "text",
    },
  ];

  return (
    <Table
      columns={columns}
      rowKey={(record) => record.noteId}
      dataSource={data}
      pagination={{
        ...pagination,
        pageSizeOptions: ["10", "20", "50", "100"],
        showSizeChanger: true,
      }}
      loading={isLoading}
      scrollable={true}
      onChange={handleTableChange}
    />
  );
};

export default UsersDetailsNotesList;
