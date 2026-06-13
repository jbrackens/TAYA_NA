import Head from 'next/head';
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from '../../../providers/translations/defaults';
import { useTranslation } from 'i18n';
import { useRouter } from 'next/router';
import FixturesDetailsContainer from '../../../containers/fixtures/details';
import { NextPageContext } from 'next';
import { securedPage } from '../../../utils/auth';
import { Id, PunterRoleEnum } from '@phoenix-ui/utils';

function FixturesDetails() {
  const router = useRouter()
  const { id } = router.query
  const { t } = useTranslation(FixturesDetails.namespace);
  return (
    <>
      <Head>
        <title>{ t('PAGE_HEADER') }</title>
      </Head>
      <Layout>
        <FixturesDetailsContainer id={id as Id} />
      </Layout>
    </>
  );
}

FixturesDetails.namespace = "page-fixtures-details";
FixturesDetails.getInitialProps = async (ctx: NextPageContext) => securedPage(ctx, {
  namespacesRequired: [...defaultNamespaces, FixturesDetails.namespace],
}, [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER]);

export default FixturesDetails;
