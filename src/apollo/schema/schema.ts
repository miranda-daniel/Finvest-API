export const typeDefs = `#graphql
  type Portfolio {
    id: Int!
    name: String!
    description: String
    createdAt: String!
    isFavorite: Boolean!
  }

  type Instrument {
    symbol: String!
    name: String!
    instrumentClass: String!
    country: String
  }

  type Holding {
    id: Int!
    instrument: Instrument!
    quantity: Float!
    avgCost: Float!
    realizedPnl: Float!
  }

  type PortfolioDetail {
    id: Int!
    name: String!
    description: String
    holdings: [Holding!]!
    realizedPnl: Float!
  }

  enum OperationSide {
    BUY
    SELL
  }

  enum PortfolioRange {
    ONE_MONTH
    THREE_MONTHS
    YEAR_TO_DATE
    ONE_YEAR
    ALL
  }

  type PortfolioPerformancePoint {
    date: String!
    portfolioValue: Float!
    portfolioReturnPct: Float!
    spxReturnPct: Float!
    ndxReturnPct: Float!
  }

  type Query {
    # Returns the portfolios owned by the authenticated user.
    portfolios: [Portfolio!]!
    # Returns detail (holdings) for a single portfolio owned by the authenticated user.
    portfolioDetail(id: Int!): PortfolioDetail
    # Returns daily portfolio value and % returns vs SPX and NDX for the given range.
    portfolioPerformance(portfolioId: Int!, range: PortfolioRange!): [PortfolioPerformancePoint!]!
  }

  type Mutation {
    # Creates a new portfolio. If isFavorite is true, replaces any existing favorite.
    createPortfolio(name: String!, description: String, isFavorite: Boolean): Portfolio!
    # Sets the favorite portfolio for the authenticated user. Pass null to unset.
    setFavoritePortfolio(portfolioId: Int): Portfolio
    # Records a BUY or SELL transaction and returns the updated Holding.
    addTransaction(
      portfolioId: Int!
      side: OperationSide!
      symbol: String!
      name: String!
      instrumentClass: String!
      exchange: String
      country: String
      date: String!
      price: Float!
      quantity: Float!
    ): Holding!
  }
`;
