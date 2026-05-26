import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/audit-logs",
    permanent: false,
  },
});

export default function LogsRedirectPage() {
  return null;
}
