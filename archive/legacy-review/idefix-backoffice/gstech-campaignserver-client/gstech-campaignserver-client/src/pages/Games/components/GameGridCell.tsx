import * as React from "react";
import { useSelector } from "react-redux";
import cn from "classnames";
import styled from "styled-components";
import VisibilitySensor from "react-visibility-sensor";
import { ViewMode } from "app/types";

import { getThumbnailUrlAndText } from "../utils";
import { selectThumbnailsOptions, selectThumbnailUrlsByBrand } from "../../../modules/app";
import { RootState } from "../../../redux";
import { BlurhashCanvas } from "../../../components/BlurhashCanvas";

const StyledGameGridCell = styled.div`
  position: relative;
  cursor: pointer;
  overflow: hidden;
  filter: drop-shadow(0px 2px 10px rgba(0, 0, 0, 0.35));
  border-radius: 5px;

  & > .description {
    position: absolute;
    z-index: 2;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 22px;
    background: rgba(0, 0, 0, 0.65);
    border-radius: 0px 0px 5px 5px;

    & > .title {
      font-size: 12px;
      line-height: 20px;
      font-weight: 700;
      color: ${({ theme }) => theme.palette.white};
      text-align: center;
    }
  }

  &.single {
    width: 150px;
    height: 150px;

    &.LD {
      width: 165px;
      height: 110px;
    }
  }
  &.max {
    width: 310px;
    height: 310px;
    grid-row: span 2;
    grid-column: span 2;
  }

  .image {
    display: flex;
    justify-content: center;
    align-items: center;
    height: inherit;
    

    & img {
      width: 100%;
      height: 100%;
    }
   }
  }

  .no-thumbnail {
    display: flex;
    justify-content: center;
    align-items: center;
    height: inherit;
    padding-bottom: 22px;
    border-radius: 5px;
    border: 1px solid ${({ theme }) => theme.palette.blackLight};
    color: ${({ theme }) => theme.palette.blackLight};
  }

  .game__blurhash {
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 5px;
  }

  .lazyload {
    opacity: 0;
  }
  
  
  .lazyloaded {
    opacity: 1;
    transition: opacity 0.5s ease;
  }
`;

interface IProps {
  name: string;
  viewMode: ViewMode;
  brandId: string;
  thumbnailId: number;
  onClick: () => void;
}

const GameGridCell: React.FC<IProps> = React.memo(({ name, viewMode, thumbnailId, brandId, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const thumbnailsOptions = useSelector(selectThumbnailsOptions);
  const thumbnailsUrls = useSelector((state: RootState) => selectThumbnailUrlsByBrand(state, brandId));

  const { thumbnailUrl, thumbnailAltText, thumbnailBlurhash } = React.useMemo(
    () =>
      getThumbnailUrlAndText({
        thumbnailsOptions,
        thumbnailsUrls,
        viewMode,
        thumbnailId
      }),
    [thumbnailId, viewMode, thumbnailsUrls, thumbnailsOptions]
  );
  const isUrlDefined = !thumbnailUrl.includes("undefined");

  const onLoad = React.useCallback(() => setTimeout(() => setImageLoaded(true), 2000), []);

  return (
    <VisibilitySensor partialVisibility={true} offset={{ bottom: -2000 }}>
      {({ isVisible }) => (
        <StyledGameGridCell className={cn(viewMode, brandId)} onClick={onClick}>
          {thumbnailBlurhash && isVisible && !imageLoaded && (
            <BlurhashCanvas
              className="game__blurhash"
              hash={thumbnailBlurhash}
              width={16 * (viewMode === "single" ? 1 : 2)}
              height={16 * (viewMode === "max" ? 2 : 1)}
            />
          )}
          {isUrlDefined ? (
            <div className={cn("image lazyload", { lazyloaded: imageLoaded })}>
              {thumbnailUrl !== "" && <img src={thumbnailUrl} alt={thumbnailAltText} onLoad={onLoad} />}
            </div>
          ) : (
            <div className="no-thumbnail">
              <span>No Thumbnail</span>
            </div>
          )}
          <div className="description">
            <div className="title">{name}</div>
          </div>
        </StyledGameGridCell>
      )}
    </VisibilitySensor>
  );
});

export { GameGridCell };
