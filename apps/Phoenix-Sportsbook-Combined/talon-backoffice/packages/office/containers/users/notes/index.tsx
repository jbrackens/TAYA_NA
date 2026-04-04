import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Method, Id } from "@phoenix-ui/utils";
import { useApi } from "../../../services/api/api-service";
import {
  getUserNotesSucceeded,
  selectNotesTableMeta,
  selectNotesData,
  selectUpdateNotes,
  setUserNotesUpdate,
  getUserNotes,
} from "../../../lib/slices/usersDetailsSlice";
import UsersDetailsNotesList from "../../../components/users/notes/list";
import { useState } from "react";
import { useRouter } from "next/router";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../../types/filters";

type UsersNotesContainerProps = {
  id: Id;
};

const UsersNotesContainer = ({ id }: UsersNotesContainerProps) => {
  const dispatch = useDispatch();
  const records = useSelector(selectNotesData);
  const updateNotes = useSelector(selectUpdateNotes);
  const { paginationResponse } = useSelector(selectNotesTableMeta);

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  const [refreshData, setRefreshData] = useState(false);
  const [triggerNotesApi, isLoading] = useApi(
    "admin/punters/:id/notes",
    Method.GET,
    getUserNotesSucceeded,
  );

  useEffect((): any => {
    if (!updateNotes) return;
    setRefreshData(true);
    dispatch(setUserNotesUpdate(false));
  }, [updateNotes]);

  useEffect((): any => {
    const fetchUserNotes = async () => {
      try {
        dispatch(getUserNotes());
        await triggerNotesApi(undefined, {
          id,
          query: {
            page: p ? p : 1,
            limit: limit ? limit : 20,
          },
        });
      } catch (err) {
        console.error({ err });
      }
    };
    fetchUserNotes();
    setRefreshData(false);
  }, [id, p, limit, refreshData]);

  const handleTableChange = (
    pagination: TablePagination,
    _filters: TableFilters,
    _sorting: TableSorting,
  ) => {
    router.push(
      {
        query: {
          ...router.query,
          ...(pagination.current && { p: pagination.current }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  return (
    <UsersDetailsNotesList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
    />
  );
};

export default UsersNotesContainer;
