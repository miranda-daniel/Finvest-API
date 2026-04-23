export const typeDefs = `#graphql
  # TODO: remove - temporary type for testing purposes only
  type User {
    id: Int!
    email: String!
    firstName: String!
    lastName: String!
    isActive: Boolean!
    createdAt: String!
  }

  type Portfolio {
    id: Int!
    name: String!
    description: String
    createdAt: String!
    isFavorite: Boolean!
  }

  type Query {
    hello: String
    # TODO: remove - temporary query for testing purposes only
    users: [User!]!
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
