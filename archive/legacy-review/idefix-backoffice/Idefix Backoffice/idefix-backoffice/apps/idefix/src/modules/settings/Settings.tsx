import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { FC } from "react";
import Fab from "@mui/material/Fab";

import { BrandSelector } from "@idefix-backoffice/idefix/components";
import { useSettings } from "./hooks";
import { CountriesTable } from "./components/CountriesTable";
import { GamesTable } from "./components/GamesTable";
import { GameManufacturersTable } from "./components/GameManufacturers";
import { BonusesTable } from "./components/BonusesTable";
import { PaymentProviders } from "./components/PaymentProviders";
import { PaymentMethodsTable } from "./components/PaymentMethodsTable";
import { PromotionsTable } from "./components/PromotionsTable";
import { GameProfilesTable } from "./components/GameProfilesTable";
import { RisksTable } from "./components/RisksTable";

const FAB_BUTTONS = ["games", "bonuses", "promotions", "game-profiles", "risks"];

const Settings: FC = () => {
  const { data, handlers } = useSettings();
  const {
    type,
    brandId,
    brands,
    paymentMethodId,
    isLoading,
    countries,
    games,
    gameManufacturers,
    bonuses,
    paymentMethods,
    promotions,
    gameProfiles,
    risks,
    paymentMethodProviders,
    isLoadingProviders
  } = data;
  const {
    handleChangeType,
    handleBrandChange,
    handleEditSetting,
    handleArchive,
    handleEditCountry,
    handleEditGame,
    handleEditGameManufacturer,
    handleEditBonus,
    handleEditPaymentMethod,
    handleAddAction,
    handleEditRisk,
    handleGoBack,
    handleOpenDetails
  } = handlers;

  return (
    <Box display="flex" flexDirection="column" position="relative" height="calc(100vh - 49px)">
      <Typography variant="subtitle2">Settings</Typography>

      <Box display="flex" alignItems="center" mt={3}>
        <Select value={type} onChange={event => handleChangeType(event.target.value as string)} fullWidth={false}>
          <MenuItem value="countries">Countries</MenuItem>
          <MenuItem value="games">Games</MenuItem>
          <MenuItem value="game-manufacturers">Game Manufacturers</MenuItem>
          <MenuItem value="bonuses">Bonuses</MenuItem>
          <MenuItem value="payment-methods">Payment methods</MenuItem>
          <MenuItem value="promotions">Promotions</MenuItem>
          <MenuItem value="game-profiles">Game profiles</MenuItem>
          <MenuItem value="risks">Risks</MenuItem>
        </Select>

        <Box ml={2}>
          {["countries", "bonuses", "promotions", "game-profiles"].includes(type) && (
            <BrandSelector brands={brands} selectedBrand={brandId} onChange={handleBrandChange} />
          )}
        </Box>
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box display="flex" flexDirection="column" mt={3} mb="60px">
        {type === "countries" && (
          <CountriesTable items={countries} isLoading={isLoading} onEditCountry={handleEditCountry} />
        )}
        {type === "games" && <GamesTable items={games} isLoading={isLoading} onEditGame={handleEditGame} />}
        {type === "game-manufacturers" && (
          <GameManufacturersTable
            items={gameManufacturers}
            isLoading={isLoading}
            onEditGameManufacturer={handleEditGameManufacturer}
          />
        )}
        {type === "bonuses" && (
          <BonusesTable items={bonuses} isLoading={isLoading} onEditBonus={handleEditBonus} onArchive={handleArchive} />
        )}
        {type === "payment-methods" &&
          (paymentMethodId ? (
            <PaymentProviders
              paymentMethodProviders={paymentMethodProviders}
              onGoBack={handleGoBack}
              onOpenDetails={handleOpenDetails}
              isLoadingProviders={isLoadingProviders}
            />
          ) : (
            <PaymentMethodsTable
              items={paymentMethods}
              isLoading={isLoading}
              onEditPaymentMethod={handleEditPaymentMethod}
            />
          ))}
        {type === "promotions" && (
          <PromotionsTable
            items={promotions}
            isLoading={isLoading}
            onEditPromotion={handleEditSetting}
            onArchive={handleArchive}
          />
        )}
        {type === "game-profiles" && (
          <GameProfilesTable items={gameProfiles} isLoading={isLoading} onEditGameProfile={handleEditSetting} />
        )}
        {type === "risks" && <RisksTable items={risks} isLoading={isLoading} onEditRisk={handleEditRisk} />}
      </Box>

      <Box position="fixed" right="12px" bottom="12px" zIndex={2}>
        {FAB_BUTTONS.includes(type) &&
          FAB_BUTTONS.map(item =>
            item === type ? (
              <Fab key={item} color="primary" onClick={() => handleAddAction(item, brandId)}>
                <AddIcon />
              </Fab>
            ) : null
          )}
      </Box>
    </Box>
  );
};

export { Settings };
