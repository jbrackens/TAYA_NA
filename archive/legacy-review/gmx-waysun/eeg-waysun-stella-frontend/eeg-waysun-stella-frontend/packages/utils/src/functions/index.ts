export const getParameterById = (
  name: string,
  url = window.location.search,
) => {
  const results = new RegExp("[?&]" + name + "=([^&#]*)").exec(url);
  return results !== null ? results[1] || 0 : false;
};
