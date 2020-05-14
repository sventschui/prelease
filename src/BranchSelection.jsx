import { useQuery } from '@urql/preact';
import { useState } from 'preact/hooks';

export default function Repo({ login, repo }) {
    const [query, setQuery] = useState('');
    const [result] = useQuery({
        query: `
        query Q($login: String!, $repo: String!, $query: String) {
            repository(
                owner: $login
                name: $repo
            ) {
                id
                name
                description
                defaultBranchRef {
                    prefix
                    name
                }
                branches: refs(refPrefix: "refs/heads/", query: $query, first: 7, orderBy: { field: ALPHABETICAL, direction: ASC}) {
                    edges {
                        node {
                            __typename
                            id
                            name
                            target {
                                id
                                oid
                                ... on Tag {
                                    name
                                    message
                                }
                            }
                        }
                    }
                }
            }
        }`,
        variables: { login, repo, query }
    })

    if (result.error) {
        console.log(result.error);
        return (
            <div>
                error
            </div>
        )
    }

    // TODO: show default branch as first branch when not searching

    return (
        <div class="flex flex-col items-center">
            <h2 class="my-4 text-center text-2xl">
                <a href={`/org/${login}`} >←</a>
                {' '}
                Creating a release for
                {' '}
                <span class="underline">{login}</span> 
                {' / '}
                <span class="underline">{repo}</span> 
                {' '}
            </h2>
            <p className="mb-2 text-center max-w-md">Select a branch to create the release from</p>
            {/*<button class="my-4 bg-white text-indigo-800 font-medium rounded px-4 py-2 shadow" >Release it!</button>*/}
            <input type="search" placeholder="Filter branches" class="text-gray-800 rounded py-2 px-4" value={query} onInput={(e) => { setQuery(e.target.value) }} />
            <ul class="mx-auto my-4 w-full max-w-xs flex flex-col list-none items-center">
                {!result.fetching && result.data
                    ? <>
                    {query === '' && (
                        <Fragment key="__default">
                            <li key="__default" class="w-full h-16">
                                <a href={`/org/${login}/repo/${repo}/branch?branch=${result.data.repository.defaultBranchRef.name}`} class={`flex items-center h-full hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer bg-white text-gray-700 py-4 px-8 border-b border-gray-300 rounded`}>
                                    <span class="block font-medium">
                                        {result.data.repository.defaultBranchRef.name}
                                        {' '}
                                        <span class="text-gray-500 font-light" >(default)</span>
                                    </span>
                                </a>
                            </li>
                            <div class="h-4" />
                        </Fragment>
                    )}
                    {result.data.repository.branches.edges.map(({ node: branch }, index, { length }) => (
                        <li key={branch.id} class="w-full h-16">
                            <a href={`/org/${login}/repo/${repo}/branch?branch=${branch.name}`} class={`flex items-center h-full hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer bg-white text-gray-700 py-4 px-8 border-b border-gray-300 ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`}>
                                <span class="block font-medium">
                                    {branch.name}
                                    {branch.name === result.data.repository.defaultBranchRef.name && (
                                        <>
                                        {' '}
                                        <span class="text-gray-500 font-light" >(default)</span>
                                        </>
                                    )}
                                </span>
                            </a>
                        </li>
                    ))}</>
                : <>
                    {query === '' && (
                        <Fragment key="__default">
                            <li key="__default" class="w-full h-16">
                                <span class={`flex items-center h-full bg-white text-gray-700 py-4 px-8 border-b border-gray-300 rounded`}>
                                    <span class="inline-block bg-gray-200 h-4" style={{ width: `80px`}} />
                                </span>
                            </li>
                            <div class="h-4" />
                        </Fragment>
                    )}
                    {[1, 2, 3, 4, 5].map((i, index, { length }) => (
                        <li key={i} class="w-full h-16">
                            <span class={`flex items-center h-full bg-white text-gray-700 py-4 px-8 border-b border-gray-300 ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`}>
                                <span class="inline-block bg-gray-200 h-4" style={{ width: `${60 + (i%3*20) + i*5}px`}} />
                            </span>
                        </li>
                    ))}
                    </>
                }
            </ul>
        </div>
    );
    
}