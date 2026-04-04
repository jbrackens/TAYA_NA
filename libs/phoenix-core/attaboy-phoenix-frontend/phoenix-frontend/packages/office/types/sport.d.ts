export type TournamnetType = {
  id: string;
  name: string;
  numberOfFixtures: number;
};

export type SportType = {
  id: string;
  name: string;
  abbreviation: string;
  displayToPunters: boolean;
  tournaments: Array<TournamnetType>;
};
