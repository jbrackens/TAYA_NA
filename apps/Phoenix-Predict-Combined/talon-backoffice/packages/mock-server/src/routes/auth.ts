import { Router } from "express";
import Auth from "../controllers/authController";

export default () => {
  const api = Router();

  // POST /login
  api.post("/login", Auth.authenticate);

  // POST /logout
  api.post("/logout", Auth.logOut);

  // POST /registration/sign-up
  api.post("/registration/sign-up", Auth.register);

  // POST /answer-kba-questions
  api.post("/registration/answer-kba-questions", Auth.answerKbaQuestions);

  // GET /registration/check-idpv-status
  api.post("/registration/check-idpv-status", Auth.idComplyStatus);

  // PUT /forgot-password
  api.put("/forgot-password", Auth.forgotPassword);

  // PUT /reset-password
  api.put("/change-password", Auth.changePassword);

  // POST /token/refresh
  api.post("/token/refresh", Auth.refreshTheToken);

  // GET /profile/me
  api.get("/profile/me", Auth.profileData);

  // PUT /profile/details
  api.put("/profile/details", Auth.profileDataUpdate);

  // PUT /profile/preferences
  api.put("/profile/preferences", Auth.profilePreferencesUpdate);

  return api;
};
