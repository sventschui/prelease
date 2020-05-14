import { useQuery } from "@urql/preact";
import {
  useState,
  useMemo,
  useEffect,
  useContext,
  useReducer,
  useRef,
} from "preact/hooks";
import {
  valid as semverValid,
  clean as semverClean,
  inc as semverInc,
  prerelease as semverPrerelease,
} from "es-semver";
import Logo from "./Logo";
import gql from "graphql-tag";
import useChangelog from "./useChangelog";
import ChangelogEditor from "./ChangelogEditor";
import AccessTokenContext from "./AccessTokenContext";

export default function ReleaseForm({
  login,
  repo,
  branch,
  pkgJson,
  latestCommit,
}) {
  const [releaseTitle, setReleaseTitle] = useState("");
  const cleanedTag = pkgJson && semverClean(pkgJson.version);
  const tagHasPreRelease = useMemo(() => semverPrerelease(cleanedTag) != null, [
    cleanedTag,
  ]);

  // TODO: make version and releaseType a reducer!
  const [version, setVersion] = useState("");
  const [releaseType, setReleaseType] = useState(null);

  const validSemver = useMemo(() => semverValid(version) != null, [version]);

  const onChangeReleaseType = (e) => {
    const type = e.target.value;

    if (type !== "custom") {
      setVersion(semverInc(cleanedTag, type));
    } else if (version === "") {
      setVersion(cleanedTag);
    }
    setReleaseType(type);
  };

  const [currentTagResult] = useQuery({
    query: gql`
      query Q(
        $login: String!
        $repo: String!
        $qName: String!
        $qNameWithV: String!
      ) {
        repository(owner: $login, name: $repo) {
          id
          tag: ref(qualifiedName: $qName) {
            id
            name
            target {
              id
              oid
            }
          }
          tagWithV: ref(qualifiedName: $qNameWithV) {
            id
            name
            target {
              id
              oid
            }
          }
        }
      }
    `,
    pause: !pkgJson,
    variables: pkgJson && {
      login,
      repo,
      qName: `refs/tags/${pkgJson.version}`,
      qNameWithV: `refs/tags/v${pkgJson.version}`,
    },
  });

  const foundTagWithAndWithoutV = useMemo(
    () =>
      Boolean(
        currentTagResult.data &&
          currentTagResult.data.repository.tag &&
          currentTagResult.data.repository.tagWithV
      ),
    [currentTagResult]
  );
  const currentTag =
    currentTagResult.data &&
    (currentTagResult.data.repository.tag ||
      currentTagResult.data.repository.tagWithV);
  const [changelog] = useChangelog({
    login,
    repo,
    from: currentTag && `refs/tags/${currentTag.name}`,
    to: `refs/heads/${branch}`,
  });

  const [content, setContent] = useState(null);
  useEffect(() => {
    let content = "";

    changelog.pullRequests &&
      changelog.pullRequests.forEach((pr) => {
        content += `- ${pr.title} (#${pr.number}, thanks @${pr.author.login})\n`;
      });

    setContent(content);
  }, [changelog, setContent]);

  const accessToken = useContext(AccessTokenContext);
  const [releaseItState, releaseItDispatch] = useReducer(
    (state, { type, error }) => {
      switch (type) {
        case "start":
          return { loading: true, error: null, success: false };
        case "success":
          return { loading: false, error: null, success: true };
        case "error":
          return { loading: false, error, success: false };
        default:
          throw new Error("Unknwon action type " + type);
      }
    },
    {
      loading: false,
      error: null,
      success: false,
    }
  );
  const releaseItDispatchRef = useRef(null);
  releaseItDispatchRef.current = releaseItDispatch;
  async function releaseIt(e) {
    e.preventDefault();

    releaseItDispatchRef.current({ type: "start" });

    try {
      const res = await fetch(
        `https://api.github.com/repos/${login}/${repo}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            event_type: "prelease",
            client_payload: {
              latest_commit_sha: latestCommit.oid,
              branch,
              version,
              title: releaseTitle,
              changelog: content,
            },
          }),
        }
      );

      if (!res.ok) {
        releaseItDispatchRef.current({
          type: "error",
          error: `Repository dispatch returned status ${res.status}`,
        });
        return;
      }

      releaseItDispatchRef.current({ type: "success" });
    } catch (error) {
      releaseItDispatchRef.current({ type: "error", error });
    }
  }

  if (currentTagResult.error) {
    console.log(currentTagResult.error);
    return (
      <p>
        Failed to fetch tag v{pkgJson.version} or {pkgJson.version}
      </p>
    );
  }

  if (pkgJson && !currentTagResult.fetching && !currentTag) {
    return (
      <p>
        We could not find no tag named v{pkgJson.version} nor {pkgJson.version},
        that's no good!
      </p>
    );
  }

  if (pkgJson && foundTagWithAndWithoutV) {
    return (
      <p>
        We found the tag v{pkgJson.version} and {pkgJson.version}, that's no
        good!
      </p>
    );
  }

  if (changelog.error) {
    return <div>Error!</div>;
  }

  let loadingText = null;

  if (!pkgJson) {
    loadingText = "Fetching package.json...";
  } else if (currentTagResult.fetching) {
    loadingText = `Fetching the git tag for ${pkgJson.version}...`;
  } else if (changelog.paused) {
    // should not really happen but one never knows...
    loadingText = "Aligning stars...";
  } else if (changelog.fetching) {
    loadingText = `Fetching commits and their PRs since ${currentTag.name}...`;
  }

  if (loadingText) {
    return (
      <div class="flex flex-col items-center">
        <Logo width={128} height={128} inverted />
        <p class="mt-4">{loadingText}</p>
      </div>
    );
  }

  if (changelog.diff.commits.length === 0) {
    return (
      <p>
        <span class="text-lg">🎉</span> Hurray! Nothing to release!
      </p>
    );
  }

  return (
    <>
      <div class="mb-4">
        {changelog.diff.commits.length} Commits since {pkgJson.version}
      </div>
      {latestCommit && (
        <div class="mb-4">
          The latest commit is{" "}
          <span class="italic">{latestCommit.messageHeadline}</span>
        </div>
      )}
      <style type="text/css">{`
                  input[type=radio].release-radio:focus + label {
                      outline-width: 2px;
                      outline-style: solid;
                      outline-color: Highlight;
                  }
                  @media (-webkit-min-device-pixel-ratio:0) {
                      input[type=radio].release-radio:focus + label {
                          outline-color: -webkit-focus-ring-color;
                          outline-style: auto;
                      }
                  }
              `}</style>
      <input
        class={`rounded bg-white text-gray-800 px-4 py-2 mb-4 w-full max-w-2xl border-b-2 ${
          releaseTitle !== "" ? "border-green-600" : "border-red-600"
        }`}
        type="text"
        placeholder="Release title"
        value={releaseTitle}
        onInput={(e) => {
          setReleaseTitle(e.target.value);
        }}
      />
      <ChangelogEditor
        login={login}
        repo={repo}
        content={content}
        onContentChange={setContent}
      />
      <p class="mb-2 mt-6">What sort of release shall this be?</p>
      <div class="flex w-full max-w-md ">
        {[
          "major",
          "minor",
          "patch",
          ...(tagHasPreRelease ? ["prerelease"] : []),
          "custom",
        ].map((type, index, allTypes) => (
          <Fragment key={type}>
            <input
              onChange={onChangeReleaseType}
              id={`release-${type}`}
              class="absolute opacity-0 w-0 h-0 release-radio"
              type="radio"
              name="release"
              value={type}
            />
            <label
              htmlFor={`release-${type}`}
              class={`text-center flex-1 bg-white text-indigo-800 font-medium text-sm px-4 py-2 border-gray-200 border-l ${
                index === 0 ? "rounded-l" : ""
              } ${index === allTypes.length - 1 ? "rounded-r" : ""} ${
                type === releaseType ? "bg-indigo-200 border-l-indigo-200" : ""
              } ${type === allTypes[index - 1] ? "border-l-indigo-200" : ""}`}
            >
              {type}
            </label>
          </Fragment>
        ))}
      </div>
      <div class="h-12 flex items-center mt-4">
        {releaseType &&
          (releaseType === "custom" ? (
            <div>
              <input
                value={version}
                onInput={(e) => {
                  setVersion(e.target.value);
                }}
                required
                type="text"
                class={`rounded px-4 py-2 text-gray-800 border-b-2 ${
                  validSemver ? "border-green-600" : "border-red-600"
                }`}
              />

              <span class="block h-4 text-sm">
                {!validSemver && "Please provide a valid semver"}
              </span>
            </div>
          ) : (
            <span class={`rounded px-4 py-2 text-white`}>{version}</span>
          ))}
      </div>

      <button
        class={`bg-white shadow rounded px-4 py-2 my-4 ${
          releaseItState.loading ||
          version === "" ||
          !validSemver ||
          releaseTitle === ""
            ? "text-gray-400"
            : "text-indigo-800 "
        }`}
        disabled={
          releaseItState.loading ||
          version === "" ||
          !validSemver ||
          releaseTitle === ""
        }
        onClick={releaseIt}
      >
        {releaseItState.loading ? "Releasing..." : "Release it!"}
      </button>
      {releaseItState.error && (
        <p>
          Something bad happened!{" "}
          {releaseItState.error.stack || releaseItState.error}
        </p>
      )}
    </>
  );
}
