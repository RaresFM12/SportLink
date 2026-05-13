import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from "@as-integrations/express4";
import type { Application } from 'express';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import type { SessionUser } from '../services/authService.js';

export type GraphQLContext = {
  user?: SessionUser;
};

export async function applyGraphQLMiddleware(app: Application): Promise<void> {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => ({
        user: req.authUser ?? req.session?.user,
      }),
    })
  );
}
