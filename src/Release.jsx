import { useQuery, useClient } from '@urql/preact';
import { Suspense } from 'preact/compat';
import { useState, useEffect, useRef, useMemo, useContext, useReducer } from 'preact/hooks';
import { valid as semverValid, clean as semverClean, inc as semverInc, prerelease as semverPrerelease } from 'es-semver';
import AccessTokenContext from './AccessTokenContext';
import Logo from './Logo';
import MarkdownPreview from './MarkdownPreview';

export default function RepoBranch({ login, repo, branch }) {
    const [result] = useQuery({
        query: `
        query Q($login: String!, $repo: String!, $qualifiedRefName: String!, $expression: String!) {
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
        }`,
        variables: { login, repo, qualifiedRefName: `refs/heads/${branch}`, expression: `${branch}:package.json` }
    })

    const pkgJson = useMemo(() => result.data && result.data.repository.pkgJson && result.data.repository.pkgJson.text && JSON.parse(result.data.repository.pkgJson.text), [result])
    
    if (result.error) {
        console.log(result.error);
        return (
            <div>
                error
            </div>
        )
    }

    return (
        <div class="flex flex-col items-center">
            <h2 class="my-4 text-center text-2xl">
                <a href={`/org/${login}/repo/${repo}`} >←</a>
                {' '}
                Creating a release for
                {' '}
                <span class="underline">{login}</span> 
                {' / '}
                <span class="underline">{repo}</span> 
                {' '}
                based on
                {' '}
                <span class="underline">{branch}</span> 
            </h2>
            <p class="text-center max-w-md mb-8">
                Currently the package.json has the version
                {' '}
                <span class="font-medium">{pkgJson ? pkgJson.version : '...'}</span> 
                {' '}
            </p>

            <ReleaseForm login={login} repo={repo} branch={branch} latestCommit={result.data && result.data.repository.branch.target} pkgJson={pkgJson} />
        </div>
    );
}

function ReleaseForm({ login, repo, branch, pkgJson, latestCommit }) {
    const [releaseTitle, setReleaseTitle] = useState('');
    const cleanedTag = pkgJson && semverClean(pkgJson.version)
    const tagHasPreRelease = useMemo(() => semverPrerelease(cleanedTag) != null, [cleanedTag]);
    

    // TODO: make version and releaseType a reducer!
    const [version, setVersion] = useState('');
    const [releaseType, setReleaseType] = useState(null);
    
    const validSemver = useMemo(() => semverValid(version) != null, [version])

    const onChangeReleaseType = (e) => {
        const type = e.target.value;
        console.log('change to', type);

        if (type !== 'custom') {
            setVersion(semverInc(cleanedTag, type))
        } else if (version === '') {
            setVersion(cleanedTag)
        }
        setReleaseType(type)
    }

    const [currentTagResult] = useQuery({
        query: `
        query Q($login: String!, $repo: String!, $qName: String!, $qNameWithV: String!) {
            repository(
                owner: $login
                name: $repo
            ) {
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
        }`,
        pause: !pkgJson,
        variables: pkgJson && { login, repo, qName: `refs/tags/${pkgJson.version}`, qNameWithV: `refs/tags/v${pkgJson.version}` }
    })

    const foundTagWithAndWithoutV = useMemo(() => Boolean(currentTagResult.data && currentTagResult.data.repository.tag && currentTagResult.data.repository.tagWithV), [currentTagResult])
    const currentTag = currentTagResult.data && (currentTagResult.data.repository.tag || currentTagResult.data.repository.tagWithV);
    const [changelog] = useChangelog({ repo, from: currentTag && `refs/tags/${currentTag.name}`, to: `refs/heads/${branch}` })

    if (currentTagResult.error) {
        console.log(currentTagResult.error);
        return (
            <p>Failed to fetch tag v{pkgJson.version} or {pkgJson.version}</p>
        )
    }

    if (pkgJson && !currentTagResult.fetching && !currentTag) {
        return (
            <p>We could not find no tag named v{pkgJson.version} nor {pkgJson.version}, that's no good!</p>
        )
    }

    if (pkgJson && foundTagWithAndWithoutV) {
        return (
            <p>We found the tag v{pkgJson.version} and {pkgJson.version}, that's no good!</p>
        )
    }

    if (changelog.error) {
        return (
            <div>Error!</div>
        )
    }

    let loadingText = null;

    if (!pkgJson) {
        loadingText = 'Fetching package.json...'
    } else if (currentTagResult.fetching) {
        loadingText = `Fetching the git tag for ${pkgJson.version}...`
    } else if (changelog.paused) {
        // should not really happen but one never knows...
        loadingText = 'Aligning stars...'
    } else if (changelog.fetching) {
        loadingText = `Fetching commits and their PRs since ${currentTag.name}...`;
    }

    if (loadingText) {
        return (
            <div class="flex flex-col items-center">
                <Logo width={128} height={128} inverted />
                <p class="mt-4">{loadingText}</p>
            </div>
        )
    }

    if (changelog.diff.commits.length === 0) {
        return (
            <p><span class="text-lg" >🎉</span> Hurray! Nothing to release!</p>
        )
    }

    return (
        <>
            <div class="mb-4">{changelog.diff.commits.length} Commits since {pkgJson.version}</div>
            {latestCommit && <div class="mb-4">The latest commit is <span class="italic">{latestCommit.messageHeadline}</span></div>}
            <style type="text/css" >{`
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
                class={`rounded bg-white text-gray-800 px-4 py-2 mb-4 w-full max-w-2xl border-b-2 ${releaseTitle !== '' ? 'border-green-600' : 'border-red-600'}`}
                type="text"
                placeholder="Release title"
                value={releaseTitle}
                onInput={(e) => { setReleaseTitle(e.target.value); }}
            />
            <ChangelogEditor repo={repo} pullRequests={changelog.pullRequests} />
            <p class="mb-2 mt-6">What sort of release shall this be?</p>
            <div class="flex w-full max-w-md ">
                {['major', 'minor', 'patch', ...(tagHasPreRelease ? ['prerelease'] : []), 'custom'].map((type, index, allTypes) => (
                    <Fragment key={type} >
                        <input onChange={onChangeReleaseType} id={`release-${type}`} class="absolute opacity-0 w-0 h-0 release-radio" type="radio" name="release" value={type} />
                        <label
                            htmlFor={`release-${type}`}
                            class={`text-center flex-1 bg-white text-indigo-800 font-medium text-sm px-4 py-2 border-gray-200 border-l ${
                                index === 0 ? 'rounded-l' : ''} ${
                                    index === allTypes.length - 1 ? 'rounded-r' : ''} ${
                                        type === releaseType ? 'bg-indigo-200 border-l-indigo-200' : ''} ${
                                            type === allTypes[index - 1] ? 'border-l-indigo-200' : ''
                            }`}
                        >{type}</label>
                    </Fragment>
                ))}
            </div>
            <div class="h-12 flex items-center mt-4" >
                {
                    releaseType && (
                        releaseType === 'custom'
                        ? <div>
                                <input
                                    value={version}
                                    onInput={(e) => { setVersion(e.target.value) }}
                                    required
                                    type="text"
                                    class={`rounded px-4 py-2 text-gray-800 border-b-2 ${validSemver ? 'border-green-600' : 'border-red-600'}`}
                                />

                                <span class="block h-4 text-sm" >
                                    {!validSemver && 'Please provide a valid semver'}
                                </span>
                            </div>
                    : <span class={`rounded px-4 py-2 text-white`}>{version}</span>
                    )
                }
            </div>

            <button class={`bg-white shadow rounded px-4 py-2 my-4 ${version === '' || !validSemver || releaseTitle === '' ? 'text-gray-400' : 'text-indigo-800 '}`} disabled={version === '' || !validSemver || releaseTitle === ''}>Release it!</button>
        </>
    )
}

const markdownFallback = (
    <div class="flex-1 text-gray-600 markdown-body p-4 flex justify-center items-center self-center" >
        <Logo width={64} height={64} />
    </div>
)
function ChangelogEditor({ repo, pullRequests }) {
    const initialContent = useMemo(() => {
        let content = '';

        pullRequests.forEach((pr) => {
            content += `- ${pr.title} (#${pr.number}, thanks @${pr.author.login})\n`
        })

        return content;
    }, [pullRequests])
    const [content, setContent] = useState(initialContent)

    return (
        <div class="flex items-stretch w-full max-w-5xl bg-white rounded-md p-4" >
            <textarea style={{ minHeight: '24rem' }} class="flex-1 bg-transparent p-4 text-gray-900 mr-4 border-r font-mono text-sm leading-relaxed" value={content} onInput={(e) => setContent(e.target.value)} />
            <Suspense fallback={markdownFallback}>
                <MarkdownPreview class="flex-1 text-gray-600 markdown-body p-4" repo={repo} markdown={content} />
            </Suspense>
        </div>
    )
}

function useChangelogReducerFn(state, { type, error, pullRequests, diff }) {
    switch (type) {
        case 'start':
            return { fetching: true }
        case 'success':
            return { fetching: false, pullRequests, diff }
        case 'error':
            return { fetching: false, error }
        case 'abort':
            return { fetching: false }
        default:
            throw new Error(`Invalid action in useChangelogReducerFn ${type}`);
    }
}
const useChangelogReducerInitialState = { paused: true, fetching: false };

function useChangelog({ repo, from, to }) {
    const client = useClient()
    const at = useContext(AccessTokenContext);
    const [state, dispatch] = useReducer(useChangelogReducerFn, useChangelogReducerInitialState);
    const dispatchRef = useRef(null);
    dispatchRef.current = dispatch;

    useEffect(() => {
        let abort = false;

        if (!from) {
            return;
        }

        (async () => {
            dispatchRef.current({ type: 'start' })

            // dispatchRef.current({ type: 'success', "pullRequests":[{"id":"MDExOlB1bGxSZXF1ZXN0NDA2Mjk4NDM1","number":2486,"title":"Reduce unnecessary DOM attribute reads","author":{"login":"andrewiggins","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA2MzM4NTE0","number":2489,"title":"Add update benchmark from js-framework-benchmark","author":{"login":"andrewiggins","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA2Mzg5MDY3","number":2491,"title":"Remove unnecessary excessDomChildren creation","author":{"login":"andrewiggins","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA2NjA4MzQx","number":2493,"title":"Fix creating multiple roots from useEffect","author":{"login":"JoviDeCroock","__typename":"User"},"__typename":"PullRequest"},{"id":"MDExOlB1bGxSZXF1ZXN0NDA1OTM5MjQx","number":2483,"title":"Remove processingException check","author":{"login":"JoviDeCroock","__typename":"User"},"__typename":"PullRequest"}]})

            try {
                const foundPrs = new Map();

                const res = await fetch(`https://api.github.com/repos/preactjs/${repo}/compare/${from}...${to}`, {
                    headers: {
                        Authorization: `Bearer ${at}`
                    }
                })

                if (abort) { return }

                if (!res.ok) {
                    dispatchRef.current({ type: 'error', error: `GitHub compare API returned status ${res.status}` })
                    return
                }

                const diff = await res.json();

                if (abort) { return }

                if (diff.commits.length === 0) {
                    dispatchRef.current({ type: 'success', pullRequests: [], diff });
                    return;
                }

                const commitQueries = diff.commits.map((commit, index) => `
                commit${index}: object(oid: "${commit.sha}") {
                    id
                    __typename
                    ... on Commit {
                        associatedPullRequests(first: 100) {
                            nodes {
                                id
                                number
                                title
                                author {
                                    login
                                }
                            }
                        }
                    }
                }
                `).join('')
                const assocPrResult = await client.query(
                    `query Q($repo: String!) {
                        repository(
                            owner: "preactjs"
                            name: $repo
                        ) {
                            ${commitQueries}
                        }
                    }`,
                    { repo }
                ).toPromise()

                if (abort) { return }

                if (assocPrResult.error) {
                    dispatchRef.current({ type: 'error', error: `Error while getting associated PRs of commit ${commit.sha} ${assocPrResult.error}` })
                    return
                }

                Object.keys(assocPrResult.data.repository).forEach((key) => {
                    if (key.startsWith('commit')) {
                        const commit = assocPrResult.data.repository[key];
                        commit.associatedPullRequests.nodes.forEach((pr) => {
                            foundPrs.set(pr.number, pr);
                        })
                    }
                })

                // dispatchRef.current({ type: 'progress', progress: { total: diff.commits.length, completed: ++completed } })

                // TODO: get rid of this
                // if (completed >= 10) break;

                dispatchRef.current({ type: 'success', pullRequests: Array.from(foundPrs.values()), diff });
            } catch (e) {
                console.log(e);
                dispatchRef.current({ type: 'error', error: e })
            }
        })()

        return () => {
            dispatchRef.current({ type: 'abort' })
            abort = true;
        }
    }, [repo, from, to])

    return [state];
}
