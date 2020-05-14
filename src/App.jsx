import { Component } from 'preact';
import { Router } from "preact-router";
import { Suspense, lazy } from 'preact/compat';
import Logo from './Logo';

const OrganizationSelection = lazy(() => import('./OrganizationSelection'));
const RepositorySelection = lazy(() => import('./RepositorySelection'));
const BranchSelection = lazy(() => import('./BranchSelection'));
const Release = lazy(() => import('./Release'));
const UrqlProvider = lazy(() => import('./UrqlProvider'));

const fallback = (
    <div class="flex flex-col items-center mt-16">
        <Logo width={128} height={128} inverted />
    </div>
);

export default class App extends Component {
    constructor() {
        super()
        this.state = { error: null };
    }

    componentDidCatch(error) {
        console.log('error', error);
        this.setState({ error })
    }

    render(props, state) {
        if (state.error) {
            return (
                <div class="w-full mx-auto max-w-xl">
                    <h1 class="text-xl font-medium mt-4 mb-4 text-center">Error :(</h1>
                    <pre class="p-4 bg-white rounded text-gray-800 overflow-scroll">{state.error.stack ? state.error.stack : JSON.stringify(state.error, null, 2)}</pre>
                </div>
            )
        }

        return (
            <Suspense fallback={fallback}>
                <UrqlProvider>
                    <Router>
                        <OrganizationSelection path="/" />
                        <RepositorySelection path="/org/:login" />
                        <BranchSelection path="/org/:login/repo/:repo" />
                        <Release path="/org/:login/repo/:repo/branch" />
                    </Router>
                </UrqlProvider>
            </Suspense>
        )
    }
}
