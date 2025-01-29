## Pipet

A simple tool to pipe any command's output to stdout with customization.

### Installation

```bash
npm install pipet
```

### Usage

```json
"scripts": {
  "format": "pipet --on-success 'echo \"There are no linter errors.\"' --on-error 'echo \"There are linter errors.\"' -- eslint .",
}
```

This command will pipe the output of the `eslint .` command to stdout and add a success or error message to the end of the command.

### Options

- `--on-success`: A message to display if the command succeeds.
- `--on-error`: A message to display if the command fails.

### Example
