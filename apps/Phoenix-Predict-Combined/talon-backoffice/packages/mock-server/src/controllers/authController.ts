import {
  users,
  AuthToken,
  loginResponse,
  adminLoginResponse,
  profile,
  registerResponse,
  kbaQuestionsResponse,
  unverifiedUserloginResponse,
  unverifiedProfile,
} from "../mocked_data/auth";

export default {
  async authenticate(req: any, res: any) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .send({ message: `username or password not provided` });
    }

    const foundUser = users.find(
      (el) => el.username === username && el.password === password,
    );

    if (foundUser) {
      const response = foundUser.isAdmin
        ? adminLoginResponse
        : foundUser.isVerified
        ? loginResponse
        : unverifiedUserloginResponse;
      return res.status(200).send(response);
    }

    return res
      .status(401)
      .send({ errors: [{ errorCode: "unauthorisedResponseDuringLogin" }] });
  },

  async register(req: any, res: any) {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        message: `email password, first name or last name not provided`,
      });
    }

    const isUserExists = users.find((el) => el.email === email);

    if (isUserExists) {
      return res.status(400).send({
        errors: [{ errorCode: "conflictingPunterInformation" }],
      });
    }

    return res.status(200).send(registerResponse);
  },

  async answerKbaQuestions(req: any, res: any) {
    if (req.body.length === 4) {
      return res.status(200).send(kbaQuestionsResponse);
    }
    return res.status(200).send({ message: "user validated" });
  },

  async idComplyStatus(req: any, res: any) {
    setTimeout(() => {
      if (Math.random() < 0.2) {
        return res.status(200).send({ message: "user validated" });
      } else {
        return res
          .status(400)
          .send({
            errors: [
              { errorCode: "photoVerificationNotCompleted", details: null },
            ],
          });
      }
    }, 1000);
  },

  async forgotPassword(req: any, res: any) {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        errors: [{ errorCode: "conflictingPunterInformation" }],
      });
    }

    return res
      .status(200)
      .send({ message: `reset password email sent if you have an account` });
  },

  async changePassword(req: any, res: any) {
    const { hash, password } = req.body;
    const isHashExists = users.find((el) => el.changePasswordHash === hash);

    if (!isHashExists) {
      return res.status(400).send({
        message: `invalid or expired reset password link`,
      });
    }

    if (!password) {
      return res.status(400).send({
        message: `password not provided`,
      });
    }

    return res.status(200).send({ message: `password changed successfully` });
  },

  async refreshTheToken(req: any, res: any) {
    const refresh_token = req.body;
    if (!refresh_token) {
      return res.status(400).send({
        message: `refreshToken not provided`,
      });
    }

    const response =
      adminLoginResponse.token.refreshToken === refresh_token
        ? adminLoginResponse
        : loginResponse;

    return res.status(200).send({ message: `tokens refreshed`, ...response });
  },

  async profileData(req: any, res: any) {
    if (req.headers.authorization.includes("unverifinedUserToken")) {
      return res.status(200).send(unverifiedProfile);
    }
    return res.status(200).send(profile);
  },

  async profileDataUpdate(req: any, res: any) {
    const {
      email,
      firstName,
      lastName,
      address: { addressLine, city, state, zipcode },
      dateOfBirth: { day, month, year },
    } = req.body;

    if (
      email &&
      firstName &&
      lastName &&
      addressLine &&
      city &&
      state &&
      zipcode
    ) {
      return res.status(200).send(req.body);
    }
    return res.status(400).send({
      message: `invalid data`,
    });
  },

  async profilePreferencesUpdate(req: any, res: any) {
    const {
      communicationPreferences: {
        announcements,
        promotions,
        subscriptionUpdates,
      },
      bettingPreferences: { autoAcceptBetterOdds },
    } = req.body;

    if (
      promotions !== undefined &&
      announcements !== undefined &&
      subscriptionUpdates !== undefined &&
      autoAcceptBetterOdds !== undefined
    ) {
      return res.status(200).send(req.body);
    }
    return res.status(400).send({
      message: `invalid data`,
    });
  },

  async logOut(req: any, res: any) {
    return res.status(200).send();
  },
};
