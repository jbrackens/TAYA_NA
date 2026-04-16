import React from "react";
import { Wrapper } from "./index.styled";
import { validateAndDecode, resolveToken } from "../../../../utils/auth";

export type ProfileProps = {
  theme?: any;
};

const Profile = ({ theme }: ProfileProps) => {
  try {
    const token = resolveToken();
    const decodedToken = token ? validateAndDecode(token) : null;

    if (decodedToken) {
      const { name } = decodedToken;
      return <Wrapper theme={theme}>{name}</Wrapper>;
    }
    return <></>;
  } catch (e) {}
  return <></>;
};

export default Profile;
