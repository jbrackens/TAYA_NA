import { FormItemProps } from "antd";
import type { FormInstance } from "antd/lib/form/Form";
import type { ColProps } from "antd/lib/grid/col";
import type { Callbacks, FieldData, ValidateMessages, ValidateErrorEntity } from "rc-field-form/lib/interface";
import React, {
  ComponentType,
  JSXElementConstructor,
  ReactElement,
} from "react";
import { BaseForm } from "./index.styled";

type CoreFormProps = {
  colon?: boolean;
  component?: ComponentType | false;
  fields?: FieldData[];
  form?: FormInstance;
  initialValues?: Record<string, unknown>;
  labelAlign?: "left" | "right";
  labelCol?: ColProps;
  layout?: "horizontal" | "vertical" | "inline";
  name?: string;
  preserve?: boolean;
  requiredMark?: boolean;
  scrollToFirstError?: boolean;
  size?: "small" | "middle" | "large";
  validateMessages?: ValidateMessages;
  validateTrigger?: string | Array<string>;
  wrapperCol?: ColProps;
  onFieldsChange?: (changedFields: FieldData[], allFields: FieldData[]) => void;
  onFinish?: (values: Record<string, unknown>) => void;
  onFinishFailed?: (errorInfo: ValidateErrorEntity<Record<string, unknown>>) => void;
  onValuesChange?: (changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => void;
  role?: string;
  testId?: string;
  className?: string;
  onChange?: () => void;
  children?: React.ReactNode;
};

/** Adapts narrowly-typed wrapper callbacks to the broader types expected by antd's styled Form. */
type AntdFormCallbacks = Pick<Callbacks, 'onFinish' | 'onFinishFailed' | 'onValuesChange'>;

const CoreForm: React.FC<CoreFormProps> & {
  useForm?: typeof BaseForm.useForm;
  Item: <Values = unknown>(
    props: FormItemProps<Values>,
  ) => ReactElement<unknown, string | JSXElementConstructor<unknown>>;
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
  // Antd Form's styled wrapper expects callbacks typed with Values = unknown.
  // Our public API uses Record<string, unknown> for better consumer DX.
  // These wrappers bridge the two without using 'any'.
  const adaptedCallbacks: AntdFormCallbacks = {
    onFinish: onFinish
      ? (values: unknown) => onFinish(values as Record<string, unknown>)
      : undefined,
    onFinishFailed: onFinishFailed
      ? (errorInfo: ValidateErrorEntity) =>
          onFinishFailed(errorInfo as ValidateErrorEntity<Record<string, unknown>>)
      : undefined,
    onValuesChange: onValuesChange
      ? (changedValues: unknown, allValues: unknown) =>
          onValuesChange(
            changedValues as Record<string, unknown>,
            allValues as Record<string, unknown>,
          )
      : undefined,
  };

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
      onFinish={adaptedCallbacks.onFinish}
      onFinishFailed={adaptedCallbacks.onFinishFailed}
      onValuesChange={adaptedCallbacks.onValuesChange}
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
