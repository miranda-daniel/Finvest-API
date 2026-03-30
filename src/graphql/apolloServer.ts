import { ApolloServer } from '@apollo/server';
import { typeDefs } from './schema/schema';
import { Query } from './resolvers';
import { isProduction } from '@config/environments';

export interface ApolloContext {
  userInfo: { userId: number };
}

export const createApolloServer = () => {
  return new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers: {
      Query,
    },
    // Apollo Server 4 shows Apollo Sandbox in dev by default; disables it in production
    introspection: !isProduction(),
  });
};
