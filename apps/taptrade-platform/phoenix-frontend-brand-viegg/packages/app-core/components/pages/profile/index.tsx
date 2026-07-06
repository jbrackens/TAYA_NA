import { useDispatch, useSelector } from "react-redux";
import Head from "next/head";
import { increment, selectValue } from "../../../lib/slices/profileSlice";
import { defaultNamespaces } from "../defaults";

function Profile() {
  const dispatch = useDispatch();
  const reducerValue = useSelector(selectValue);

  const dispatchIncrementValue = () => {
    dispatch(increment());
  };

  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <>
        <h1>Profile</h1>
        <p>Value from reducer: {reducerValue}</p>
        <button onClick={() => dispatchIncrementValue()}>+1</button>
      </>
    </>
  );
}

Profile.namespacesRequired = [...defaultNamespaces];

export default Profile;
