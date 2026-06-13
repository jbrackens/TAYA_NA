import React, { useEffect } from "react";
import { List } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { addMessageToQueue } from "../../../../lib/slices/channels/channelSubscriptionSlice";
import { SelectFixtures } from "../../../../lib/slices/fixtureSlice";
import { Fixture } from "..";
import { useState } from "react";
import { useTranslation } from "i18n";
import { ComingSoon } from "./index.styled";

type ListComponentProps = {
  fixtures: Fixture[];
  isLoading: boolean;
  renderFixture: any;
};

const ListComponent: React.FC<ListComponentProps> = ({
  fixtures,
  isLoading,
  renderFixture,
}) => {
  const dispatch = useDispatch();
  const fixturesUpdatedData = useSelector(SelectFixtures);
  const [fixturesData, setFixturesData] = useState(fixtures);
  const { t } = useTranslation(["fixture-list"]);

  useEffect(() => {
    if (fixtures) {
      fixtures.forEach((fixture) => {
        if (fixture.subscribed === undefined) {
          dispatch(
            addMessageToQueue({
              channel: `fixture^${fixture.sport.sportId}^${fixture.fixtureId}`,
              event: "subscribe",
            }),
          );
        }
      });
    }

    return () => {
      fixtures.forEach((fixture) => {
        dispatch(
          addMessageToQueue({
            channel: `fixture^${fixture.sport.sportId}^${fixture.fixtureId}`,
            event: "unsubscribe",
          }),
        );
      });
    };
  }, [fixtures]);

  useEffect(() => {
    if (fixtures) {
      setFixturesData((prevFixtures) => [
        ...prevFixtures.map((prevFixture) => {
          const updatedData = fixturesUpdatedData[prevFixture.fixtureId];
          if (updatedData && prevFixture.fixtureId === updatedData.id) {
            return {
              ...prevFixture,
              competitors: {
                home: {
                  ...prevFixture.competitors.home,
                  score: updatedData.score.home,
                },
                away: {
                  ...prevFixture.competitors.away,
                  score: updatedData.score.away,
                },
              },
              status: updatedData.status,
              startTime: updatedData.startTime,
            };
          }
          return prevFixture;
        }),
      ]);
    }
  }, [fixturesUpdatedData]);

  return (
    <List
      grid={{ gutter: 16, column: 1 }}
      loading={isLoading}
      split={true}
      dataSource={fixturesData}
      renderItem={renderFixture}
      locale={{
        emptyText: <ComingSoon>{t("COMING_SOON")}</ComingSoon>,
      }}
    />
  );
};

export { ListComponent };
