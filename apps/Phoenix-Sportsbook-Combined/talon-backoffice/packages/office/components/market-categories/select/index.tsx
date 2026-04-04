import React, { useEffect } from "react";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import { Select, Spin } from "antd";

import { useSelector } from "react-redux";
import {
  getSportsSucceeded,
  selectSportsData,
} from "../../../lib/slices/marketCategoriesSlice";
import { useApi } from "../../../services/api/api-service";

const SportSelect = () => {
  const router = useRouter();
  const { sport } = router.query;

  const sports = useSelector(selectSportsData).map((sport) => ({
    name: sport.name,
    id: sport.id,
  }));

  const [triggerSportApi, isSportApiLoading] = useApi(
    "sports",
    Method.GET,
    getSportsSucceeded,
  );

  useEffect(() => {
    triggerSportApi();
  }, []);

  const { Option } = Select;

  const onSelect = (value: string) => {
    router.push(
      {
        pathname: router.pathname,
        query: {
          sport: value,
        },
      },
      undefined,
      {
        shallow: true,
      },
    );
  };

  const selectedValue = sports?.find((el) => el.id === sport)?.id;

  const sportsSelect = () => (
    <Select
      showSearch
      placeholder="Select sport"
      optionFilterProp="children"
      onSelect={onSelect}
      filterOption={(input, option) =>
        option?.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
      value={selectedValue}
    >
      {sports?.map((sport) => (
        <Option value={sport.id} key={sport.id}>
          {sport.name}
        </Option>
      ))}
    </Select>
  );

  return <>{isSportApiLoading ? <Spin /> : sportsSelect()}</>;
};

export default SportSelect;
