import { TokenPayload } from '@typing/session';

export interface ApolloContext {
  user: TokenPayload | null;
}
