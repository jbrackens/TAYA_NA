import type { GetServerSideProps } from "next";

const SportsIndex = () => null;

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/sports/home",
    permanent: false,
  },
});

export default SportsIndex;
