import React from "react";
import { Form } from "antd";
import type { FormItemProps } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

const FORM_ITEM_PREVIEW_CLASS_NAME = [
  "[&:last-child]:mb-0",
  "[&_.ant-form-item-label]:relative",
  "[&_.ant-form-item-label]:z-0",
  "[&_.ant-form-item-label_label]:static",
  "[&_.ant-form-item-label_label]:bg-[var(--surface-1)]",
  "[&_.ant-form-item-label_label]:pr-4",
  "[&_.ant-form-item-label_label]:italic",
  "[&_.ant-form-item-label_label]:after:absolute",
  "[&_.ant-form-item-label_label]:after:left-0",
  "[&_.ant-form-item-label_label]:after:top-1/2",
  "[&_.ant-form-item-label_label]:after:z-[-1]",
  "[&_.ant-form-item-label_label]:after:mt-[-4px]",
  "[&_.ant-form-item-label_label]:after:block",
  "[&_.ant-form-item-label_label]:after:h-px",
  "[&_.ant-form-item-label_label]:after:w-full",
  "[&_.ant-form-item-label_label]:after:bg-[rgba(0,0,0,0.075)]",
  "[&_.ant-form-item-label_label]:after:content-['']",
].join(" ");

export const FormItemPreview = ({ className, ...props }: FormItemProps) =>
  React.createElement(Form.Item, {
    ...props,
    className: classNames(FORM_ITEM_PREVIEW_CLASS_NAME, className),
  });
