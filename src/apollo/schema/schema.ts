export const typeDefs = `#graphql
  type Portfolio {
    id: Int!
    name: String!
    description: String
    createdAt: String!
    isFavorite: Boolean!
  }

  type Query {
    # Returns the portfolios owned by the authenticated user.
    # Requires a valid JWT in the Authorization header.
    portfolios: [Portfolio!]!
  }

  type Mutation {
    # Creates a new portfolio. If isFavorite is true, replaces any existing favorite.
    createPortfolio(name: String!, description: String, isFavorite: Boolean): Portfolio!
    # Sets the favorite portfolio for the authenticated user. Pass null to unset.
    setFavoritePortfolio(portfolioId: Int): Portfolio
  }
`;
