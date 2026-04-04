import { BrandInit } from "@idefix-backoffice/idefix/types";

export default (brandId: string, brandNames: BrandInit[] | undefined) => {
  return brandNames?.find(({ id }) => id === brandId)?.name || brandId;
};
