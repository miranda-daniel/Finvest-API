import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { typeDefs } from './schema/schema';
import { Query, Mutation } from './resolvers';
import { isProduction } from '@config/environments';
import { ENV_VARIABLES } from '@config/config';
import { TokenPayload } from '@typing/session';

export interface ApolloContext {
  user: TokenPayload | null;
}

export const createApolloServer = () => {
  return new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers: {
      Query,
      Mutation,
    },
    // Apollo Server 4 shows Apollo Sandbox in dev by default; disables it in production
    introspection: !isProduction(),
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
        extensions: { code: 'TOKEN_EXPIRED' },
      });
    }
    throw new GraphQLError('Invalid token', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
};
