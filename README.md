# Docker image serialization

GitHub Action to share *Docker images* between *jobs*.

## Requirement

GitHub Action jobs are executed in individual (see `runs-on`)

## Inputs

### `serialize`

List of **pattern** used to define which Docker image to serialize, and use on next jobs.

:information_source: The value is using by [`docker image ls --filter=reference=` option](https://docs.docker.com/engine/reference/commandline/images/#filter-images-by-reference) option.

Type: `string[]`.  
Default `[]` (no image to serialize).

Examples:
* `"backend"`: all images with name `backend`
* `"my-orga/*"`: all images of my organisation
* `"*:dev"`: all images with `dev` version

### `restore`

Flag to **enable deserialization**.

Type: `boolean`.  
Default `false` (not triggerred).

## Usage

Example:

```yaml
  build:
    runs-on: ubuntu-latest
    steps:
      - run: docker build --tag app:latest .
      - uses: pinguet62/docker-image-serialization@master
        with:
          serialize: app:latest
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: pinguet62/docker-image-serialization@master
        with:
          restore: true
      - run: docker push app:latest
```
