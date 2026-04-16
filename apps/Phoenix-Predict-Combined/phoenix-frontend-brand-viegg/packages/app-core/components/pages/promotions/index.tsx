import React, { useState } from "react";
import Head from "next/head";
import { useSelector } from "react-redux";
import { defaultNamespaces } from "../defaults";
import { StaticContentBlock } from "../../static-page";
import { useTranslation } from "i18n";
import { Content } from "../responsible-gaming/index.styled";
import {
  useFreebets,
  useOddsBoosts,
  acceptOddsBoost,
} from "../../../services/go-api";
import type { GoFreebet, GoOddsBoost } from "../../../services/go-api";

function Promotions() {
  const { t } = useTranslation(["page-promotions"]);
  const userId: string = useSelector(
    (state: any) => state.settings.userData.userId,
  );
  const { data: freebetsData, isLoading: freebetsLoading } = useFreebets(
    userId,
    "active",
  );
  const {
    data: oddsBoostsData,
    isLoading: oddsBoostsLoading,
    refetch: refetchOddsBoosts,
  } = useOddsBoosts(userId, "available");
  const [applyingBoostId, setApplyingBoostId] = useState<string | null>(null);

  const freebets: GoFreebet[] = freebetsData?.data || [];
  const oddsBoosts: GoOddsBoost[] = oddsBoostsData?.data || [];
  const isLoading = freebetsLoading || oddsBoostsLoading;

  const handleApplyOddsBoost = async (oddsBoostId: string) => {
    setApplyingBoostId(oddsBoostId);
    try {
      await acceptOddsBoost(oddsBoostId, userId);
      refetchOddsBoosts();
    } finally {
      setApplyingBoostId(null);
    }
  };

  const formatExpiry = (expiresAt?: string) => {
    if (!expiresAt) return null;
    return new Date(expiresAt).toLocaleDateString();
  };

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StaticContentBlock
        title={t("TITLE")}
        content={
          <Content>
            {isLoading ? (
              <p>Loading promotions...</p>
            ) : (
              <>
                <h2>Free Bets</h2>
                {freebets.length === 0 ? (
                  <p>No active free bets available.</p>
                ) : (
                  <ul>
                    {freebets.map((freebet) => (
                      <li key={freebet.id}>
                        <strong>${freebet.amount.toFixed(2)}</strong>
                        {" — "}
                        {freebet.status}
                        {freebet.expires_at && (
                          <span>
                            {" "}
                            (expires {formatExpiry(freebet.expires_at)})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <h2>Odds Boosts</h2>
                {oddsBoosts.length === 0 ? (
                  <p>No available odds boosts.</p>
                ) : (
                  <ul>
                    {oddsBoosts.map((boost) => (
                      <li key={boost.id}>
                        <strong>+{boost.boost_percentage}%</strong>
                        {" — "}
                        {boost.status}
                        {boost.expires_at && (
                          <span>
                            {" "}
                            (expires {formatExpiry(boost.expires_at)})
                          </span>
                        )}
                        {" "}
                        <button
                          onClick={() => handleApplyOddsBoost(boost.id)}
                          disabled={applyingBoostId === boost.id}
                        >
                          {applyingBoostId === boost.id
                            ? "Applying..."
                            : "Apply"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Content>
        }
      />
    </>
  );
}

Promotions.namespacesRequired = [...defaultNamespaces, "page-promotions"];

export default Promotions;
