import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { db } from '@root/prisma/db';
import { typeDefs } from './schema';
import { Query } from './resolvers';
import { isProduction } from '@config/environments';

export const createApolloServer = () => {
  return new ApolloServer({
    typeDefs,
    resolvers: {
      Query,
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ({ req }) => {
      return {
        db,
        userInfo: { userId: 1 }, // TODO: harcoded
      };
    },
    // Avoid using Apollo playground on production
    introspection: !isProduction(),

    plugins: !isProduction()
      ? [ApolloServerPluginLandingPageGraphQLPlayground()]
      : [],
  });
};
