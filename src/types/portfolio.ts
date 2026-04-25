export interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  isFavorite: boolean;
}

export interface InstrumentDTO {
  symbol: string;
  name: string;
  instrumentClass: string;
}

export interface HoldingDTO {
  id: number;
  instrument: InstrumentDTO;
  quantity: number;
  avgCost: number;
}

export interface PortfolioDetailDTO {
  id: number;
  name: string;
  description: string | null;
  holdings: HoldingDTO[];
}
