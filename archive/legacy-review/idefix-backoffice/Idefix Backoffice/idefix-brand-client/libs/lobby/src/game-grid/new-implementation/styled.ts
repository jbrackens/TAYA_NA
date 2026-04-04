import styled from "styled-components";

export const GamesGrid = styled.div`
  width: 330px;
  margin: auto;
  min-height: 100vh;
  margin-bottom: 80px;

  .no-result {
    display: flex;
    margin-top: 25px;
    justify-content: center;
    color: ${({ theme }) => theme.palette.contrast};
    ${({ theme }) => theme.typography.text21Bold}
  }

  .lobby-category:not(:last-child) {
    margin-bottom: 25px;
  }

  [data-search-only] {
    display: none;
  }

  .games {
    position: relative;
  }

  .games__loader-wrap {
    position: absolute;
    bottom: -58px;
    left: 0;
    right: 0;
    height: 36px;

    display: flex;
    justify-content: center;
  }

  .games__loader-wrap--hidden {
    display: none;
  }

  .games__loader {
    height: 36px;
    width: 36px;
  }

  .game {
    position: relative;
    float: left;
    margin: 12px;
    cursor: pointer;
    box-shadow: ${({ theme }) => theme.shadows.gameThumb};
    border-radius: 5px;
    overflow: hidden;
  }

  .game.single,
  .game.double,
  .game.max {
    background: ${({ theme }) => theme.palette.secondarySemiLightest};
  }

  .game.single {
    width: 150px;
    height: 150px;
  }

  .game.double {
    width: 310px;
    height: 150px;
  }

  .game.max {
    width: 150px;
    height: 150px;
    grid-row: span 2;
    grid-column: span 2;
  }

  .game__image {
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 1;
  }

  .game__label {
    width: 30px;
    height: 30px;
    position: absolute;
    z-index: 2;
    top: 5px;
    right: 5px;
  }

  .game__description {
    position: absolute;
    z-index: 2;
    padding: 4px 14px;
    color: ${({ theme }) => theme.palette.contrast};
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 0 0 5px 5px;
    background-color: rgba(0, 0, 0, 0.65);
    white-space: nowrap;
    font-size: 12px;
    text-align: center;
    text-transform: capitalize;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 700;
  }

  .game__hover-overlay,
  .game__hover-icon {
    display: none;
  }

  @media screen and (min-width: 768px) {
    .game:hover {
      .game__hover-overlay {
        display: initial;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
        background-color: ${({ theme }) =>
          theme.palette.primary}4D; // 0.3 opacity

        // Because of mix-blend-mode we need to separate hover-overlay and hover-icon
        mix-blend-mode: multiply;
      }

      .game__hover-icon {
        display: initial;
        height: 80px;
        width: 80px;
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 2;
        margin: -40px 0 0 -40px;
        fill: ${({ theme }) => theme.palette.contrast};
      }
    }
  }

  .game.double,
  .game.single {
    .game__hover-icon {
      width: 60px;
      height: 60px;
      margin: -30px 0 0 -30px;
    }
  }

  .game__jackpot-value {
    position: absolute;
    z-index: 2;
    padding: 6px 10px;
    top: 12px;
    left: 12px;
    color: ${({ theme }) => theme.palette.contrast};
    background-color: rgba(0, 0, 0, 0.65);
    border-radius: 5px;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
    text-transform: capitalize;
  }

  .game__jackpot-value--single {
    padding: 4px 8px;
    top: 12px;
    font-size: 12px;
  }

  @media screen and (min-width: 330px) {
    width: 325px;
  }

  @media screen and (min-width: 680px) {
    width: 675px;
  }

  @media screen and (min-width: 1030px) {
    width: 1025px;
  }

  @supports (display: grid) {
    width: 325px;

    .games {
      padding: 0;
      display: grid;
      grid-auto-flow: dense;
      grid-gap: 25px;
      grid-auto-rows: 150px;
      grid-template-columns: repeat(2, 150px);
    }

    .game {
      margin: 0;
    }

    .game.single {
      width: auto;
      height: auto;
    }

    .game.double {
      width: auto;
      height: auto;
      grid-column: span 2;
    }

    .game.max {
      width: auto;
      height: auto;
      grid-row: span 2;
      grid-column: span 2;
    }

    .game__image {
      width: 100%;
      height: 100%;
      position: relative;
      z-index: 1;
    }

    @media screen and (min-width: 680px) {
      width: 675px;

      .games {
        grid-template-columns: repeat(4, 150px);
      }
    }

    @media screen and (min-width: 1030px) {
      width: 1025px;

      .games {
        grid-template-columns: repeat(6, 150px);
      }
    }
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

  .lazyloaded,
  .lazyloading {
    opacity: 1;
    transition: opacity 0.5s ease;
  }
`;
