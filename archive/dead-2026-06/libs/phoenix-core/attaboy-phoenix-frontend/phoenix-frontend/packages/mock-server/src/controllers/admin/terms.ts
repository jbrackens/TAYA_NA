export default {
  async termsAndConditions(req: any, res: any) {
    const { currentTermsVersion, termsContent } = req.body;

    if (currentTermsVersion !== undefined && termsContent !== undefined) {
      return res.status(200).send(req.body);
    }
    return res.status(400).send({
      message: `invalid data`,
    });
  },
};
