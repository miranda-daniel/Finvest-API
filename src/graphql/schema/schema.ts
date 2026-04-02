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

  type Query {
    hello: String
    # TODO: remove - temporary query for testing purposes only
    users: [User!]!
  }
`;
