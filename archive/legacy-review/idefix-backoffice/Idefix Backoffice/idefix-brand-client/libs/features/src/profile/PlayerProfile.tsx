import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import styled, { ThemeContext } from "styled-components";
import { Profile } from "@brandserver-client/types";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry } from "@brandserver-client/ui";
import { LanguageFormValues } from "./types";
import { useSelector } from "react-redux";
import { selectSupportedLanguages } from "@brandserver-client/lobby";

interface Props {
  profile: Profile;
  onUpdateLanguage: (
    values: LanguageFormValues,
    formikActions: FormikHelpers<LanguageFormValues>
  ) => void;
}

const StyledPlayerProfile = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .player-profile__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 23px;
  }

  .player-profile__name {
    ${({ theme }) => theme.typography.text24Bold};
    text-transform: uppercase;
    color: ${({ theme }) => theme.palette.accent};
    margin-bottom: 18px;
  }

  .player-profile__description {
    width: 100%;
    border-bottom: 1px solid
      ${({ theme }) => theme.palette.secondarySemiLightest};
    margin-bottom: 18px;

    &--first {
      margin-right: 24px;
    }
  }

  .player-profile__double-container {
    display: flex;
    justify-content: space-between;
  }

  .player-profile__description-label {
    ${({ theme }) => theme.typography.text12};
    color: ${({ theme }) => theme.palette.accent};
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .player-profile__description-text {
    ${({ theme }) => theme.typography.text16Bold};
    color: ${({ theme }) => theme.palette.contrastDark};
    margin-bottom: 19px;
  }

  .player-profile__button {
    ${({ theme }) => theme.typography.text18Bold};
  }

  .player-profile__language-update {
    margin-bottom: 18px;
  }
`;

const PlayerProfile: React.FC<Props> = ({ profile, onUpdateLanguage }) => {
  const {
    FirstName,
    LastName,
    EmailAddress,
    Address1,
    PostCode,
    City,
    Country,
    MobilePhone,
    LanguageISO
  } = profile;

  const { Button, Select, Field } = useRegistry();

  const messages = useMessages({
    myProfile: "my-account.my-profile",
    address: "my-account.profile.address",
    email: "register.email",
    postCode: "register.postcode",
    city: "register.city",
    country: "my-account.profile.country",
    phone: "my-account.profile.phone",
    language: "my-account.profile.language",
    update: "my-account.profile.update"
  });

  const theme = React.useContext(ThemeContext);

  const supportedLanguages = useSelector(selectSupportedLanguages);

  return (
    <StyledPlayerProfile>
      <div className="player-profile__title">{messages.myProfile}</div>
      <div className="player-profile__name">{`${FirstName} ${LastName}`}</div>
      <div className="player-profile__description">
        <div className="player-profile__description-label">
          {messages.email}
        </div>
        <div className="player-profile__description-text">{EmailAddress}</div>
      </div>
      <div className="player-profile__double-container">
        <div className="player-profile__description player-profile__description--first">
          <div className="player-profile__description-label">
            {messages.address}
          </div>
          <div className="player-profile__description-text">{Address1}</div>
        </div>
        <div className="player-profile__description">
          <div className="player-profile__description-label">
            {messages.postCode}
          </div>
          <div className="player-profile__description-text">{PostCode}</div>
        </div>
      </div>
      <div className="player-profile__double-container">
        <div className="player-profile__description player-profile__description--first">
          <div className="player-profile__description-label">
            {messages.city}
          </div>
          <div className="player-profile__description-text">{City}</div>
        </div>
        <div className="player-profile__description">
          <div className="player-profile__description-label">
            {messages.country}
          </div>
          <div className="player-profile__description-text">
            {Country.CountryName}
          </div>
        </div>
      </div>
      <div className="player-profile__description">
        <div className="player-profile__description-label">
          {messages.phone}
        </div>
        <div className="player-profile__description-text">{MobilePhone}</div>
      </div>
      <Formik
        initialValues={{ language: LanguageISO.toLowerCase() }}
        onSubmit={onUpdateLanguage}
      >
        {formik => (
          <Form className="player-profile__language-update">
            <Field name="language" label={messages.language}>
              <Select className="player-profile__language-selector">
                {supportedLanguages.map(({ name, code }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              color={Button.Color.accent}
              disabled={formik.isSubmitting || !formik.dirty}
              type="submit"
              className="player-profile__button"
            >
              {messages.update}
            </Button>
          </Form>
        )}
      </Formik>
    </StyledPlayerProfile>
  );
};

export default PlayerProfile;
