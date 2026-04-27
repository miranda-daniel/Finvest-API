import { GraphQLError } from 'graphql';
import { OperationType } from '@generated/prisma';
import { PortfolioService } from '@services/portfolio-services';
import { OperationService } from '@services/operation-service';
import { ApiError } from '@config/api-error';
import { ApolloContext } from '@graphql/context';

export const Mutation = {
  createPortfolio: async (
    _: unknown,
    args: { name: string; description?: string; isFavorite?: boolean },
    context: ApolloContext,
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
      });
    }

    try {
      return await PortfolioService.createPortfolio(
        context.user.userId,
        args.name,
        args.description,
        args.isFavorite,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        throw new GraphQLError(err.message, {
          extensions: { code: err.code, httpCode: err.httpCode },
        });
      }
      throw err;
    }
  },

  setFavoritePortfolio: async (
    _: unknown,
    args: { portfolioId?: number | null },
    context: ApolloContext,
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
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
          extensions: { code: err.code, httpCode: err.httpCode },
        });
      }
      throw err;
    }
  },

  addTransaction: async (
    _: unknown,
    args: {
      portfolioId: number;
      side: OperationType;
      symbol: string;
      name: string;
      instrumentClass: string;
      country?: string;
      date: string;
      price: number;
      quantity: number;
    },
    context: ApolloContext,
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
      });
    }

    try {
      return await OperationService.addTransaction({
        userId: context.user.userId,
        ...args,
      });
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
