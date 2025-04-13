// project-map/src/index.ts

import * as fs from 'fs';
import * as path from 'path';

interface Options {
  rootDir: string;
  outputPath: string;
  exclude?: string[];
  includeContent?: boolean;
  maxDepth?: number;
  showHidden?: boolean;
  contentSizeLimit?: number; // in KB
}

interface FileNode {
  type: 'file' | 'directory';
  name: string;
  path: string;
  size?: number;
  children?: FileNode[];
  content?: string;
}

/**
 * Generates a map of the project structure and saves it to a text file.
 */
export async function generateProjectMap(options: Options): Promise<void> {
  const {
    rootDir,
    outputPath,
    exclude = ['node_modules', '.git', 'dist', 'build', 'coverage'],
    includeContent = false,
    maxDepth = Infinity,
    showHidden = false,
    contentSizeLimit = 100 // default 100KB
  } = options;

  // Normalize paths
  const normalizedRootDir = path.resolve(rootDir);
  const normalizedOutputPath = path.resolve(outputPath);

  // Check if root directory exists
  if (!fs.existsSync(normalizedRootDir)) {
    throw new Error(`Root directory does not exist: ${normalizedRootDir}`);
  }

  // Generate the file tree structure
  const rootNode = await buildFileTree(
    normalizedRootDir,
    normalizedRootDir,
    exclude,
    includeContent,
    maxDepth,
    showHidden,
    contentSizeLimit
  );

  // Generate text representation
  const projectMapText = formatFileTree(rootNode);

  // Write to file
  fs.writeFileSync(normalizedOutputPath, projectMapText, 'utf8');
  
  console.log(`Project map saved to: ${normalizedOutputPath}`);
}

/**
 * Recursively builds a file tree structure starting from the given directory.
 */
async function buildFileTree(
  basePath: string,
  currentPath: string,
  exclude: string[],
  includeContent: boolean,
  maxDepth: number,
  showHidden: boolean,
  contentSizeLimit: number,
  currentDepth = 0
): Promise<FileNode | null> {
  const relativePath = path.relative(basePath, currentPath);
  const name = path.basename(currentPath);
  
  // Skip if the path matches any exclude pattern
  if (exclude.some((pattern: string) => {
    if (pattern.includes('*')) {
      // Simple glob pattern support for * wildcard
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(name);
    }
    return name === pattern;
  })) {
    return null;
  }

  // Skip hidden files/folders if not explicitly shown
  if (!showHidden && name.startsWith('.')) {
    return null;
  }

  const stats = fs.statSync(currentPath);

  if (stats.isDirectory()) {
    // If we've reached the max depth, don't go deeper
    if (currentDepth >= maxDepth) {
      return {
        type: 'directory',
        name,
        path: relativePath || '.',
        children: []
      };
    }

    const dirNode: FileNode = {
      type: 'directory',
      name,
      path: relativePath || '.',
      children: []
    };

    const entries = fs.readdirSync(currentPath);
    const validChildren = await Promise.all(
      entries.map((entry: string) => {
        const entryPath = path.join(currentPath, entry);
        return buildFileTree(
          basePath,
          entryPath,
          exclude,
          includeContent,
          maxDepth,
          showHidden,
          contentSizeLimit,
          currentDepth + 1
        );
      })
    );

    // Filter out null values and cast to FileNode[]
    dirNode.children = validChildren.filter((node): node is FileNode => node !== null);
    
    return dirNode;
  } else if (stats.isFile()) {
    const fileNode: FileNode = {
      type: 'file',
      name,
      path: relativePath,
      size: Math.ceil(stats.size / 1024) // size in KB
    };

    if (includeContent && stats.size <= contentSizeLimit * 1024) {
      try {
        fileNode.content = fs.readFileSync(currentPath, 'utf8');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Could not read content of ${currentPath}: ${errorMessage}`);
      }
    }

    return fileNode;
  }

  return null;
}

/**
 * Formats the file tree into a text representation.
 */
function formatFileTree(node: FileNode | null, level = 0, isLast = true): string {
  if (!node) return '';

  const indent = level > 0 ? '│  '.repeat(level - 1) + (isLast ? '└─ ' : '├─ ') : '';
  let result = `${indent}${node.name}${node.type === 'file' ? ` (${node.size}KB)` : ''}\n`;

  if (node.content) {
    const contentLines = node.content.split('\n');
    const contentIndent = '│  '.repeat(level) + '   ';
    result += `${contentIndent}${'─'.repeat(40)}\n`;
    contentLines.forEach((line: string) => {
      result += `${contentIndent}${line}\n`;
    });
    result += `${contentIndent}${'─'.repeat(40)}\n`;
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach((child: FileNode, index: number) => {
      const childIsLast = index === node.children!.length - 1;
      result += formatFileTree(child, level + 1, childIsLast);
    });
  }

  return result;
}

/**
 * CLI interface for generating project map
 */
export function cli(): void {
  const args = process.argv.slice(2);
  
  // Default options
  const options: Options = {
    rootDir: '.',
    outputPath: './project-map.txt',
    exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
    includeContent: false,
    maxDepth: Infinity,
    showHidden: false,
    contentSizeLimit: 100
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--rootDir':
      case '-r':
        options.rootDir = args[++i] || options.rootDir;
        break;
      case '--output':
      case '-o':
        options.outputPath = args[++i] || options.outputPath;
        break;
      case '--exclude':
      case '-e':
        options.exclude = (args[++i] || '').split(',');
        break;
      case '--includeContent':
      case '-c':
        options.includeContent = true;
        break;
      case '--maxDepth':
      case '-d':
        const depthArg = args[++i];
        options.maxDepth = depthArg ? parseInt(depthArg, 10) : options.maxDepth;
        break;
      case '--showHidden':
      case '-h':
        options.showHidden = true;
        break;
      case '--contentSizeLimit':
      case '-s':
        const sizeArg = args[++i];
        options.contentSizeLimit = sizeArg ? parseInt(sizeArg, 10) : options.contentSizeLimit;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  // Generate project map
  generateProjectMap(options)
    .then(() => {
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}

function printHelp(): void {
  console.log(`
Project Map - Generate a text file with your project structure

Usage:
  project-map [options]

Options:
  --rootDir, -r           Root directory to start from (default: current directory)
  --output, -o            Output file path (default: ./project-map.txt)
  --exclude, -e           Comma-separated list of patterns to exclude (default: node_modules,.git,dist,build,coverage)
  --includeContent, -c    Include file contents in the output (default: false)
  --maxDepth, -d          Maximum directory depth to traverse (default: unlimited)
  --showHidden, -h        Show hidden files and directories (default: false)
  --contentSizeLimit, -s  Maximum file size in KB to include content (default: 100)
  --help                  Display this help message
  `);
}
