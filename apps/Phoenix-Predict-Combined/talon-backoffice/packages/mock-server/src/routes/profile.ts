import { Router } from "express";
import Profile from "../controllers/profileController";

export default () => {
  const api = Router();

  api.post("/communication",  Profile.updateCommunicationSettings);
  api.post("/changePassword",  Profile.updateCommunicationSettings);

  return api;
};