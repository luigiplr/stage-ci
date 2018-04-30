const {format, parse} = require('url');

const INVALID_URI_CHARACTERS = /\//g;

exports.createAliasUrl = (repo, ref, sha) => {
  const repoStripped = repo.replace(/[^A-Z0-9]/ig, '-');
  const refStripped = ref.replace(INVALID_URI_CHARACTERS, '-');
  return `https://${repoStripped}-${refStripped}-${sha}.now.sh`;
};

exports.createCloneUrl = (cloneUrl, token) => {
  return format(Object.assign(
    parse(cloneUrl),
    {auth: token}
  ));
};
