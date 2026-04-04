import { timezones, useLocalStorageVariables } from "@phoenix-ui/utils";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Modal,
  Row,
  Select,
} from "antd";
import React from "react";
import { useState } from "react";
import { useEffect } from "react";
import { useTranslation } from "i18n";
import { EditOutlined } from "@ant-design/icons";
import { DescriptionsContainer } from "./index.styled";

enum FieldNameEnum {
  TIMEZONE = "TIMEZONE",
}

type FieldNameToEdit = FieldNameEnum.TIMEZONE | undefined;

export const SettingsContainer = () => {
  const { t } = useTranslation(["page-settings"]);

  const [formInstance] = Form.useForm();
  const [dataToEdit, setDataToEdit] = useState<FieldNameToEdit>();
  const { getTimezone, saveTimezone } = useLocalStorageVariables();
  const timezone = typeof localStorage !== "undefined" ? getTimezone() : "";

  // because value is taken from localstorage
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);

  useEffect(() => {
    formInstance.resetFields();
  }, [dataToEdit]);

  return (
    <>
      <Card>
        <Row gutter={24}>
          <Col span={24}>
            <DescriptionsContainer column={1} title={t("SETTINGS")}>
              <Descriptions.Item
                labelStyle={{ fontWeight: "bold" }}
                label={t(FieldNameEnum.TIMEZONE)}
              >
                <div>
                  {selectedTimezone}
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => setDataToEdit(FieldNameEnum.TIMEZONE)}
                  />
                </div>
              </Descriptions.Item>
            </DescriptionsContainer>
          </Col>
        </Row>
      </Card>
      <Modal
        visible={!!dataToEdit}
        onCancel={() => setDataToEdit(undefined)}
        title={t("EDIT", { name: t(dataToEdit || "") })}
        onOk={() => formInstance.submit()}
      >
        <Form
          onFinish={({ newValue }: { newValue: string }) => {
            setDataToEdit(undefined);
            saveTimezone(newValue);
            setSelectedTimezone(newValue);
            formInstance.resetFields();
          }}
          form={formInstance}
          initialValues={{
            newValue: timezone,
          }}
        >
          <Form.Item
            label={t(dataToEdit || "")}
            name="newValue"
            rules={[{ required: true, message: t("REQUIRED") }]}
          >
            <Select showSearch value={selectedTimezone}>
              {Object.entries(timezones).map(([key, value]) => (
                <Select.Option value={key} key={key}>
                  {value}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
