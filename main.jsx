import { render } from 'preact'
import 'preact/devtools';
import { useState, useMemo, useEffect, useRef } from 'preact/hooks';
import mitt from 'mitt';
import { createClient, defaultExchanges, Provider } from '@urql/preact';
import './index.css'
import App from './src/App';
import AccessTokenContext from './src/AccessTokenContext';

const atEmitter = mitt();
let currentAccessToken = window.sessionStorage.getItem('prelease:access-token');
window.handleToken = (token) => {
  // use a ref since this is called async and setAccessToken is/might be stale...
  atEmitter.emit('change', token);
  window.sessionStorage.setItem('prelease:access-token', token);
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
  const loggedIn = useMemo(() => !!accessToken, [accessToken]);
  const loginWindowRef = useRef();
  useEffect(() => {
    function handle(at) {
      if (loginWindowRef.current) { 
        loginWindowRef.current.close()
        loginWindowRef.current = null
      }
    }
    atEmitter.on('change', handle);
    return () => { atEmitter.off('change', handle); }
  }, [])

  useEffect(() => {
    if (!accessToken && !loginWindowRef.current) {
      return openLoginWindow()
    }
  }, [accessToken])

  useEffect(() => {
    function onAtChange(at) {
      setAccessToken(at);
      // setSilentLoginView(buildLoginView(at))
    }

    atEmitter.on('change', onAtChange);

    return () => {
      atEmitter.off('change', onAtChange)
    }
  }, [setAccessToken])

  function openLoginWindow() {
    if (!loginWindowRef.current) {
      loginWindowRef.current = window.open(
        '/.netlify/functions/auth',
        "_blank",
        "height=400,width=400,menubar=no,scrollbars=no,status=no,titlebar=no,toolbar=no",
      );
      if (loginWindowRef.current) {
        function onWindowClose() {
          loginWindowRef.current = null
        }
        loginWindowRef.current.addEventListener('close', onWindowClose)

        // keep a reference to the window even if loginWindowRef.current is wiped
        const win = loginWindowRef.current;
        return () => { win.removeEventListener('close', onWindowClose) }
      }
    }
  }

  return {
    loggedIn,
    // silentLoginView,
    accessToken,
    openLoginWindow,
    loginWindowRef,
  };
}

function Main(props) {
  const { loggedIn, accessToken, loginWindowRef, openLoginWindow } = useGithubAuth();
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
      {client ? (
        <AccessTokenContext.Provider value={accessToken} >
          <Provider value={client} >
            <App />
          </Provider>
        </AccessTokenContext.Provider>
      ) : (
        loginWindowRef.current ? (
          <p class="text-center mx-auto my-8">Signing you in with GitHub...</p>
        ) : (
          <button class="mx-auto block my-8 bg-white text-indigo-800 rounded px-4 py-2" onClick={openLoginWindow} >Sign in</button>
        )
      )}
    </>
  )
}

render(<Main />, document.getElementById('app'))
