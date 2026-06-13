import Head from 'next/head';
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from '../../../providers/translations/defaults';
import { useTranslation } from 'i18n';
import { useRouter } from 'next/router';
import MarketsDetailsContainer from '../../../containers/markets/details';
import { NextPageContext } from 'next';
import { securedPage } from '../../../utils/auth';
import { Id, PunterRoleEnum } from '@phoenix-ui/utils';

function MarketsDetails() {
  const router = useRouter()
  const { id } = router.query
  const { t } = useTranslation(MarketsDetails.namespace);
  return (
    <>
      <Head>
        <title>{ t('PAGE_HEADER') }</title>
      </Head>
      <Layout>
        <MarketsDetailsContainer id={id as Id} />
      </Layout>
    </>
  );
}

MarketsDetails.namespace = "page-markets-details";
MarketsDetails.getInitialProps = async (ctx: NextPageContext) => securedPage(ctx, {
  namespacesRequired: [...defaultNamespaces, MarketsDetails.namespace],
}, [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER]);

export default MarketsDetails;
