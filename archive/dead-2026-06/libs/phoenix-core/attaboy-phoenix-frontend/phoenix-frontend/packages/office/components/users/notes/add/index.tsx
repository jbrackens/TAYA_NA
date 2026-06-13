import { Button, Modal, Form, Input, message } from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useApi } from "../../../../services/api/api-service";
import { useTranslation } from "i18n";
import { FileTextOutlined } from "@ant-design/icons";
import { Method, Id, Button as ButtonEnum } from "@phoenix-ui/utils";
import { FormValues } from "../../../../components/form/modal";
import { setUserNotesUpdate } from "../../../../lib/slices/usersDetailsSlice";

const { TextArea } = Input;

type UserAddNoteProps = {
  id: Id;
};

const UserAddNote = ({ id }: UserAddNoteProps) => {
  const { t } = useTranslation("page-users-details");
  const dispatch = useDispatch();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const [triggerAddNote, loadingAddNote, response] = useApi(
    "admin/punters/:id/notes",
    Method.POST,
  );

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const onFormFinish = (values: FormValues) => {
    const addNote = async () => {
      try {
        await triggerAddNote(
          {
            noteText: values.note,
          },
          {
            id,
          },
        );
      } catch (err) {
        console.error({ err });
        message.error(`Failed to add note.`);
      }
    };
    addNote();
    message.success(`Note added successfully.`);
  };

  useEffect(() => {
    if (!response.succeeded) return;
    dispatch(setUserNotesUpdate(true));
    form.resetFields();
    isModalVisible && setIsModalVisible(false);
  }, [response.succeeded]);

  const layout = {
    labelCol: { span: 3 },
    wrapperCol: { span: 24 },
  };
  const tailLayout = {
    wrapperCol: { offset: 3, span: 16 },
  };

  return (
    <>
      <Button
        key="action-add-note"
        shape="round"
        icon={<FileTextOutlined />}
        type={ButtonEnum.Type.PRIMARY}
        onClick={() => setIsModalVisible(true)}
      >
        {t("ACTION_ADD_NOTE")}
      </Button>
      <Modal
        title="Add Note"
        visible={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
      >
        <Form {...layout} form={form} name="basic" onFinish={onFormFinish}>
          <Form.Item
            label="Note"
            name="note"
            rules={[{ required: true, message: "Note is required" }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item {...tailLayout}>
            <Button type="primary" htmlType="submit" loading={loadingAddNote}>
              {t("ACTION_ADD_NOTE")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UserAddNote;
