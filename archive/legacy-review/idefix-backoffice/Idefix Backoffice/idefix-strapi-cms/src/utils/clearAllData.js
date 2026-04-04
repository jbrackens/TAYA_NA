const clearAllData = async (serviceName) => {
  try {
    const service = strapi.service(serviceName);
    const ids = await strapi.entityService.findMany(serviceName, {
      fields: ["id"],
    });

    ids.forEach(({ id }) => service.delete(id));
    console.log(`${serviceName} - data was successfully cleared!`);
  } catch (err) {
    console.log(err, `${serviceName} - clear all data util failed!`);
  }
};

module.exports = { clearAllData };





