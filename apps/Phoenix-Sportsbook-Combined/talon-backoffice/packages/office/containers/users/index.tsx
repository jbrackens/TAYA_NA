import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import UsersList from "../../components/users/list";
import UsersRecentActivityDrawer from "../../components/users/recent-activity";
import {
  getUsersList,
  getUsersListSucceeded,
  selectData,
  selectTableMeta,
  selectRecentActivities,
  getUserRecentActivitiesSucceeded,
  resetUserRecentActivities,
} from "../../lib/slices/usersSlice";
import { useApi } from "../../services/api/api-service";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";

const UsersContainer = () => {
  const dispatch = useDispatch();
  const records = useSelector(selectData);
  const recentActivities = useSelector(selectRecentActivities);
  const { paginationResponse } = useSelector(selectTableMeta);
  const router = useRouter();

  const {
    p,
    limit,
    searchId,
    searchName,
    searchFName,
    searchLName,
    searchDob,
  } = router.query as {
    p?: number;
    limit?: number;
    searchId?: string;
    searchName?: string;
    searchFName?: string;
    searchLName?: string;
    searchDob?: string;
  };

  const [triggerUsersListApi, isLoading] = useApi(
    "admin/users",
    Method.GET,
    getUsersListSucceeded,
  );
  const [triggerRecentActivitiesApi, isLoadingRecentActivities] = useApi(
    "admin/punters/:id/timeline",
    Method.GET,
    getUserRecentActivitiesSucceeded,
  );

  const [previewVisible, setPreviewVisibility] = useState(false);
  const [previewId, setPreviewId] = useState<string | number | undefined>();

  const handleTableChange = (pagination: any, filters: any, _sorting: any) => {
    const { lastName, dateOfBirth, firstName, username } = filters;
    // to reset pagination on filter change
    const areFiltersNew =
      (username && username !== searchName) ||
      (lastName && lastName !== searchLName) ||
      (firstName && firstName !== searchFName) ||
      (dateOfBirth && dateOfBirth !== searchDob);

    router.push(
      {
        query: {
          ...(pagination.current && {
            p: areFiltersNew ? 1 : pagination.current,
          }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
          ...(username && { searchName: username[0] }),
          ...(firstName && { searchFName: firstName[0] }),
          ...(lastName && { searchLName: lastName[0] }),
          ...(dateOfBirth && { searchDob: dateOfBirth[0] }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleOpenRecentActivity = (id: string | number) => {
    setPreviewVisibility(true);
    setPreviewId(id);
  };

  const handleCloseRecentActivity = () => {
    setPreviewVisibility(false);
    setPreviewId(undefined);
    dispatch(resetUserRecentActivities());
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        dispatch(getUsersList());
        triggerUsersListApi(undefined, {
          query: {
            filter: {
              ...(searchId && { punterId: searchId }),
              ...(searchName && { username: searchName }),
              ...(searchFName && { firstName: searchFName }),
              ...(searchLName && { lastName: searchLName }),
              ...(searchDob && { dateOfBirth: searchDob }),
            },
            ...(searchId && { filter: { punterId: searchId } }),
            pagination: {
              currentPage: p ? p : 1,
              itemsPerPage: limit ? limit : 20,
            },
          },
        });
      } catch (err) {
        console.error({ err });
      }
    };
    fetchUsers();
  }, [searchId, searchName, searchFName, searchLName, searchDob, p, limit]);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (previewId) {
        try {
          await triggerRecentActivitiesApi(undefined, {
            id: previewId,
          });
        } catch (err) {
          console.error({ err });
        }
      }
    };
    fetchRecentActivities();
  }, [previewId]);

  return (
    <>
      <UsersList
        data={records}
        pagination={paginationResponse}
        isLoading={isLoading}
        handleTableChange={handleTableChange}
        handleOpenRecentActivity={handleOpenRecentActivity}
      />
      <UsersRecentActivityDrawer
        visible={previewVisible}
        data={recentActivities}
        isLoading={isLoadingRecentActivities}
        onClose={handleCloseRecentActivity}
      />
    </>
  );
};

export default UsersContainer;
