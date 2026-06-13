import { Button as ButtonEnum, Method, useSpy, Id } from "@phoenix-ui/utils";
import React, { useState, useEffect } from "react";
import { useApi } from "../../../../services/api/api-service";
import { Button } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { API_USERS_LIFECYCLE_URL } from "../constants";

export type UserLifecycleLogoutLabels = {
  setCoolOff: string;
  resetCoolOff: string;
};

export type LifecycleCoolOffProps = {
  key: string;
  id: Id;
  label: string;
  onComplete: Function;
};

const UserLifecycleLogout = ({
  id,
  label,
  onComplete,
}: LifecycleCoolOffProps) => {
  const [submitChange, setSubmitChange] = useState(false);
  const { spy } = useSpy();
  const [fakeLoading, setFakeLoading] = useState(false);
  const [triggerApi] = useApi(API_USERS_LIFECYCLE_URL, Method.POST);

  const handleClick = () => setSubmitChange(true);

  spy(submitChange, async ({ values }) => {
    if (values) {
      try {
        setFakeLoading(true);
        await triggerApi(null, {
          id,
          action: "logout",
        });
      } catch (err) {
        console.error({ err });
      }
      setSubmitChange(false);
    }
  });

  useEffect(() => {
    if (fakeLoading) {
      setTimeout(() => {
        setFakeLoading(false);
        onComplete();
      }, 2000);
    }
  }, [fakeLoading]);

  return (
    <Button
      shape={ButtonEnum.Shape.ROUND}
      icon={<LogoutOutlined />}
      type={ButtonEnum.Type.PRIMARY}
      loading={fakeLoading}
      onClick={handleClick}
      danger
    >
      {label}
    </Button>
  );
};

export default UserLifecycleLogout;
