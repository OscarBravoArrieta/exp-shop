import { inject } from '@angular/core';
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { provideApollo } from 'apollo-angular';
import { environment } from '../../../environments/environment';
import { LocalStorage } from '../services/local-storage';
import { AUTH_TOKEN_KEY } from '../services/auth';

/**
 * `HttpLink` de @apollo/client NO pasa por HttpClient de Angular, así que los
 * interceptores HTTP normales de Angular no le aplican — por eso el token se
 * inyecta acá, con un Apollo Link propio, no con un interceptor.
 */
export function createApolloClientOptions(): ApolloClient.Options {
  const localStorage = inject(LocalStorage);

  const httpLink = new HttpLink({ uri: environment.graphqlUri });

  const authLink = setContext((_operation, previousContext) => {
    const token = localStorage.getItem<string>(AUTH_TOKEN_KEY);

    return {
      headers: {
        ...previousContext['headers'],
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  return {
    link: ApolloLink.from([authLink, httpLink]),
    cache: new InMemoryCache(),
  };
}

export function provideGraphQL() {
  return provideApollo(createApolloClientOptions);
}
