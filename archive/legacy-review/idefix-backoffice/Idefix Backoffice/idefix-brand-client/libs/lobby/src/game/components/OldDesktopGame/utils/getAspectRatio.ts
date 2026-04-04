export function getAspectRatio(aspectRatioOptions?: string[]) {
  if (!aspectRatioOptions) {
    return 16 / 9;
  }

  if (aspectRatioOptions.includes("16x9")) {
    return 16 / 9;
  }

  if (aspectRatioOptions.includes("3x2")) {
    return 3 / 2;
  }

  if (aspectRatioOptions.includes("wms-wide")) {
    return 1.536;
  }

  return 4 / 3;
}
