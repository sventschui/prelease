import { useQuery, useClient } from '@urql/preact';
import { useState } from 'preact/hooks';

function stripEmojies(str) {
    return str && str.replace(/:[a-z0-9_]+:/g, '');
}

export default function RepoList({ login }) {
    const [query, setQuery] = useState('');
    const [result] = useQuery({
        query: `
        query RepositorySearch($query: String!) {
            repositories: search(type: REPOSITORY, query: $query, first: 15) {
                edges {
                    node {
                        ... on Repository {
                            id
                            name
                            description
                            descriptionHTML
                        }
                    }
                }
            }
        }`,
        variables: { query: `${query} user:${login}` },
    })
    const [pinnedReposResult] = useQuery({
        query: `
        query PinnedRepositories($login: String!) {
            repositoryOwner(login: $login) {
                ... on User {
                    pinnedItems(types: [REPOSITORY], first: 10) {
                        edges {
                            node {
                                ... on Repository {
                                    id
                                    name
                                    description
                                    descriptionHTML
                                    owner {
                                        login
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }`,
        variables: { login },
    })

    if (result.error || pinnedReposResult.error) {
        console.log(result.error || pinnedReposResult.error);
        return (
            <div>
                error
            </div>
        )
    }

    return ( 
        <>
            <h2 class="my-4 text-center text-2xl">
                <a href={`/`} >←</a>
                {' '}
                Create a release
            </h2>
            <input type="search" placeholder="Filter repositories" class="block mx-auto text-gray-800 rounded py-2 px-4" value={query} onInput={(e) => { setQuery(e.target.value) }} />
            {!result.fetching && !pinnedReposResult.fetching && result.data && pinnedReposResult.data
                ? (
                    <>
                        {query === '' && pinnedReposResult.data.repositoryOwner.pinnedItems && 
                            <ul class="mx-auto px-2 my-4 w-24 w-full max-w-lg flex flex-col list-none items-center">
                            {pinnedReposResult.data.repositoryOwner.pinnedItems.edges
                                .filter(({ node: repo }) => repo.owner.login === login)
                                .map(({ node: repo }, index, { length }) => (
                                    <li key={repo.id} class="w-full">
                                        <a href={`/org/${login}/repo/${repo.name}`} class={`flex justify-center flex-col h-full hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer bg-white text-gray-700 py-4 px-8 border-b border-gray-300 ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`}>
                                            <span class="block font-medium mb-2">
                                                {repo.name}
                                            </span>
                                            <span class="block font-ligh text-sm">
                                                {stripEmojies(repo.description)}
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        }
                        <ul class="mx-auto px-2 my-4 w-24 w-full max-w-lg flex flex-col list-none items-center">
                            {result.data.repositories.edges.map(({ node: repo }, index, { length }) => (
                                <li key={repo.id} class="w-full">
                                    <a href={`/org/${login}/repo/${repo.name}`} class={`flex justify-center flex-col h-full hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer bg-white text-gray-700 py-4 px-8 border-b border-gray-300 ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`}>
                                        <span class="block font-medium mb-2">
                                            {repo.name}
                                        </span>
                                        <span class="block font-ligh text-sm">
                                            {stripEmojies(repo.description)}
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </>
                )
                : (
                    <ul class="mx-auto px-2 my-4 w-24 w-full max-w-lg flex flex-col list-none items-center">
                        {[1, 2, 3, 4, 5].map((i, index, { length }) => (
                            <li key={i} class="w-full">
                                <span class={`flex flex-col justify-center h-full bg-white text-gray-700 py-4 px-8 border-b border-gray-300 ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`}>
                                    <span class="inline-block bg-gray-200 h-5 mb-3" style={{ width: `${40 + (i%3*20) + i*5}px`}} />
                                    <span class="inline-block bg-gray-200 h-3 mb-2" style={{ width: `${120 + (i%3*20) + i*5}px`}} />
                                    {i%3 && i%5 ? <span class="inline-block bg-gray-200 h-3" style={{ width: `${100 + (i%3*20) + i*5}px`}} /> : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
        </>
    );
    
}