import { FormItemProps } from "antd";
import React, {
  ComponentType,
  JSXElementConstructor,
  ReactElement,
} from "react";
import { BaseForm } from "./index.styled";

type CoreFormProps = {
  colon?: boolean;
  component?: ComponentType | false;
  fields?: Array<any>;
  form?: any;
  initialValues?: any;
  labelAlign?: "left" | "right";
  labelCol?: any;
  layout?: "horizontal" | "vertical" | "inline";
  name?: string;
  preserve?: boolean;
  requiredMark?: boolean;
  scrollToFirstError?: boolean;
  size?: "small" | "middle" | "large";
  validateMessages?: any;
  validateTrigger?: string | Array<string>;
  wrapperCol?: any;
  onFieldsChange?: (changedFields: any, allFields: any) => void;
  onFinish?: (values: any) => void;
  onFinishFailed?: ({
    values,
    errorFields,
    outOfDate,
  }: {
    values: any;
    errorFields: any;
    outOfDate: any;
  }) => void;
  onValuesChange?: (changedValues: any, allValues: any) => void;
  role?: string;
  testId?: string;
  className?: string;
  onChange?: () => void;
  children?: React.ReactNode;
};

const CoreForm: React.FC<CoreFormProps> & {
  useForm?: any;
  Item: <Values = any>(
    props: FormItemProps<Values>,
  ) => ReactElement<any, string | JSXElementConstructor<any>>;
} = ({
  colon,
  component,
  fields,
  form,
  initialValues,
  labelAlign,
  labelCol,
  layout,
  name,
  preserve,
  requiredMark,
  scrollToFirstError,
  size,
  validateMessages,
  validateTrigger,
  wrapperCol,
  onFieldsChange,
  onFinish,
  onFinishFailed,
  onValuesChange,
  children,
  role,
  testId,
  className,
  onChange,
}) => {
  return (
    <BaseForm
      className={className}
      colon={colon}
      component={component}
      fields={fields}
      form={form}
      initialValues={initialValues}
      labelAlign={labelAlign}
      labelCol={labelCol}
      layout={layout}
      name={name}
      preserve={preserve}
      requiredMark={requiredMark}
      scrollToFirstError={scrollToFirstError}
      size={size}
      validateMessages={validateMessages}
      validateTrigger={validateTrigger}
      wrapperCol={wrapperCol}
      onFieldsChange={onFieldsChange}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      onValuesChange={onValuesChange}
      onChange={onChange}
      role={role}
      data-testid={testId}
    >
      {children}
    </BaseForm>
  );
};

CoreForm.useForm = BaseForm.useForm;
CoreForm.Item = BaseForm.Item;

export { CoreForm };
