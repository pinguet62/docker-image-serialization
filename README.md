# Docker image serialization

GitHub Action to serialize *Docker images* between *jobs*.

## Inputs

### `artifact-name`

Name of **artifact** to use.

Required: `false`.  
Type: `string`.  
Default `docker-images`.

:information_source: *Can be used to use distinct artifacts (ex: separate helpers and final application).*

### `serialize`

List of **pattern** used to define which Docker image to serialize (and then to use on next jobs).

Required: `false`.  
Type: `string[]`.  
Default `[]` (no image to serialize).

:information_source: *The value is using by [`docker image ls --filter=reference=` option](https://docs.docker.com/engine/reference/commandline/images/#filter-images-by-reference) option.*

Examples:
* `"backend"`: all images with name `backend`
* `"my-orga/*"`: all images of my organisation
* `"*:dev"`: all images with `dev` version

### `restore`

List of **pattern** used to define which Docker image to deserialize.

Required: `false`.  
Type: `string[]`.  
Default `[]` (not triggerred).

## Usage

Example:

```yaml
  build-back:
    runs-on: ubuntu-latest
    steps:
      - run: docker build --tag back:latest .
      - uses: pinguet62/docker-image-serialization@main
        with:
          serialize: back:latest
  build:
    runs-on: ubuntu-latest
    steps:
      - run: docker build --tag front:latest .
      - uses: pinguet62/docker-image-serialization@main
        with:
          serialize: front:latest
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: pinguet62/docker-image-serialization@main
        with:
          restore: '**/**'
      - run: docker push back:latest
      - run: docker push front:latest
```
