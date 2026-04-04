import { ViewMode } from "app/types";

export interface IFormValues {
  active: boolean | string;
  name: string;
  permalink: string;
  brandId: string;
  manufacturer: string;
  primaryCategory: string;
  newGame: boolean | string;
  jackpot: boolean | string;
  searchOnly: boolean | string;
  promoted: boolean;
  dropAndWins: boolean;
  thumbnailId: number | null;
  aspectRatio: string;
  parameters: [];
  viewMode: ViewMode;
  keywords: string;
  tags: string[];
}

export type ThumbnailOption = { value: number; label: string };

export type VisibilityFilter = "all" | "active" | "draft" | "archived";

export type DisplayMode = "list" | "grid";
