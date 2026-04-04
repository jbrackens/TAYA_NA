import * as React from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import startCase from "lodash/startCase";
import { Content, ExistingBannerTemplate } from "app/types";

import { removeBanner, setBanner } from "../campaignBannerSlice";
import api from "../../../api";
import { Card, CardContent, CardHeader, Loader, PreviewCardContent, SearchCard } from "../../../components";
import { Remove } from "../../../icons";
import { AppDispatch } from "../../../redux";

const StyledLocationBanner = styled.div`
  .banner__search {
    display: flex;
    align-items: center;
    margin-top: 8px;
    width: 100%;
  }
  .search-wrapper {
    width: 432px;
  }

  .selected-banner {
    margin-top: 8px;
  }

  .loader-wrapper {
    margin-left: 14px;
    max-width: 20px;
    height: 20px;
  }

  .banner__remove-button {
    fill: ${({ theme }) => theme.palette.blackMiddle};

    &:hover {
      cursor: pointer;
      fill: ${({ theme }) => theme.palette.blackDark};
    }
  }
`;

interface Props {
  location: string;
  className?: string;
  isEditable: boolean;
  isLoading: boolean;
  banner: Partial<ExistingBannerTemplate> | null;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  resetForm: () => void;
}

interface Params {
  brandId: string;
  campaignId: string;
}

const LocationBanner = ({ location, className, banner, isEditable, isLoading, setFieldValue, resetForm }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const { brandId, campaignId } = useParams<Params>();
  const [banners, setBanners] = React.useState<Content[]>([]);
  const [isFetchingBanners, setIsFetchingBanners] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const handleSearch = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.currentTarget.value),
    []
  );

  const handleResultClick = React.useCallback(
    (searchItem: Content, onClose: () => void) => {
      setFieldValue("contentId", searchItem.id);
      dispatch(setBanner({ banner: searchItem, location }));
      setSearchQuery("");
      onClose();
    },
    [dispatch, location, setFieldValue]
  );

  const handleRemove = React.useCallback(() => {
    if (banner?.bannerId) {
      dispatch(removeBanner({ campaignId: Number(campaignId), bannerId: banner.bannerId }));
      resetForm();
    }
  }, [banner, campaignId, dispatch, resetForm]);

  React.useEffect(() => {
    async function fetchBanners() {
      try {
        setIsFetchingBanners(true);
        const response = await api.content.getContent({ brandId, contentType: "banner", location });
        const banners = response.data.data;
        setBanners(banners);
        setIsFetchingBanners(false);
      } catch (e) {
        setIsFetchingBanners(false);
      }
    }

    fetchBanners();
  }, [brandId, location]);

  if (!isEditable && !banner) return null;

  return (
    <StyledLocationBanner className={className}>
      <p className="text-main-reg">{startCase(location)}</p>
      {isEditable && (
        <div className="banner__search">
          <div className="search-wrapper">
            <SearchCard
              data={banners}
              searchQuery={searchQuery}
              searchBy={["name"]}
              onChange={handleSearch}
              disabled={isFetchingBanners || isLoading}
              placeholder={isFetchingBanners ? "Loading..." : ""}
            >
              {(searchItem, onClose) => (
                <Card
                  appearance="flat"
                  key={`${searchItem.name}${searchItem.id}`}
                  onClick={() => handleResultClick(searchItem, onClose)}
                >
                  <CardHeader>{searchItem.name}</CardHeader>
                  <CardContent>
                    <PreviewCardContent info={searchItem.text} />
                  </CardContent>
                </Card>
              )}
            </SearchCard>
          </div>
          {isLoading && (
            <div className="loader-wrapper">
              <Loader />
            </div>
          )}
        </div>
      )}
      {banner && (
        <div className="selected-banner">
          <Card appearance="flat">
            <CardHeader
              action={
                isEditable && (
                  <Remove className="banner__remove-button" onClick={handleRemove} data-testid="delete-button" />
                )
              }
            >
              {banner.name}
            </CardHeader>
            <CardContent>
              <PreviewCardContent info={banner.text!} />
            </CardContent>
          </Card>
        </div>
      )}
    </StyledLocationBanner>
  );
};

export { LocationBanner };
