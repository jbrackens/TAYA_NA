export enum MobileMenuTypes {
  TOGGLE = "mobile-menu/toggle"
}

export type MobileMenuAction = {
  type: MobileMenuTypes.TOGGLE;
};

export type MobileMenuState = boolean;

export interface MobileMenuContent {
  id: string;
  Icon: React.FC;
  locale: string;
  href?: string;
  as?: string;
  onClick?: () => void;
}
