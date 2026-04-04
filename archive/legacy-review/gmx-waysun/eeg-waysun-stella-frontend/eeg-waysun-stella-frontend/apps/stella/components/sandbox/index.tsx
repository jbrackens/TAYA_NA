import React, { useState } from "react";
import { Formik, Field, Form, FormikHelpers } from "formik";
import { Button } from "ui";
import * as Yup from "yup";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import Link from "next/link";

export const Sandbox = () => {
  const [formValues, setFormValues] = useState({});

  const { t } = useTranslation();
  const router = useRouter();

  interface Values {
    firstName: string;
    email: string;
    toggle: boolean;
    checked: Array<boolean>;
    picked: string;
    arrayElements: Array<string>;
    colors: "red" | "green" | "blue";
  }

  const SignupSchema = Yup.object().shape({
    firstName: Yup.string()
      .min(2, "Too Short!")
      .max(15, "Too Long!")
      .required("Required"),

    email: Yup.string().email("Invalid email").required("Required"),
  });

  const validateUsername = (value) => {
    let error;
    if (value === "admin") {
      error = "Nice try!";
    }
    return error;
  };

  return (
    <div>
      <h1>{t("TEST")}</h1>
      <Link href="/" locale={router.locale === "en" ? "de" : "en"}>
        <button>{t("change-locale")}</button>
      </Link>
      <Formik
        initialValues={{
          firstName: "",
          email: "",
          toggle: false,
          checked: [],
          picked: "",
          arrayElements: ["el1", "el2"],
          colors: "red",
        }}
        validationSchema={SignupSchema}
        onSubmit={(
          values: Values,
          { setSubmitting }: FormikHelpers<Values>,
        ) => {
          setTimeout(() => {
            setFormValues(values);
            setSubmitting(false);
          }, 500);
        }}
      >
        {({ values, errors, touched, handleReset }) => (
          <Form>
            <label htmlFor="firstName">First Name max 15 characters</label>
            <Field
              id="firstName"
              name="firstName"
              placeholder="John"
              validate={validateUsername}
            />
            {errors.firstName && touched.firstName ? (
              <div>{errors.firstName}</div>
            ) : null}
            <br />

            <label htmlFor="email">Email </label>
            <Field
              id="email"
              name="email"
              placeholder="john@acme.com"
              type="email"
            />
            {errors.email && touched.email ? <div>{errors.email}</div> : null}
            <br />

            <label>
              <Field type="checkbox" name="toggle" />
              {`${values.toggle}`}
            </label>
            <br />

            <div id="checkbox-group">Checked</div>
            <div role="group" aria-labelledby="checkbox-group">
              <label>
                <Field type="checkbox" name="checked" value="One" />
                One
              </label>
              <label>
                <Field type="checkbox" name="checked" value="Two" />
                Two
              </label>
              <label>
                <Field type="checkbox" name="checked" value="Three" />
                Three
              </label>
            </div>
            <br />

            <div id="my-radio-group">Picked</div>
            <div role="group" aria-labelledby="my-radio-group">
              <label>
                <Field type="radio" name="picked" value="One" />
                One
              </label>
              <label>
                <Field type="radio" name="picked" value="Two" />
                Two
              </label>
            </div>
            <br />

            <label htmlFor="arrayElements[0]">First array el</label>
            <Field name="arrayElements[0]" />
            <br />

            <label htmlFor="arrayElements[2]">Second array el</label>
            <Field name="arrayElements[1]" />
            <br />

            <label htmlFor="colors">Colors</label>
            <Field as="select" name="colors">
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
            </Field>
            <br />

            <br />
            <br />

            <Button type="submit">Submit</Button>
            <button type="button" onClick={handleReset}>
              Reset
            </button>
          </Form>
        )}
      </Formik>
      <div>
        {formValues && (
          <>
            {Object.entries(formValues).map(([key, value]) => (
              <div key={key}>
                {key}:{JSON.stringify(value)}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
