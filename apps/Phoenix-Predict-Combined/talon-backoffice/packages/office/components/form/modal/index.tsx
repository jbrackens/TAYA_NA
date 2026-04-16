import React, { useEffect, useRef } from "react";
import { Form } from "antd";
import Modal from "../../layout/modal";
import { ModalProps } from "../../layout/modal";
import { Overwrite } from "utility-types";
import { isNil } from "lodash";

export type FormModalProps = Overwrite<
  ModalProps,
  {
    onSubmit: (values: FormValues) => void;
  }
> & {
  name: string;
  initialValues?: FormValues;
  onChange?: (allValues: FormValues, value?: FormValues) => void;
  onResetForm?: Function;
};

export type FormValues = {
  [key: string]: any;
};

const FormModal: React.FC<FormModalProps> = ({
  name,
  onSubmit,
  onChange,
  onResetForm,
  visible,
  initialValues,
  children,
  ...props
}: FormModalProps) => {
  const [form] = Form.useForm();

  const useResetFormOnModalTransitions = ({ formRef, visibleRef }: any) => {
    const prevVisibleRef = useRef();
    useEffect(() => {
      prevVisibleRef.current = visibleRef;
    }, [visibleRef]);
    const prevVisible = prevVisibleRef.current;

    useEffect(() => {
      if (!isNil(prevVisible) && visibleRef !== prevVisible) {
        formRef?.resetFields();
        onResetForm && onResetForm();
      }
    }, [visibleRef]);
  };

  useResetFormOnModalTransitions({
    formRef: form,
    visibleRef: visible,
  });

  const submitForm = () => form.submit();

  return (
    <Modal {...props} visible={visible} onSubmit={submitForm}>
      <Form.Provider>
        <Form
          form={form}
          layout={"vertical"}
          name={name}
          onFinish={onSubmit}
          onValuesChange={(value: FormValues, allValues: FormValues) =>
            onChange && onChange(allValues, value)
          }
          initialValues={initialValues}
          data-test-id="modal-form"
        >
          {children}
        </Form>
      </Form.Provider>
    </Modal>
  );
};

export default FormModal;
