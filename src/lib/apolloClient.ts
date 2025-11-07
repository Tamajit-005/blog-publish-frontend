import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const STRAPI_GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_STRAPI_GRAPHQL_URL || "http://localhost:1337/graphql";

export const client = new ApolloClient({
  link: new HttpLink({
    uri: STRAPI_GRAPHQL_ENDPOINT,
  }),
  cache: new InMemoryCache(),
});
