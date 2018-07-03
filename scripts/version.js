const pkginfo = require('npm-registry-package-info');
const semver = require('semver');
const fs = require('fs');


const moduleName = 'haystack-client';

const opts = {
    'packages': [
        moduleName
    ]
};

pkginfo(opts, (error, data) => {
    if (error) {
        throw error;
    }
    const currentVersion = data.data[moduleName]['dist-tags']['latest'];
    const releaseVersion = process.env.TRAVIS_TAG
    if (!releaseVersion) {
        throw new Error('No git tag commit is found, fail to release the "haystack-client" module');
    }
    if (semver.lte(releaseVersion, currentVersion)) {
        throw new Error(`Current haystack-client on npm registry has greater than or equal new release version ${releaseVersion}. Check your git tag version`);
    }
    const rawPackageJson = fs.readFileSync('package.json');
    const packageJson = JSON.parse(rawPackageJson);
    packageJson.version = releaseVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, ' '));
});
