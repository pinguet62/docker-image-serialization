import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import fs from 'fs'
import path from 'path'

const tempFolder = `${process.env['RUNNER_TEMP']}/docker-image-serialization`
const artifactName = 'docker-images'

const artifactClient = artifact.create()

function recursiveReaddirSync(dir: string): string[] {
  const files: string[] = []
  for (const file of fs.readdirSync(dir, {withFileTypes: true}))
    if (file.isDirectory()) {
      files.push(...recursiveReaddirSync(path.join(dir, file.name)))
    } else {
      files.push(path.join(dir, file.name))
    }
  return files
}

async function runSerialize(dockerImageFilterReference: string): Promise<void> {
  const images = await exec.getExecOutput(
    `docker image ls --format "{{.Repository}}:{{.Tag}}" --filter=reference=${dockerImageFilterReference}`
  )
  for (const image of images.stdout.trimEnd().split('\n')) {
    // intermediate folders
    const folder = `${tempFolder}/${image.split(':')[0]}`
    await io.mkdirP(folder)

    const file = `${tempFolder}/${image.replace(':', '/')}.tar`

    await exec.exec(`docker save --output ${file} ${image}`)

    await artifactClient.uploadArtifact(artifactName, [file], tempFolder)
  }
}

async function runDeserialize(): Promise<void> {
  await artifactClient.downloadArtifact(artifactName, tempFolder)

  for (const file of recursiveReaddirSync(tempFolder)) {
    await exec.exec(`docker load --input ${file}`)
  }
}

async function run(): Promise<void> {
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
