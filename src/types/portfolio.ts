export interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  isFavorite: boolean;
}

export interface Instrument {
  symbol: string;
  name: string;
  instrumentClass: string;
  country: string | null;
}

export interface Holding {
  id: number;
  instrument: Instrument;
  quantity: number;
  avgCost: number;
  realizedPnl: number;
}

export interface PortfolioDetail {
  id: number;
  name: string;
  description: string | null;
  holdings: Holding[];
  realizedPnl: number;
}
