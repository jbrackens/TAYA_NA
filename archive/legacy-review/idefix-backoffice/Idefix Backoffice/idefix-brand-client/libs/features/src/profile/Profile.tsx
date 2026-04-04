import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { FormikHelpers } from "formik";
import { ApiContext } from "@brandserver-client/api";
import { getExclusions } from "@brandserver-client/lobby";
import { Breakpoints } from "@brandserver-client/ui";
import { Profile as ProfileType, Exclusion } from "@brandserver-client/types";
import { useMessages } from "@brandserver-client/hooks";
import { errorCodes } from "@brandserver-client/utils";
import { ActiveExclusion } from "../active-exclusion";
import PlayerProfile from "./PlayerProfile";
import ChangePassword from "./ChangePassword";
import SelfExclusion from "./SelfExclusion";
import Subscriptions from "./Subscriptions";
import {
  LanguageFormValues,
  ChangePasswordFormValues,
  SetPasswordFormValues
} from "./types";
import { SetPasswordForm } from "./SetPasswordForm";

const StyledProfile = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    flex-direction: column;
  }
  .profile__left-column {
    margin-right: 40px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-right: 0px;
    }
  }

  .profile__left-column,
  .profile__right-column {
    flex: 1 1 46%;
  }

  .profile__info-note {
    padding: 18px 24px;
    background: ${({ theme }) => theme.palette.primaryLightest};
    margin-top: 18px;
    margin-bottom: 30px;
    border-radius: 5px;
  }

  .profile__info-note-text {
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.contrastDark};
  }

  .profile__active-exclusions {
    margin-top: 8px;
    width: 100%;
  }

  .profile__exclusion-title {
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text21BoldUpper};
    margin-bottom: 16px;
  }
  .profile__exclusion-description {
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text16};
    margin-bottom: 40px;
  }

  .profile__active-exclusion {
    min-width: 355px;
    max-width: 355px;
    margin-bottom: 24px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      min-width: 100%;
      max-width: 100%;
    }
  }

  .profile__active-exclusions-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
      align-items: center;
      flex-wrap: nowrap;
    }
  }

  .profile__exclusion {
    margin: 34px 0px 36px;
  }
`;

interface Props {
  profile: ProfileType;
  onSetData: React.Dispatch<React.SetStateAction<ProfileType | undefined>>;
}

const Profile: React.FC<Props> = ({ profile, onSetData: onSetProfile }) => {
  const messages = useMessages({
    profileInfo: "my-account.profile.info",
    activeExclusions: "my-account.profile.active-exclusions",
    activeExclusionsDescription:
      "my-account.profile.active-exclusions.description"
  });

  const { limits } = useSelector(getExclusions);

  const api = React.useContext(ApiContext);

  const handleUpdateLanguage = React.useCallback(
    async (
      values: LanguageFormValues,
      formikActions: FormikHelpers<LanguageFormValues>
    ) => {
      try {
        await api.profile.updateLanguage(values.language);
        formikActions.setSubmitting(false);
        window.location.reload();
      } catch (error) {
        formikActions.setSubmitting(false);
      }
    },
    []
  );

  const handleChangePassword = React.useCallback(
    async (
      { newPassword: password, oldPassword }: ChangePasswordFormValues,
      formikActions: FormikHelpers<ChangePasswordFormValues>
    ) => {
      try {
        const response = await api.profile.changePassword({
          password,
          oldPassword
        });

        formikActions.setSubmitting(false);

        if (
          response.ok === false &&
          errorCodes.INVALID_OLD_PASSWORD === response.code
        ) {
          return formikActions.setStatus({
            errors: { oldPassword: response.result }
          });
        }

        if (response.ok === false) {
          return formikActions.setStatus({
            errors: { generic: response.result }
          });
        }

        if (response.profile) {
          formikActions.resetForm();
        }
      } catch (error) {
        formikActions.setSubmitting(false);
      }
    },
    [onSetProfile]
  );

  const handleSetPassword = React.useCallback(
    async (
      values: SetPasswordFormValues,
      formikActions: FormikHelpers<SetPasswordFormValues>
    ) => {
      try {
        const response = await api.profile.setPassword(values);
        formikActions.setSubmitting(false);

        if (response.ok === false) {
          return formikActions.setStatus({
            errors: { generic: response.result }
          });
        }

        onSetProfile(response.profile);
      } catch (error) {
        formikActions.setSubmitting(false);
      }
    },
    [onSetProfile]
  );

  return (
    <StyledProfile>
      <div className="profile__left-column">
        <PlayerProfile
          profile={profile}
          onUpdateLanguage={handleUpdateLanguage}
        />
        <div className="profile__info-note">
          <div className="profile__info-note-text">{messages.profileInfo}</div>
        </div>
      </div>
      <div className="profile__right-column">
        {profile.Pnp ? (
          <SetPasswordForm onSubmit={handleSetPassword} />
        ) : (
          <ChangePassword onChangePassword={handleChangePassword} />
        )}
        <Subscriptions />
        <SelfExclusion className="profile__exclusion" />
      </div>
      {limits.length > 0 && (
        <div className="profile__active-exclusions">
          <div className="profile__exclusion-title">
            {messages.activeExclusions}
          </div>
          <div className="profile__exclusion-description">
            {messages.activeExclusionsDescription}
          </div>
          <div className="profile__active-exclusions-container">
            {limits.map((limit: Exclusion) => (
              <ActiveExclusion
                key={limit.limitId}
                className="profile__active-exclusion"
                exclusion={limit}
              />
            ))}
          </div>
        </div>
      )}
    </StyledProfile>
  );
};

export default Profile;
