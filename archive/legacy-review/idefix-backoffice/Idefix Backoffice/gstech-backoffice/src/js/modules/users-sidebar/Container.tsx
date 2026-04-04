import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchUsers, getUsersSidebarState, toggleFilter } from "./usersSidebarSlice";
import Component from "./Component";

const UserListContainer: FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState<string>("");
  const { isFetching, users, filters } = useSelector(getUsersSidebarState);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleToggleFilter = useCallback(
    (key: string, value: boolean) => {
      dispatch(toggleFilter({ key, value }));
    },
    [dispatch],
  );
  const handleSelectUser = useCallback(userId => navigate(`/users/@${userId}`), [navigate]);
  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);

  const filteredUsers = users.filter(({ name }) => {
    if (search !== "") {
      const userToMatch = name.toLowerCase();
      const isMatch = userToMatch.indexOf(search.toLocaleLowerCase()) !== -1;
      return isMatch;
    }
    return true;
  });

  return (
    <Component
      users={filteredUsers}
      isFetching={isFetching}
      filters={filters}
      onSearch={handleSearch}
      onToggleFilter={handleToggleFilter}
      onSelectUser={handleSelectUser}
    />
  );
};

export default UserListContainer;
