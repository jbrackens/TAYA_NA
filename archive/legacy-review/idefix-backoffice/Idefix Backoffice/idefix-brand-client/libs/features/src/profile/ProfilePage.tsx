import * as React from "react";
import { fetchExclusions, MyAccountPage } from "@brandserver-client/lobby";
import { Profile as ProfileType } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { withInitialProps } from "../with-initial-props";
import Profile from "./Profile";

interface IProps {
  data: ProfileType | undefined;
  isLoading: boolean;
  onSetData: React.Dispatch<React.SetStateAction<ProfileType | undefined>>;
}

const ProfilePage: MyAccountPage<IProps, ProfileType> = ({
  data,
  isLoading,
  onSetData
}) => {
  const { Loader } = useRegistry();

  if (!data || isLoading) {
    return <Loader />;
  }

  return <Profile profile={data} onSetData={onSetData} />;
};

ProfilePage.fetchInitialProps = async ({ lobby }) => {
  const [profile] = await Promise.all([
    lobby.api.profile.getProfile(),
    lobby.store.dispatch(fetchExclusions())
  ]);
  return profile;
};

export default withInitialProps(ProfilePage);
