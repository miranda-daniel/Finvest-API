import { GraphQLError } from 'graphql';
import { PortfolioService } from '@services/portfolio-services';
import { ApiError } from '@config/api-error';
import { ApolloContext } from '@graphql/context';

export const Mutation = {
  createPortfolio: (
    _: unknown,
    args: { name: string; description?: string; isFavorite?: boolean },
    context: ApolloContext,
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return PortfolioService.createPortfolio(
      context.user.userId,
      args.name,
      args.description,
      args.isFavorite,
    );
  },

  setFavoritePortfolio: (
    _: unknown,
    args: { portfolioId?: number | null },
    context: ApolloContext,
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      return await PortfolioService.setFavoritePortfolio(
        context.user.userId,
        args.portfolioId ?? null,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        throw new GraphQLError(err.message, {
          extensions: { code: 'NOT_FOUND', httpCode: err.httpCode },
        });
      }
      throw err;
    }
  },
};
