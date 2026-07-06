import { validateAndDecode, resolveToken } from "../../../../utils/auth";

export type ProfileProps = {
  theme?: any;
};

const Profile = () => {
  try {
    const token = resolveToken();
    const decodedToken = token ? validateAndDecode(token) : null;

    if (decodedToken) {
      const { name } = decodedToken;
      return (
        <div className="cursor-default px-4 text-xs text-[var(--t1)]">
          {name}
        </div>
      );
    }
    return <></>;
  } catch (e) {}
  return <></>;
};

export default Profile;
