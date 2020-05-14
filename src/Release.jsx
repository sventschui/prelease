import { useQuery } from "@urql/preact";
import { useMemo } from "preact/hooks";
import gql from "graphql-tag";
import ReleaseForm from "./ReleaseForm";

export default function Release({ login, repo, branch }) {
  const [result] = useQuery({
    query: gql`
      query Q(
        $login: String!
        $repo: String!
        $qualifiedRefName: String!
        $expression: String!
      ) {
        repository(owner: $login, name: $repo) {
          id
          name
          description
          defaultBranchRef {
            prefix
            name
          }
          branch: ref(qualifiedName: $qualifiedRefName) {
            id
            target {
              id
              oid
              ... on Commit {
                messageHeadline
              }
            }
          }
          pkgJson: object(expression: $expression) {
            ... on Blob {
              text
            }
          }
        }
      }
    `,
    variables: {
      login,
      repo,
      qualifiedRefName: `refs/heads/${branch}`,
      expression: `${branch}:package.json`,
    },
  });

  const pkgJson = useMemo(
    () =>
      result.data &&
      result.data.repository.pkgJson &&
      result.data.repository.pkgJson.text &&
      JSON.parse(result.data.repository.pkgJson.text),
    [result]
  );

  if (result.error) {
    console.log(result.error);
    return <div>error</div>;
  }

  return (
    <div class="flex flex-col items-center">
      <h2 class="my-4 text-center text-2xl">
        <a href={`/org/${login}/repo/${repo}`}>←</a> Creating a release for{" "}
        <span class="underline">{login}</span>
        {" / "}
        <span class="underline">{repo}</span> based on{" "}
        <span class="underline">{branch}</span>
      </h2>
      <p class="text-center max-w-md mb-8">
        Currently the package.json has the version{" "}
        <span class="font-medium">{pkgJson ? pkgJson.version : "..."}</span>{" "}
      </p>

      <ReleaseForm
        login={login}
        repo={repo}
        branch={branch}
        latestCommit={result.data && result.data.repository.branch.target}
        pkgJson={pkgJson}
      />
    </div>
  );
}
