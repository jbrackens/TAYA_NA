/* @flow */

export type GetThumbnailsParams = {
  brandId: BrandId,
};

export type GetThumbnailsResponse = {
  id: number,
  key: string,
  blurhashes: {},
  viewModes: string[],
}[];
