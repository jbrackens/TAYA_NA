import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import styled from "styled-components";
import { CellProps, Column, Row } from "react-table";
import startCase from "lodash/startCase";
import { ContentRow } from "app/types";

import { PageLayout, Table, DateTimeCell, LanguageCell, Tabs, Tab, ArrayCell } from "../../components";
import { selectBannerLocationsByBrand, selectBrandSettingsIsLoading, selectSettingsIsLoading } from "../../modules/app";
import {
  fetchContent,
  selectBannersTableData,
  LanguagesFilter,
  useLanguagesFilter,
  selectIsLoading,
  ShowMoreCell,
  resetContentState
} from "../../modules/content";
import { AppDispatch, RootState } from "../../redux";
import { CONTENT_TYPES } from "../../utils/constants";

const StyledPage = styled.div`
  .control-tabs {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }
`;

interface Params {
  brandId: string;
  location: string;
}

const BannersPage = () => {
  const dispatch: AppDispatch = useDispatch();
  const { push } = useHistory();
  const { brandId, location } = useParams<Params>();
  const contentType = CONTENT_TYPES.banner;

  const isLoadingBanners = useSelector(selectIsLoading);
  const isLoadingSettings = useSelector(selectSettingsIsLoading);
  const isLoadingBrandSettings = useSelector(selectBrandSettingsIsLoading);

  const tableData = useSelector(selectBannersTableData);
  const locationTabs = useSelector((state: RootState) => selectBannerLocationsByBrand(state, brandId));
  const [bannerLocation, setBannerLocation] = React.useState<string>("frontpage");

  const isLoading = isLoadingBanners || isLoadingSettings || isLoadingBrandSettings;

  const {
    filteredData,
    isLanguagesFilled,
    filteredLanguages,
    onAddLanguageFilter,
    onChangeIsLanguagesFilled,
    resetFilteredLanguages
  } = useLanguagesFilter(tableData);

  React.useEffect(() => {
    if (location) {
      setBannerLocation(location);
    }
  }, [brandId, location]);

  React.useEffect(() => {
    let fetchBannersPromise: any;

    if (bannerLocation === location) {
      fetchBannersPromise = dispatch(
        fetchContent({ brandId, contentType, status: undefined, location: bannerLocation })
      );
    }

    resetFilteredLanguages();
    return () => {
      if (fetchBannersPromise) {
        fetchBannersPromise.abort();
      }

      dispatch(resetContentState());
    };
  }, [dispatch, contentType, brandId, resetFilteredLanguages, bannerLocation, location]);

  const handleOpenDetails = React.useCallback(
    ({ original }: Row<ContentRow>) => {
      push(`/${brandId}/banners/details/${original.id}?language=en`);
    },
    [brandId, push]
  );

  const handleOpenCreateBanner = React.useCallback(() => {
    push(`/${brandId}/banners/new`);
  }, [brandId, push]);

  const handleChangePageType = React.useCallback(
    (newLocation: string | number | boolean | string[]) => {
      push(`/${brandId}/banners/${newLocation}`);
    },
    [brandId, push]
  );

  const columns = React.useMemo(
    () => [
      { Header: "ID", accessor: "externalId", width: 100 },
      { Header: "Type", accessor: "subtype", width: 90 },
      {
        Header: "Tags",
        accessor: "tags",
        width: 90,
        Cell: ArrayCell
      },
      { Header: "Languages", accessor: "languages", width: 90, Cell: LanguageCell },
      { Header: "Updated", accessor: "updatedAt", width: 90, Cell: DateTimeCell },
      {
        Header: "",
        width: 15,
        id: "showMore",
        Cell: ({ cell }: CellProps<ContentRow>) => <ShowMoreCell cell={cell} contentType={contentType} />
      }
    ],
    [contentType]
  );

  return (
    <PageLayout
      fabButtonProps={{
        title: "Create new banner",
        onClick: handleOpenCreateBanner
      }}
    >
      <StyledPage>
        <Table
          columns={columns as Column<ContentRow>[]}
          data={filteredData}
          onRowClick={handleOpenDetails}
          isLoading={isLoading}
          dimmedParameter={{ property: "active", not: true }}
        >
          <div className="control-tabs">
            <Tabs value={bannerLocation} onChange={handleChangePageType}>
              {locationTabs?.map((locationValue: string) => (
                <Tab value={locationValue} key={locationValue}>
                  {startCase(locationValue)}
                </Tab>
              ))}
            </Tabs>
            <LanguagesFilter
              isLanguagesFilled={isLanguagesFilled}
              filteredLanguages={filteredLanguages}
              onAddLanguageFilter={onAddLanguageFilter}
              onChangeIsLanguagesFilled={onChangeIsLanguagesFilled}
            />
          </div>
        </Table>
      </StyledPage>
    </PageLayout>
  );
};

export { BannersPage };
