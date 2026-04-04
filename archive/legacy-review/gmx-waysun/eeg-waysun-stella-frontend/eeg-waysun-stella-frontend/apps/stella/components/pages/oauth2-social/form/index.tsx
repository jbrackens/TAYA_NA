import React, { FC, useEffect, useState } from "react";
import { Formik, Field, Form } from "formik";
import { Input, message, Button } from "ui";
import { PageContentWrapper } from "../../../page-content-wrapper";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import { ButtonDiv, InputWithButtonField, InputButton } from "./../index.style";
import { useRouter } from "next/router";
import * as yup from "yup";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

type SocialFormProps = {
  socialId: string | string[] | undefined;
};

const SocialForm: FC<SocialFormProps> = ({ socialId = undefined }) => {
  const { t } = useTranslation();
  const router = useRouter();

  //   ------> useState variables <-------
  const [viewSecret, setViewSecret] = useState(false);
  const [socialDetails, setSocialDetails] = useState({
    socialId: "",
    socialClientId: "",
    socialClientSecret: "",
  });

  //   ------> API's <-------
  const getSocialById: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/oauth2/social/${socialId}`, "GET");

  const putSocial: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/oauth2/social/${socialId}`, "PUT");

  //   ------> useEffects <-------
  useEffect(() => {
    socialId && getSocialById.triggerApi();
  }, [socialId]);

  useEffect(() => {
    if (getSocialById.data && getSocialById.data.status === "ok") {
      const social = getSocialById.data.details;
      setSocialDetails({
        socialId: social.socialId,
        socialClientId: social.socialClientId,
        socialClientSecret: social.socialClientSecret,
      });
    }
  }, [getSocialById.data]);

  useEffect(() => {
    if (putSocial.data && putSocial.data.status === "ok") {
      message.success(t("SUCCESS"));
    }
  }, [putSocial.data]);

  useEffect(() => {
    if (getSocialById.error) {
      message.error(
        t(
          `${t("GET_SOCIAL_OAUTH")} - ${
            getSocialById.error?.payload?.details?.[0]?.msg || t("FAILED")
          }`,
        ),
      );
      getSocialById.resetHookState();
      return;
    }
    if (putSocial.error) {
      message.error(t(t("FAILED")));
      putSocial.resetHookState();
      return;
    }
  }, [getSocialById.error, putSocial.error]);

  //   ------> Handler functions <-------
  const submitSocialHandler = (values) => {
    const payload = {
      socialId: values.socialId,
      socialClientId: values.socialClientId,
      socialClientSecret: values.socialClientSecret,
    };
    putSocial.triggerApi(payload);
  };

  //   ------> Form schema <-------
  const validationAccountSchema = yup.object().shape({
    socialId: yup.string().required(t("REQUIRED_ERR")),
    socialClientId: yup.string().required(t("REQUIRED_ERR")),
    socialClientSecret: yup.string().required(t("REQUIRED_ERR")),
  });

  return (
    <>
      <Formik
        enableReinitialize
        initialValues={socialDetails}
        validationSchema={validationAccountSchema}
        onSubmit={submitSocialHandler}
      >
        {({ errors, touched, values, setFieldValue }) => (
          <Form>
            <PageContentWrapper
              title={t("OAUTH2_SOCIAL_TITLE")}
              sections={[
                {
                  id: "0",
                  title: t("CLIENT_ID"),
                  content: (
                    <Field
                      id="socialClientId"
                      name="socialClientId"
                      as={Input}
                      fullWidth
                      error={
                        errors.socialClientId && touched.socialClientId
                          ? errors.socialClientId
                          : ""
                      }
                      loading={getSocialById.isLoading}
                    />
                  ),
                },
                {
                  id: "0",
                  title: t("CLIENT_SECRET"),
                  content: (
                    <InputWithButtonField>
                      <Field
                        id="socialClientSecret"
                        name="socialClientSecret"
                        as={Input}
                        fullWidth
                        type={viewSecret ? "text" : "password"}
                        error={
                          errors.socialClientSecret &&
                          touched.socialClientSecret
                            ? errors.socialClientSecret
                            : ""
                        }
                        loading={getSocialById.isLoading}
                      />
                      <InputButton
                        buttonType="nobackground"
                        onClick={() => {
                          setViewSecret(!viewSecret);
                        }}
                        compact
                        icon={
                          viewSecret ? (
                            <EyeInvisibleOutlined />
                          ) : (
                            <EyeOutlined />
                          )
                        }
                      />
                    </InputWithButtonField>
                  ),
                },
                {
                  id: "5",
                  content: (
                    <ButtonDiv>
                      <Button type="submit">{t("UPDATE")}</Button>
                    </ButtonDiv>
                  ),
                },
              ]}
            />
          </Form>
        )}
      </Formik>
    </>
  );
};

export default SocialForm;
