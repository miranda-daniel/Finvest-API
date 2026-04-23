import { GraphQLError } from 'graphql';
import { UserService } from '@services/user-services';
import { PortfolioService } from '@services/portfolio-services';
import { ApolloContext } from '@graphql/context';

// GraphQL resolvers — the entry point for all Query operations.
//
// Key difference from REST:
//   REST:    HTTP request → Express Router → Controller → Service → Repository
//   GraphQL: HTTP request → Apollo Server → Resolver (here) → Service → Repository
//
// There is no router or controller in the GraphQL path. Apollo Server parses the
// incoming operation (e.g. "query GetPortfolios { portfolios { ... } }"), matches the
// field name to the resolver function below, and calls it automatically.
//
// The resolver's only job is to call the service and return the result.
// No request parsing, no response shaping — Apollo handles both.
export const Query = {
  // TODO: remove - temporary resolver for testing purposes only
  users: () => UserService.getAllUsersService(),

  portfolios: (_: unknown, __: unknown, context: ApolloContext) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return PortfolioService.getPortfoliosByUserId(context.user.userId);
  },
};
