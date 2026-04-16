import { Router } from "express";
import Fixture from "../controllers/fixtureController";

export default () => {
  const api = Router();

  api.get("", Fixture.getFixtures);
  
  return api;
};
