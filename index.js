const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const exec = require('@actions/exec')
const artifact = require('@actions/artifact')
const io = require('@actions/io')

const tempFolder = process.env['RUNNER_TEMP'] + '/docker-image-serialization'
const artifactName = 'docker-images'

const artifactClient = artifact.create()

function recursiveReaddirSync (dir) {
  const files = []
  for (const file of fs.readdirSync(dir, {withFileTypes: true}))
    if (file.isDirectory()) {
      files.push(...recursiveReaddirSync(path.join(dir, file.name)))
    } else {
      files.push(path.join(dir, file.name))
    }
  return files
}

async function runSerialize (dockerImageFilterReference) {
  const images = await exec.getExecOutput(`docker image ls --format "{{.Repository}}:{{.Tag}}" --filter=reference=${dockerImageFilterReference}`)
  for (const image of images.stdout.trimEnd().split('\n')) {
    // intermediate folders
    const folder = `${tempFolder}/${image.split(':')[0]}`
    await io.mkdirP(folder)

    const file = `${tempFolder}/${image.replace(':', '/')}.tar`

    console.log('Serializing Docker image ', image, 'to file', file)
    await exec.exec(`docker save --output ${file} ${image}`)

    console.log('Uploading to artifact', file)
    await artifactClient.uploadArtifact(artifactName, [file], tempFolder)
  }
}

async function runDeserialize () {
  const downloadResponse = await artifactClient.downloadArtifact(artifactName, tempFolder)
  console.log('Downloaded artifacts to', downloadResponse.downloadPath)

  for (const file of recursiveReaddirSync(tempFolder)) {
    console.log('Deserializing', file)
    await exec.exec(`docker load --input ${file}`)
  }
}

async function run () {
  try {
    const serialize = core.getMultilineInput('serialize')
    for (const dockerImageFilterReference of serialize)
      await runSerialize(dockerImageFilterReference)

    const restore = core.getBooleanInput('restore')
    if (restore) {
      await runDeserialize()
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
