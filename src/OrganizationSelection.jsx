import { useQuery, useClient } from '@urql/preact';
import { useMemo } from 'preact/hooks';

function stripEmojies(str) {
    return str && str.replace(/:[a-z0-9_]+:/g, '');
}

export default function OrganizationSelection() {
    const [result] = useQuery({
        query: `
        {
            viewer {
                id
                login
                avatarUrl
                organizations(first: 100) {
                    nodes {
                        id
                        login
                        avatarUrl
                    }
                }
            }
        }`,
    })

    if (result.error) {
        console.log(result.error);
        return (
            <div>
                error
            </div>
        )
    }

    const items = useMemo(() => result.data && [result.data.viewer].concat(result.data.viewer.organizations.nodes), [result]);

    return ( 
        <>
            <h2 class="my-4 text-center text-2xl">
                Create a release
            </h2>
            <ul class="mx-auto px-2 my-4 w-24 w-full max-w-lg flex flex-col list-none items-center">
                {!result.fetching && items
                    ? items.map((owner, index, { length }) => (
                        <li key={owner.id} class="w-full">
                            <a href={`/org/${owner.login}`} class={`flex h-full items-center hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer bg-white text-gray-700 py-4 px-8 border-b border-gray-300 ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`}>
                                <img class="w-8 h-8 rounded-md mr-4" src={owner.avatarUrl} />
                                <span class="block font-medium flex-1">
                                    {owner.login}
                                </span>
                            </a>
                        </li>
                        ))
                    : [1, 2].map((i, index, { length }) => (
                        <li key={i} class="w-full">
                            <span class={`flex items-center h-full bg-white text-gray-700 py-4 px-8 border-b border-gray-300 ${index === 0 ? 'rounded-t' : ''} ${index === length - 1 ? 'rounded-b' : ''}`}>
                                <span class="block w-8 h-8 bg-gray-200 mr-4 rounded-md" />
                                <span class="block bg-gray-200 h-4" style={{ width: `${120 + (i%3*20) + i*5}px`}} />
                            </span>
                        </li>
                    ))}
            </ul>
            {items && (
                <p class="w-full max-w-md text-center mx-auto text-sm">Not seeing your organization? Grant/request access to the desired org for the prelease app <a href="https://github.com/settings/connections/applications/bef8f01982247883d379" class="underline" >here</a>.</p>
            )}
        </>
    );
    
}