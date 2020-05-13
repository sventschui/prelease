import { Router } from "preact-router";
import OrganizationSelection from './OrganizationSelection';
import RepositorySelection from './RepositorySelection';
import BranchSelection from './BranchSelection';
import Release from './Release';

export default function App() {
    return (
        <Router>
            <OrganizationSelection path="/" />
            <RepositorySelection path="/org/:login" />
            <BranchSelection path="/org/:login/repo/:repo" />
            <Release path="/org/:login/repo/:repo/branch" />
        </Router>
    )
}
