import React from "react";
import Box from "@material-ui/core/Box";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import BrandSelector from "../../core/components/brand-selector";
import CountriesTable from "./components/CountriesTable";
import GamesTable from "./components/GamesTable";
import GameManufacturers from "./components/GameManufacturers";
import BonusesTable from "./components/BonusesTable";
import PaymentMethodsTable from "./components/PaymentMethodsTable";
import PromotionsTable from "./components/PromotionsTable";
import GameProfilesTable from "./components/GameProfilesTable";
import RisksTable from "./components/RisksTable";
import PaymentProviders from "./components/PaymentProviders";
import {
  Bonus,
  CountrySettings,
  GameManufacturer,
  GameProfile,
  GameSettings,
  PaymentMethod,
  PaymentMethodProvider,
  PaymentProvider,
  Promotion,
  Risk,
} from "app/types";
import { Typography } from "@material-ui/core";
import Divider from "@material-ui/core/Divider";

interface Props {
  isLoading: boolean;
  type: string;
  brandId: string;
  countries: CountrySettings[];
  games: GameSettings[];
  gameManufacturers: GameManufacturer[];
  bonuses: Bonus[];
  paymentMethods: PaymentMethod[];
  paymentMethodId: string;
  paymentMethodProviders: PaymentMethodProvider | null;
  onOpenDetails: (paymentProvider: PaymentProvider) => void;
  isLoadingProviders: boolean;
  promotions: Promotion[];
  gameProfiles: GameProfile[];
  risks: Risk[];
  onTypeChange: (type: string) => void;
  onBrandIdChange: (brandId: string) => void;
  onEditCountry: (country: CountrySettings) => void;
  onEditGame: (game: GameSettings) => void;
  onEditGameManufacturer: (gameManufacturerId: string) => void;
  onEditBonus: (bonus: Bonus) => void;
  onEditPaymentMethod: ({ id }: { id: number }) => void;
  onAddGame: () => void;
  onAddBonus: (brandId: string) => void;
  onEditPromotion: (setting: any, settingNameKey: string, dialogName: string) => void;
  onAddPromotion: (brandId: string) => void;
  onEditGameProfile: (setting: any, settingNameKey: string, dialogName: string) => void;
  onAddGameProfile: (brandId: string) => void;
  onAddRisk: () => void;
  onEditRisk: (risk: Risk) => void;
  onArchive: (id: number, settingsType: string) => void;
  onGoBack: () => void;
}

export default ({
  isLoading,
  type,
  brandId,
  countries,
  games,
  gameManufacturers,
  bonuses,
  paymentMethods,
  paymentMethodId,
  paymentMethodProviders,
  onOpenDetails,
  isLoadingProviders,
  promotions,
  gameProfiles,
  risks,
  onTypeChange,
  onBrandIdChange,
  onEditCountry,
  onEditGame,
  onEditGameManufacturer,
  onEditBonus,
  onEditPaymentMethod,
  onAddGame,
  onAddBonus,
  onEditPromotion,
  onAddPromotion,
  onEditGameProfile,
  onAddGameProfile,
  onAddRisk,
  onEditRisk,
  onArchive,
  onGoBack,
}: Props) => {
  return (
    <Box display="flex" flexDirection="column" position="relative" p={3} height="calc(100vh - 49px)">
      <Typography variant="subtitle2">Settings</Typography>

      <Box display="flex" alignItems="center" mt={3}>
        <Select value={type} onChange={event => onTypeChange(event.target.value as string)} fullWidth={false}>
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
            <BrandSelector selectedBrand={brandId} onChange={onBrandIdChange} />
          )}
        </Box>
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box display="flex" flexDirection="column" mt={3} mb="60px">
        {type === "countries" && (
          <CountriesTable items={countries} isLoading={isLoading} onEditCountry={onEditCountry} />
        )}
        {type === "games" && <GamesTable items={games} isLoading={isLoading} onEditGame={onEditGame} />}
        {type === "game-manufacturers" && (
          <GameManufacturers
            items={gameManufacturers}
            isLoading={isLoading}
            onEditGameManufacturer={onEditGameManufacturer}
          />
        )}
        {type === "bonuses" && (
          <BonusesTable items={bonuses} isLoading={isLoading} onEditBonus={onEditBonus} onArchive={onArchive} />
        )}
        {type === "payment-methods" &&
          (paymentMethodId ? (
            <PaymentProviders
              paymentMethodProviders={paymentMethodProviders}
              onGoBack={onGoBack}
              onOpenDetails={onOpenDetails}
              isLoadingProviders={isLoadingProviders}
            />
          ) : (
            <PaymentMethodsTable
              items={paymentMethods}
              isLoading={isLoading}
              onEditPaymentMethod={onEditPaymentMethod}
            />
          ))}
        {type === "promotions" && (
          <PromotionsTable
            items={promotions}
            isLoading={isLoading}
            onEditPromotion={onEditPromotion}
            onArchive={onArchive}
          />
        )}
        {type === "game-profiles" && (
          <GameProfilesTable items={gameProfiles} isLoading={isLoading} onEditGameProfile={onEditGameProfile} />
        )}
        {type === "risks" && <RisksTable items={risks} isLoading={isLoading} onEditRisk={onEditRisk} />}
      </Box>
      <Box position="fixed" right="12px" bottom="12px" zIndex={2}>
        {type === "games" && (
          <Fab color="primary" onClick={onAddGame}>
            <AddIcon />
          </Fab>
        )}
        {type === "bonuses" && (
          <Fab color="primary" onClick={() => onAddBonus(brandId)}>
            <AddIcon />
          </Fab>
        )}
        {type === "promotions" && (
          <Fab color="primary" onClick={() => onAddPromotion(brandId)}>
            <AddIcon />
          </Fab>
        )}
        {type === "game-profiles" && (
          <Fab color="primary" onClick={() => onAddGameProfile(brandId)}>
            <AddIcon />
          </Fab>
        )}
        {type === "risks" && (
          <Fab color="primary" onClick={() => onAddRisk()}>
            <AddIcon />
          </Fab>
        )}
      </Box>
    </Box>
  );
};
