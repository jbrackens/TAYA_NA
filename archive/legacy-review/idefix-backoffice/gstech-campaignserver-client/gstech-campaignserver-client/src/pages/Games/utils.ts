//@ts-nocheck
import { Game, Thumbnail, ThumbnailUrls, ViewMode } from "app/types";
import pick from "lodash/pick";
import toPairs from "lodash/toPairs";
import transform from "lodash/transform";
import zipObject from "lodash/zipObject";

import { ThumbnailOption, VisibilityFilter } from "./types";
import api from "../../api";

interface Props {
  thumbnailsOptions: ThumbnailOption[];
  thumbnailsUrls: ThumbnailUrls;
  viewMode: ViewMode;
  thumbnailId: number | null;
}

function filterGamesByStatus(games: Game[], status: VisibilityFilter) {
  const isActive = (game: Game) => game.active === true;
  const isDraft = (game: Game) => game.active === false;
  const isArchived = (game: Game) => game.removedAt !== null;

  return games.filter(game => {
    switch (status) {
      case "all":
        return !isArchived(game);
      case "active":
        return isActive(game);
      case "draft":
        return isDraft(game);
      case "archived":
        return isArchived(game);
      default:
        return false;
    }
  });
}

const getThumbnailUrlAndText = ({ thumbnailsOptions, thumbnailsUrls, viewMode, thumbnailId }: Props) => {
  const thumbnail = thumbnailsOptions.find(({ value }) => thumbnailId === value);
  const thumbnailUrl = thumbnailsUrls ? `${thumbnailsUrls[viewMode]}${thumbnail?.label}` : "";
  const thumbnailBlurhash = thumbnail?.blurhashes[viewMode];
  const thumbnailAltText = `${thumbnail?.label}`;

  return { thumbnailUrl, thumbnailAltText, thumbnailBlurhash };
};

const formatParamsToArray = (parameters: {}) => toPairs(parameters).map(arr => zipObject(["key", "value"], arr));

const formatParamsToObject = (parameters: {}) =>
  transform(
    parameters,
    (result, { key, value }) => {
      result[key] = value;
    },
    {}
  );

async function getThumbnailsForBrand(brandId: string) {
  const {
    data: { data: thumbnails }
  } = await api.games.getThumbnails(brandId);
  return thumbnails;
}

function findThumbnailIdByKey(findKey: string | undefined, thumbnails: Thumbnail[]) {
  return thumbnails.find(({ key }) => key === findKey)?.id;
}

const getNewGame = (newBrandId: string, game: Game) =>
  ({
    ...pick(game, [
      "name",
      "manufacturer",
      "primaryCategory",
      "newGame",
      "jackpot",
      "searchOnly",
      "promoted",
      "dropAndWins",
      "thumbnailId",
      "aspectRatio",
      "viewMode",
      "keywords",
      "tags",
      "parameters",
      "permalink"
    ]),
    brandId: newBrandId,
    active: false
  } as Game);

export {
  getThumbnailUrlAndText,
  getThumbnailsForBrand,
  findThumbnailIdByKey,
  formatParamsToArray,
  formatParamsToObject,
  filterGamesByStatus,
  getNewGame
};
