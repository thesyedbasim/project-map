# Project Map

A lightweight TypeScript/Node.js package that reads your project structure and creates a text file representation. This is particularly useful for providing context to Large Language Models (LLMs) about your project structure.

## Features

- Maps your entire project directory structure
- Customizable exclusion patterns (e.g., node_modules, .git)
- Optional file content inclusion (with size limits)
- Configurable depth for directory traversal
- Supports hidden files/directories
- CLI and programmatic API

## Installation

```bash
npm install project-map
```

Or globally:

```bash
npm install -g project-map
```

## Usage

### CLI Usage

```bash
# Basic usage (current directory to project-map.txt)
project-map

# Specify directories and output file
project-map --rootDir ./my-project --output ./project-structure.txt

# Include file contents (up to 50KB per file)
project-map --includeContent --contentSizeLimit 50

# Limit directory depth
project-map --maxDepth 3

# Custom exclusions
project-map --exclude node_modules,.git,dist,build

# Show hidden files and directories
project-map --showHidden
```

### Programmatic Usage

```typescript
import { generateProjectMap } from 'project-map';

async function main() {
  await generateProjectMap({
    rootDir: './my-project',
    outputPath: './project-structure.txt',
    exclude: ['node_modules', '.git', 'dist'],
    includeContent: true,
    maxDepth: 3,
    showHidden: false,
    contentSizeLimit: 100 // limit file content to 100KB
  });
}

main();
```

## Options

| Option | CLI Flag | Description | Default |
|--------|----------|-------------|---------|
| rootDir | --rootDir, -r | Root directory to start from | Current directory |
| outputPath | --output, -o | Output file path | ./project-map.txt |
| exclude | --exclude, -e | Patterns to exclude | node_modules,.git,dist,build,coverage |
| includeContent | --includeContent, -c | Include file contents | false |
| maxDepth | --maxDepth, -d | Maximum directory depth | Infinity |
| showHidden | --showHidden, -h | Show hidden files and directories | false |
| contentSizeLimit | --contentSizeLimit, -s | Maximum file size in KB to include content | 100 |

## Output Format

The output is a text file with a tree-like structure:

```
project-name
├─ package.json (2KB)
├─ README.md (3KB)
├─ src
│  ├─ index.ts (1KB)
│  └─ utils
│     └─ helpers.ts (1KB)
└─ tests
   └─ index.test.ts (1KB)
```

When `includeContent` is enabled, file contents will be included:

```
project-name
├─ package.json (2KB)
│     ----------------------------------------
│     {
│       "name": "my-project",
│       "version": "1.0.0",
│       ...
│     }
│     ----------------------------------------
├─ src
│  └─ index.ts (1KB)
│     ----------------------------------------
│     import * as fs from 'fs';
│     
│     export function hello() {
│       return 'world';
│     }
│     ----------------------------------------
```

## License

MIT
