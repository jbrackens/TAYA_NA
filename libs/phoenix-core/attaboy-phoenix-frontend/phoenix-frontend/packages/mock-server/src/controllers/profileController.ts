import { profile } from "../mocked_data/profile";

export default {
  async updateCommunicationSettings(req: any, res: any) {
    const { general, betting } = req.body;

    const timeout = general ? 5000 : 100;

    setTimeout(() => {
      return res.status(200).send({ message: `settings updated` });
    }, timeout);
  },

  async changePassword(req: any, res: any) {
    const { oldPassword, new_password } = req.body;

    if (profile.password != oldPassword) {
      return res
        .status(400)
        .send({
          message: `old password incorrect`,
        });
    }
    
    return res
      .status(200)
      .send({ message: `password changed successfully` });
  },
};
