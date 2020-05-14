import { useClient } from "@urql/preact";
import { useEffect, useRef, useContext, useReducer } from "preact/hooks";
import AccessTokenContext from "./AccessTokenContext";
import gql from "graphql-tag";

function useChangelogReducerFn(state, { type, error, pullRequests, diff }) {
  switch (type) {
    case "start":
      return { fetching: true };
    case "success":
      return { fetching: false, pullRequests, diff };
    case "error":
      return { fetching: false, error };
    case "abort":
      return { fetching: false };
    default:
      throw new Error(`Invalid action in useChangelogReducerFn ${type}`);
  }
}
const useChangelogReducerInitialState = { paused: true, fetching: false };

export default function useChangelog({ login, repo, from, to }) {
  const client = useClient();
  const at = useContext(AccessTokenContext);
  const [state, dispatch] = useReducer(
    useChangelogReducerFn,
    useChangelogReducerInitialState
  );
  const dispatchRef = useRef(null);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let abort = false;

    if (!from) {
      return;
    }

    (async () => {
      dispatchRef.current({ type: "start" });

      // dispatchRef.current({ type: 'success', "pullRequests":[{"id":"MDExOlB1bGxSZXF1ZXN0NDA2Mjk4NDM1","number":2486,"title":"Reduce unnecessary DOM attribute reads","author":{"login":"andrewiggins","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA2MzM4NTE0","number":2489,"title":"Add update benchmark from js-framework-benchmark","author":{"login":"andrewiggins","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA2Mzg5MDY3","number":2491,"title":"Remove unnecessary excessDomChildren creation","author":{"login":"andrewiggins","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA2NjA4MzQx","number":2493,"title":"Fix creating multiple roots from useEffect","author":{"login":"JoviDeCroock","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA1OTM5MjQx","number":2483,"title":"Remove processingException check","author":{"login":"JoviDeCroock","__typename":"User"},"__typename":"PullRequest"}]})

      try {
        const foundPrs = new Map();

        const res = await fetch(
          `https://api.github.com/repos/${login}/${repo}/compare/${from}...${to}`,
          {
            headers: {
              Authorization: `Bearer ${at}`,
            },
          }
        );

        if (abort) {
          return;
        }

        if (!res.ok) {
          dispatchRef.current({
            type: "error",
            error: `GitHub compare API returned status ${res.status}`,
          });
          return;
        }

        const diff = await res.json();

        if (abort) {
          return;
        }

        if (diff.commits.length === 0) {
          dispatchRef.current({ type: "success", pullRequests: [], diff });
          return;
        }

        // since we strip out the graphql parser to save on bundle size we must not pass queries
        // as strings to urql, thus we assemble a GQL AST here dynamically
        const gqlQuery = gql`
          query($login: String!, $repo: String!) {
            repository(owner: $login, name: $repo) {
              id
            }
          }
        `;

        const selectionSet =
          gqlQuery.definitions[0].selectionSet.selections[0].selectionSet;
        selectionSet.selections = selectionSet.selections.concat(
          diff.commits.map((commit, index) => ({
            kind: "Field",
            alias: {
              kind: "Name",
              value: `commit${index}`,
            },
            name: {
              kind: "Name",
              value: "object",
            },
            arguments: [
              {
                kind: "Argument",
                name: {
                  kind: "Name",
                  value: "oid",
                },
                value: {
                  kind: "StringValue",
                  value: commit.sha,
                  block: false,
                },
              },
            ],
            directives: [],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: {
                    kind: "Name",
                    value: "id",
                  },
                  arguments: [],
                  directives: [],
                },
                {
                  kind: "Field",
                  name: {
                    kind: "Name",
                    value: "__typename",
                  },
                  arguments: [],
                  directives: [],
                },
                {
                  kind: "InlineFragment",
                  typeCondition: {
                    kind: "NamedType",
                    name: {
                      kind: "Name",
                      value: "Commit",
                    },
                  },
                  directives: [],
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: {
                          kind: "Name",
                          value: "associatedPullRequests",
                        },
                        arguments: [
                          {
                            kind: "Argument",
                            name: {
                              kind: "Name",
                              value: "first",
                            },
                            value: {
                              kind: "IntValue",
                              value: "100",
                            },
                          },
                        ],
                        directives: [],
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: {
                                kind: "Name",
                                value: "nodes",
                              },
                              arguments: [],
                              directives: [],
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: {
                                      kind: "Name",
                                      value: "id",
                                    },
                                    arguments: [],
                                    directives: [],
                                  },
                                  {
                                    kind: "Field",
                                    name: {
                                      kind: "Name",
                                      value: "number",
                                    },
                                    arguments: [],
                                    directives: [],
                                  },
                                  {
                                    kind: "Field",
                                    name: {
                                      kind: "Name",
                                      value: "title",
                                    },
                                    arguments: [],
                                    directives: [],
                                  },
                                  {
                                    kind: "Field",
                                    name: {
                                      kind: "Name",
                                      value: "author",
                                    },
                                    arguments: [],
                                    directives: [],
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [
                                        {
                                          kind: "Field",
                                          name: {
                                            kind: "Name",
                                            value: "login",
                                          },
                                          arguments: [],
                                          directives: [],
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          }))
        );

        const assocPrResult = await client
          .query(gqlQuery, { login, repo })
          .toPromise();

        if (abort) {
          return;
        }

        if (assocPrResult.error) {
          dispatchRef.current({
            type: "error",
            error: `Error while getting associated PRs of commit ${commit.sha} ${assocPrResult.error}`,
          });
          return;
        }

        Object.keys(assocPrResult.data.repository).forEach((key) => {
          if (key.startsWith("commit")) {
            const commit = assocPrResult.data.repository[key];
            commit.associatedPullRequests.nodes.forEach((pr) => {
              foundPrs.set(pr.number, pr);
            });
          }
        });

        // dispatchRef.current({ type: 'progress', progress: { total: diff.commits.length, completed: ++completed } })

        // TODO: get rid of this
        // if (completed >= 10) break;

        dispatchRef.current({
          type: "success",
          pullRequests: Array.from(foundPrs.values()),
          diff,
        });
      } catch (e) {
        console.log(e);
        dispatchRef.current({ type: "error", error: e });
      }
    })();

    return () => {
      dispatchRef.current({ type: "abort" });
      abort = true;
    };
  }, [repo, from, to]);

  return [state];
}
