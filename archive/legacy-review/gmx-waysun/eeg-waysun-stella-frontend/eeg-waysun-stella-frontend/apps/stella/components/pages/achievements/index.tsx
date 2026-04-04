import React from "react";
import { AchievementsContainer } from "../../rule-configuration-forms/achievements/container";
import { defaultNamespaces } from "../defaults";

const Achievements = () => {
  return <AchievementsContainer />;
};

Achievements.namespacesRequired = [...defaultNamespaces];

export default Achievements;
