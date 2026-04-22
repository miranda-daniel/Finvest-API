import { GraphQLError } from 'graphql';
import { PortfolioService } from '@services/portfolio-services';
import { ApolloContext } from '@graphql/apolloServer';

export const Mutation = {
  createPortfolio: (
    _: unknown,
    args: { name: string; isFavorite?: boolean },
    context: ApolloContext,
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return PortfolioService.createPortfolio(context.user.userId, args.name, args.isFavorite);
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
    return PortfolioService.setFavoritePortfolio(context.user.userId, args.portfolioId ?? null);
  },
};
