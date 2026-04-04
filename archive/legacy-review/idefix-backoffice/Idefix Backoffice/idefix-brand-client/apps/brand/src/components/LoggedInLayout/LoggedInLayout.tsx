import * as React from "react";
import { useSelector } from "react-redux";
import { IntlContext, IntlShape } from "react-intl";
import Head from "next/head";
import {
  Dialogs,
  MobileMenu,
  ErrorDialog,
  InfoDialog
} from "@brandserver-client/lobby";
import { Profile } from "@brandserver-client/types";
import { useMessages, useIsMyAccount } from "@brandserver-client/hooks";
import { useRouter } from "next/router";
// import { BetbyGame } from "@brandserver-client/features/betby";
import { MyAccountLayout } from "@brandserver-client/features/my-account-layout";
import { VieState } from "../../redux";
import { mobileMenuLinks } from "../../utils/mobileMenuLinks";
import { useMyAccountLinks } from "../../hooks/useMyAccountLinks";
import Footer from "../Footer";
import Header from "../Header";
import MobileToolbar from "../Toolbar";

interface Props {
  profile: Profile;
  children: React.ReactNode;
}

export const LoggedinLayout: React.FC<Props> = ({ profile, children }) => {
  // TODO: better to create selector in the slice and use selector for it.
  const classes = useSelector((state: VieState) => state.app.classes);
  const intl = React.useContext(IntlContext as React.Context<IntlShape>);
  const router = useRouter();

  const messages = useMessages({
    title: "google.header"
  });

  const isInbox = router.pathname === "/loggedin/inbox";
  const isMyAccount = useIsMyAccount();

  const sidebarLinks = useMyAccountLinks();

  React.useEffect(() => {
    document.body.className = classes.join(" ");
  }, []);

  return (
    <>
      <Head>
        <title>{messages.title}</title>
        <meta
          name="viewport"
          content="width=device-width, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>
      <ErrorDialog redirectUrl="/loggedin/sports/betby" />
      <InfoDialog />
      {!isInbox && (
        <Header profile={profile} menuTab="deposit" locale={intl.locale} />
      )}
      {/* <BetbyGame /> */}
      {isMyAccount ? (
        <MyAccountLayout sidebarLinks={sidebarLinks}>
          {children}
        </MyAccountLayout>
      ) : (
        children
      )}
      <MobileMenu content={mobileMenuLinks} />
      <Dialogs />
      {!isInbox && <MobileToolbar />}
      <Footer language={intl.locale} />
    </>
  );
};
