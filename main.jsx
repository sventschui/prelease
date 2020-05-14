import { render } from "preact";
import "preact/devtools";
import { useState, useMemo, useEffect, useRef } from "preact/hooks";
import mitt from "mitt";
import "./index.css";
import App from "./src/App";
import AccessTokenContext from "./src/AccessTokenContext";

const atEmitter = mitt();
let currentAccessToken = window.sessionStorage.getItem("prelease:access-token");
window.handleToken = (token) => {
  // use a ref since this is called async and setAccessToken is/might be stale...
  atEmitter.emit("change", token);
  window.sessionStorage.setItem("prelease:access-token", token);
};
window.handleTokenError = (token) => {
  // use a ref since this is called async and setAccessToken is/might be stale...
  atEmitter.emit("error", token);
};

function useGithubAuth() {
  const [accessToken, setAccessToken] = useState(currentAccessToken);
  const [error, setError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const loggedIn = useMemo(() => !!accessToken, [accessToken]);
  const loginWindowRef = useRef();
  useEffect(() => {
    function handle() {
      setLoggingIn(false);
      if (loginWindowRef.current) {
        loginWindowRef.current.close();
        loginWindowRef.current = null;
      }
    }
    atEmitter.on("change", handle);
    return () => {
      atEmitter.off("change", handle);
    };
  }, []);

  useEffect(() => {
    atEmitter.on("change", setAccessToken);
    atEmitter.on("error", setError);

    return () => {
      atEmitter.off("change", setAccessToken);
      atEmitter.off("error", setError);
    };
  }, [setAccessToken]);

  function openLoginWindow() {
    if (!loginWindowRef.current) {
      loginWindowRef.current = window.open(
        "/.netlify/functions/auth",
        "_blank",
        "height=400,width=400,menubar=no,scrollbars=no,status=no,titlebar=no,toolbar=no"
      );
      if (loginWindowRef.current) {
        setLoggingIn(true);
        function onWindowClose() {
          setLoggingIn(false);
          loginWindowRef.current = null;
        }
        loginWindowRef.current.addEventListener("close", onWindowClose);

        // keep a reference to the window even if loginWindowRef.current is wiped
        const win = loginWindowRef.current;
        return () => {
          win.removeEventListener("close", onWindowClose);
        };
      }
    }
  }

  return {
    loggedIn,
    // silentLoginView,
    accessToken,
    openLoginWindow,
    loggingIn,
    error,
  };
}

function Main() {
  const { loggingIn, accessToken, openLoginWindow, error } = useGithubAuth();

  return (
    <>
      <h1 class="text-5xl text-center">prelease!</h1>
      <p class="text-sm text-center">
        please release, preact release, painless release, prelease! 🤣
      </p>
      {accessToken ? (
        <AccessTokenContext.Provider value={accessToken}>
          <App />
        </AccessTokenContext.Provider>
      ) : error ? (
        <p class="text-center mx-auto my-8">Login failed :(</p>
      ) : loggingIn ? (
        <p class="text-center mx-auto my-8">Signing you in with GitHub...</p>
      ) : (
        <button
          class="mx-auto block my-8 bg-white text-indigo-800 rounded px-4 py-2"
          onClick={openLoginWindow}
        >
          Sign in
        </button>
      )}
    </>
  );
}

render(<Main />, document.getElementById("app"));
