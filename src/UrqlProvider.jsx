import { useMemo, useContext } from 'preact/hooks';
import { createClient, defaultExchanges, Provider } from '@urql/preact';
import AccessTokenContext from './AccessTokenContext';

export default function UrqlProvider({ children }) {
    const accessToken = useContext(AccessTokenContext);
    const client = useMemo(() => {
        if (!accessToken) {
          return null;
        }
    
        return createClient({
          url: 'https://api.github.com/graphql',
          exchanges: defaultExchanges,
          fetchOptions: (...args) => {
            return { headers: { Authorization: `Bearer ${accessToken}` }};
          }
        });
      }, [accessToken])

      return (
          <Provider value={client} >
              {children}
          </Provider>
      )
}