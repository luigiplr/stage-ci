require('dotenv').config();

const path = require('path');
const bodyParser = require('body-parser');
const server = require('express')();
const Queue = require('promise-queue');
const {version} = require('../package.json');
const {stage, sync, github, gitlab, rm} = require('./core');
const log = require('./logger');

const PORT = process.env.PORT || 3000;
const DEPLOY_DIR = path.resolve('/tmp/.stage-ci');
const queue = new Queue(10, process.env.STAGE_CI_MAX_QUEUE || 100);

server.use(bodyParser.json());

server.get('/', (request, response) => {
  response.json({version, queue});
});

server.post('/', (request, response) => {
  let result;
  try {
    const {headers, body} = request;
    const keys = Object.keys(headers);
    if (keys.includes('x-github-event')) result = github({headers, body});
    if (keys.includes('x-gitlab-event')) result = gitlab({headers, body});
  } catch (error) {
    console.error(error);

    if (error.asJson && error.asJson.error && error.asJson.error.type === 'fatal') {
      response.status(500).send(error.asJson);
      return;
    }
  }

  const { success, ref, sha, name, cloneUrl, setStatus, deploy } = result;

  response.sendStatus((success) ? 200 : 204);

  if (!success) {
    queue.add(async () => {
      await rm(ref, true);
    })

    return;
  }

  queue.add(async () => {
    log.info(`> Deploying ${name}@${ref}#${sha}`);
    const localDirectory = path.join(DEPLOY_DIR, name);

    try {
      await rm(ref, false);

      await deploy();
      await setStatus('pending', 'Staging...');
      await sync(cloneUrl, localDirectory, { ref, checkout: sha });
      const url = await stage(localDirectory, { ref });
      await setStatus('success', 'Deployed to Now', url);
    } catch (error) {
      console.error(error);

      log.error(error.stack);
      if (error.response) {
        log.error(error.response.data.message);
        log.error(error.response.data.errors);
        log.error(error.response.data.documentation_url);
      }
      await setStatus('error', 'Error');
    }

    log.info('> Done!');
  });
});

server.listen(PORT, () => {
  log.info(`Server listening on ${PORT}... `);
});
