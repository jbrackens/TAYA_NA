import Head from 'next/head';
import { Layout } from "../../components/layout";
import { defaultNamespaces } from '../../providers/translations/defaults';
import { useTranslation } from 'i18n';
import { useRouter } from 'next/router';
import UsersDetailsContainer from '../../containers/users/details';
import { NextPageContext } from 'next';
import { securedPage } from '../../utils/auth';
import { Id, PunterRoleEnum } from '@phoenix-ui/utils';

function UsersDetails() {
  const router = useRouter()
  const { id } = router.query
  const { t } = useTranslation(UsersDetails.namespace);
  return (
    <>
      <Head>
        <title>{ t('HEADER') }</title>
      </Head>
      <Layout>
        <UsersDetailsContainer id={id as Id} />
      </Layout>
    </>
  );
}

UsersDetails.namespace = "page-users-details";
UsersDetails.getInitialProps = async (ctx: NextPageContext) => securedPage(ctx, {
  namespacesRequired: [...defaultNamespaces, UsersDetails.namespace],
}, [PunterRoleEnum.ADMIN]);

export default UsersDetails;
