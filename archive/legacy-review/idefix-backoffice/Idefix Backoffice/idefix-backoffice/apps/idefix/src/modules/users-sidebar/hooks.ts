import { ChangeEvent, SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector, usersSidebarSlice } from "@idefix-backoffice/idefix/store";

export const useUsersSidebar = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const users = useAppSelector(usersSidebarSlice.getUsers);
  const filters = useAppSelector(usersSidebarSlice.getFilters);
  const isLoading = useAppSelector(usersSidebarSlice.getIsLoading);
  const [query, setQuery] = useState("");
  const userId = Number(params.userId);

  const filteredUsers = useMemo(
    () =>
      users.filter(user => {
        if (query) {
          const userToMatch = user.name.toLowerCase();
          const match = userToMatch.indexOf(query.toLowerCase()) !== -1;
          return match;
        }
        return user;
      }),
    [users, query]
  );

  const handleChangeQuery = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  }, []);

  const handleSelectUser = useCallback(
    (userId: number) => () => {
      navigate(`/users/${userId}`);
    },
    [navigate]
  );

  const handleToggleFilter = useCallback(
    (key: string) => (_event: SyntheticEvent<Element, Event>, checked: boolean) => {
      dispatch(usersSidebarSlice.toggleFilter({ key, value: checked }));
    },
    [dispatch]
  );

  useEffect(() => {
    dispatch(usersSidebarSlice.fetchUsers());
  }, [dispatch]);

  return { users: filteredUsers, isLoading, handleChangeQuery, handleSelectUser, handleToggleFilter, userId, filters };
};
