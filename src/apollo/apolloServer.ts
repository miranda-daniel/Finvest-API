import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { typeDefs } from './schema/schema';
import { Query, Mutation } from './resolvers';
import { isProduction } from '@config/environments';
import { ENV_VARIABLES } from '@config/config';
import { TokenPayload } from '@typing/session';
import { ApolloContext } from './context';

export type { ApolloContext } from './context';

export const createApolloServer = () => {
  return new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers: {
      Query,
      Mutation,
    },
    introspection: !isProduction(),
    plugins: [
      isProduction()
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageLocalDefault(),
    ],
  });
};

export const buildApolloContext = async ({ req }: { req: Request }): Promise<ApolloContext> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return { user: null };
  }

  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = jwt.verify(token, ENV_VARIABLES.jwtSignature) as TokenPayload;

    return { user };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new GraphQLError('Token expired', {
        extensions: { code: 'TOKEN_EXPIRED', httpCode: 401 },
      });
    }
    throw new GraphQLError('Invalid token', {
      extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
    });
  }
};
