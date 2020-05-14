import { useQuery } from '@urql/preact';

export default function Commits({ name, qualifiedRefName }) {
    const [result] = useQuery({
        query: `
        query Q($name: String!, $qualifiedRefName: String!) {
            repository(
                owner: "preactjs"
                name: $name
            ) {
                ref(qualifiedName: $qualifiedRefName) {
                    target {
                        ... on Commit {
                            history(first: 20) {
                                edges {
                                    node {
                                        id
                                        oid
                                        abbreviatedOid
                                        commitUrl
                                        message
                                        messageHeadline
                                        messageBody
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }`,
        variables: { name, qualifiedRefName }
    })

    if (result.fetching) {
        return (
            <div>
                loading...
            </div>
        )
    }

    if (result.error) {
        console.log(result.error);
        return (
            <div>
                error
            </div>
        )
    }

    if (result.data.repository.ref.target.__typename !== 'Commit') {
        return (
            <div>Got {result.data.repository.ref.target.__typename} but expected Commit!</div>
        )
    }

    return (
        <ul class="mx-auto px-2 my-4 w-24 w-full max-w-xl flex flex-col list-none items-center">
            {result.data.repository.ref.target.history.edges.map(({ node: commit }, index, { length }) => (
                <li class={`list-none block w-full bg-white text-gray-800 p-4 border-b border-gray-300 text-sm ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`} >
                    {commit.messageHeadline }
                </li>
            ))}
        </ul>
    );
    
}