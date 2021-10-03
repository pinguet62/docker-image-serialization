import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as glob from 'glob'
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

/** Rename "myRepo/myImage/myVersion.tar" to "myRepo/myImage:myVersion" */
async function renameArtifactToDocker(folder: string) {

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
    await io.mkdirP(imageFolder)

    const imageFile = `${artifactFolder}/${image}`
    await exec.exec(`docker save --output ${imageFile} ${image}`)

    await artifactClient.uploadArtifact(
      artifactName,
      [imageFile],
      artifactFolder
    )
  }
}

async function runDeserialize(artifactName: string, dockerImages: string[]): Promise<void> {
  if (dockerImages.length === 0) return;

  const artifactFolder = `${tempFolder}/${artifactName}`

  await artifactClient.downloadArtifact(artifactName, artifactFolder, {createArtifactFolder: true})
  await renameArtifactToDocker(artifactFolder)

  for (const dockerImage of dockerImages) {
    const files = glob.sync(dockerImage, {cwd: artifactFolder, nodir: true})
    core.info(`files ${files}`)
  }

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

    const dockerImages = core.getMultilineInput('restore')
    await runDeserialize(artifactName, dockerImages)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
