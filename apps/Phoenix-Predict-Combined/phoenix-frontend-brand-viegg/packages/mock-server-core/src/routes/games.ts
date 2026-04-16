import { Router } from "express";
import Games from "../controllers/gamesController";

export default () => {
  const api = Router();

  // get /sports
  api.get("/", Games.getGames);

  // get /sports/:id/fixtures/:id
  api.get("/:id/fixtures/:id", Games.getFixture);

  return api;
};
