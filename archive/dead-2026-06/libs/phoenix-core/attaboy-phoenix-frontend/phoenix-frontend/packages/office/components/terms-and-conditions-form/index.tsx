import { useTranslation } from "i18n";
import { useState } from "react";
import { Upload, Button, InputNumber, Card, Form, message, Spin } from "antd";
import { UploadOutlined } from "@ant-design/icons";
// @ts-ignore
import mammoth from "mammoth";
import { useApi } from "../../services/api/api-service";
import { Method } from "@phoenix-ui/utils";
import { useEffect } from "react";

export const TermsAndConditionsForm = () => {
  const { t } = useTranslation(TermsAndConditionsForm.namespace);
  const [resultHtml, setResultHtml] = useState("");
  const [
    getTerms,
    getTermsIsLoading,
    getTermsResponse,
    ,
    resetGetTerms,
  ] = useApi("terms", Method.GET);
  const [form] = Form.useForm();
  const [triggerApi, isLoading, response, , resetHookState] = useApi(
    "admin/upload-terms",
    Method.POST,
  );
  const [termsVersion, setTermsVersion] = useState("-");

  const handleFileSelect = (event: any) => {
    readFileInputEventAsArrayBuffer(event, (arrayBuffer: any) => {
      mammoth
        .convertToHtml({ arrayBuffer: arrayBuffer })
        .then((result: any) => setResultHtml(result.value))
        .done();
    });
  };

  useEffect(() => {
    if (response.succeeded) {
      message.success(t("TERMS_AND_CONDITIONS_UPDATED"));
      resetHookState();
      const newVersion = form.getFieldValue("version");
      setTermsVersion(newVersion);
      form.resetFields();
    }
    if (response.succeeded !== undefined && !response.succeeded) {
      message.error(t("TERMS_UPDATE_ERROR"));
    }
  }, [response]);

  useEffect(() => {
    getTerms();
  }, []);

  useEffect(() => {
    if (getTermsResponse?.succeeded) {
      setTermsVersion(getTermsResponse.data?.version);
      resetGetTerms();
    }

    if (
      getTermsResponse.succeeded !== undefined &&
      !getTermsResponse.succeeded
    ) {
      message.error(t("GET_VERSION_ERROR"));
    }
  }, [getTermsResponse]);

  const readFileInputEventAsArrayBuffer = (file: any, callback: any) => {
    const reader = new FileReader();
    if (file.status !== "uploading") {
      reader.onload = (loadEvent) => {
        const arrayBuffer = loadEvent.target?.result;
        callback(arrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const onFinish = (values: any) => {
    triggerApi({
      currentTermsVersion: values.version,
      termsContent: resultHtml,
      termsDayThreshold: 365,
    });
  };

  const props = {
    name: "file",
    accept: ".docx",
    beforeUpload(file: any) {
      handleFileSelect(file);
      return true;
    },
    onRemove() {
      setResultHtml("");
    },
  };

  return (
    <>
      {getTermsIsLoading ? (
        <Spin />
      ) : (
        <>
          <Card>
            {t("TERMS_VERSION")} {termsVersion}
          </Card>
          <Card>
            <Form layout="vertical" onFinish={onFinish} form={form}>
              <Form.Item
                label={t("VERSION")}
                name="version"
                rules={[
                  {
                    required: true,
                    message: t("VERSION_ERROR"),
                  },
                  () => ({
                    validator(_rule, value) {
                      if (
                        !value ||
                        termsVersion === "-" ||
                        parseFloat(termsVersion) < value
                      ) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        t("NEW_VERSION_MUST_BE_HIGHER_ERROR"),
                      );
                    },
                  }),
                  () => ({
                    validator(_rule, value) {
                      if (!value || Number.isInteger(value)) {
                        return Promise.resolve();
                      }
                      return Promise.reject(t("NEW_VERSION_INTEGER_ERROR"));
                    },
                  }),
                ]}
              >
                <InputNumber />
              </Form.Item>

              <Form.Item
                label={t("TERMS_AND_CONDITIONS_CONTENT")}
                name="termsAndConditions"
                valuePropName="fileList"
                getValueFromEvent={(e) => {
                  if (Array.isArray(e)) {
                    return e;
                  }
                  return e && e.fileList;
                }}
                rules={[
                  {
                    required: true,
                    message: t("TERMS_AND_CONDITIONS_ERROR"),
                  },
                ]}
              >
                <Upload {...props}>
                  <Button icon={<UploadOutlined />}>
                    {t("CLICK_TO_UPLOAD")}
                  </Button>
                </Upload>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={isLoading}>
                  {t("SUBMIT")}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </>
      )}
    </>
  );
};

TermsAndConditionsForm.namespace = "page-terms-and-conditions";
