import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { provideApollo } from 'apollo-angular';
import { environment } from '../../../environments/environment';

export function createApolloClientOptions(): ApolloClient.Options {
  return {
    link: new HttpLink({ uri: environment.graphqlUri }),
    cache: new InMemoryCache(),
  };
}

export function provideGraphQL() {
  return provideApollo(createApolloClientOptions);
}
