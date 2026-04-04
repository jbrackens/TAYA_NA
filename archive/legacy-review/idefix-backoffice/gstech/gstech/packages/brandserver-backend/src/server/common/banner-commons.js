/* @flow */
const configuration = require('./configuration');

const imageSelector = (bannerId: string, namespace: string, bg: ?string): string => {
  if (bg == null) {
    return '';
  }
  return `<style>
  #${bannerId} {
    background-image: url(${configuration.cdn(namespace + bg)});
    background-size: contain;
  }
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    #${bannerId} {
      background-image: url(${configuration.cdn(namespace + bg.replace('.', '@2x.'))});
    }
  }
</style>`;
};

module.exports = { imageSelector };
