import { GraphQLError } from 'graphql';
import { PortfolioService } from '@services/portfolio-services';
import { ApiError } from '@config/api-error';
import { ApolloContext } from '@graphql/context';

export const Query = {
  portfolios: async (_: unknown, __: unknown, context: ApolloContext) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
      });
    }

    try {
      return await PortfolioService.getPortfoliosByUserId(context.user.userId);
    } catch (err) {
      if (err instanceof ApiError) {
        throw new GraphQLError(err.message, {
          extensions: { code: err.code, httpCode: err.httpCode },
        });
      }

      throw err;
    }
  },

  portfolioDetail: async (_: unknown, args: { id: number }, context: ApolloContext) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
      });
    }

    try {
      return await PortfolioService.getPortfolioDetail(args.id, context.user.userId);
    } catch (err) {
      if (err instanceof ApiError) {
        throw new GraphQLError(err.message, {
          extensions: { code: err.code, httpCode: err.httpCode },
        });
      }
      throw err;
    }
  },
};
