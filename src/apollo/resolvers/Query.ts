import { GraphQLError } from 'graphql';
import { PortfolioService } from '@services/portfolio-services';
import { ApiError } from '@config/api-error';
import { ApolloContext } from '@graphql/context';

export const Query = {
  portfolios: async (_: unknown, __: unknown, context: ApolloContext) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      return await PortfolioService.getPortfoliosByUserId(context.user.userId);
    } catch (err) {
      if (err instanceof ApiError) {
        throw new GraphQLError(err.message, {
          extensions: { code: err.errorCode, httpCode: err.httpCode },
        });
      }

      throw err;
    }
  },
};
