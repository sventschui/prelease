import { render } from 'preact'
import 'preact/devtools';
import { useState, useMemo, useEffect } from 'preact/hooks';
import mitt from 'mitt';
import { createClient, defaultExchanges, Provider } from '@urql/preact';
import './index.css'
import App from './src/App';
import AccessTokenContext from './src/AccessTokenContext';

const atEmitter = mitt();
let currentAccessToken = window.sessionStorage.getItem('prelease:access-token');
let loginWindow = null;
window.handleToken = (token) => {
  // use a ref since this is called async and setAccessToken is/might be stale...
  atEmitter.emit('change', token);
  window.sessionStorage.setItem('prelease:access-token', token);
  loginWindow.close();
  loginWindow = null;
}

// TODO: find a way for a silent login...
/*
const debug = true;
const frameStyle = debug ? {
  height: '100px',
  width: '100px',
} : { height: '0', width: '0' };
function buildSilentLoginView(atOrNull) {
  if (atOrNull) {
    return null;
  }

  function onLoad() {
    console.log('frame onLoad');
  }

  return (
    <iframe style={frameStyle} onLoad={onLoad} src="/.netlify/functions/auth" />
  )
}
*/

function useGithubAuth() {
  const [accessToken, setAccessToken] = useState(currentAccessToken);
  // const [silentLoginView, setSilentLoginView] = useState(buildSilentLoginView(accessToken));
  const loggedIn = useMemo(() => !!accessToken, [accessToken]);
  useEffect(() => {
    function onAtChange(at) {
      setAccessToken(at);
      // setSilentLoginView(buildLoginView(at))
    }

    atEmitter.on('change', onAtChange);

    return () => {
      atEmitter.off('change', onAtChange)
    }
  })
  if (!accessToken && !loginWindow) {
    loginWindow = window.open(
      'https://github.com/login/oauth/authorize?client_id=bef8f01982247883d379&redirect_url=http://localhost:8080/.netlify/functions/auth&scope=read:org,repo',
      "_blank",
      "height=400,width=400,menubar=no,scrollbars=no,status=no,titlebar=no,toolbar=no",
    );
  }

  return {
    loggedIn,
    // silentLoginView,
    accessToken,
  };
}

function Main(props) {
  const { loggedIn, accessToken } = useGithubAuth();
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
    <>
      <h1 class="text-5xl text-center">prelease!</h1>
      <p class="text-sm text-center">please release, preact release, painless release, prelease! 🤣</p>
      {client && (
        <AccessTokenContext.Provider value={accessToken} >
          <Provider value={client} >
            <App />
          </Provider>
        </AccessTokenContext.Provider>
      )}
    </>
  )
}

render(<Main />, document.getElementById('app'))
