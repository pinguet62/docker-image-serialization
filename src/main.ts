import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as glob from '@actions/glob'
import fs from 'fs'
import path from 'path'

const tempFolder = `${process.env['RUNNER_TEMP']}/docker-image-serialization`

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

async function runSerialize(
  artifactName: string,
  dockerImageFilterReference: string
): Promise<void> {
  const images = await exec.getExecOutput(
    `docker image ls --format "{{.Repository}}:{{.Tag}}" --filter=reference=${dockerImageFilterReference}`
  )
  for (const image of images.stdout.trimEnd().split('\n')) {
    const artifactFolder = `${tempFolder}/${artifactName}`

    const imageFolder = `${artifactFolder}/${image.split(':')[0]}`
    const imageFile = `${artifactFolder}/${image.replace(':', '/')}.tar`

    await io.mkdirP(imageFolder)
    await exec.exec(`docker save --output ${imageFile} ${image}`)

    await artifactClient.uploadArtifact(
      artifactName,
      [imageFile],
      artifactFolder
    )
  }
}

async function runDeserialize(artifactName: string): Promise<void> {
  const artifactFolder = `${tempFolder}/${artifactName}`

  await io.mkdirP(artifactFolder)
  await artifactClient.downloadArtifact(artifactName, artifactFolder)

  for (const imageFile of recursiveReaddirSync(artifactFolder)) {
    await exec.exec(`docker load --input ${imageFile}`)
  }
}

async function run(): Promise<void> {
  const artifactName = core.getInput('artifact-name')
  try {
    const serialize = core.getMultilineInput('serialize')
    for (const dockerImageFilterReference of serialize)
      await runSerialize(artifactName, dockerImageFilterReference)

    const restore = core.getMultilineInput('restore')
    for (const dockerImage of restore)
      await runDeserialize(artifactName, dockerImage)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
