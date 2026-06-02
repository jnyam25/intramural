export interface PointsConfig {
  win: number;
  tie: number;
  loss: number;
  forfeit_loss: number;
  allows_ties: boolean;
}

export const DEFAULT_CONFIG: PointsConfig = {
  win: 3,
  tie: 1,
  loss: 0,
  forfeit_loss: -1,
  allows_ties: true,
};

export const BASKETBALL_CONFIG: PointsConfig = {
  win: 2,
  tie: 0,
  loss: 0,
  forfeit_loss: 0,
  allows_ties: false,
};
