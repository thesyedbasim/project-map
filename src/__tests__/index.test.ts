import * as fs from 'fs';
import * as path from 'path';
import { generateProjectMap } from '../index';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('generateProjectMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock existsSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Mock directory structure
    (fs.readdirSync as jest.Mock).mockImplementation((dirPath) => {
      if (dirPath.includes('rootDir')) {
        return ['file1.txt', 'file2.js', 'node_modules', 'src'];
      } else if (dirPath.includes('src')) {
        return ['index.ts', 'utils'];
      } else if (dirPath.includes('utils')) {
        return ['helpers.ts'];
      } else if (dirPath.includes('node_modules')) {
        return ['some-package'];
      }
      return [];
    });
    
    // Mock file stats
    (fs.statSync as jest.Mock).mockImplementation((filePath) => {
      const isDirectory = 
        filePath.includes('src') || 
        filePath.includes('utils') || 
        filePath.includes('node_modules');
      
      return {
        isDirectory: () => isDirectory,
        isFile: () => !isDirectory,
        size: 1024 // 1KB for all files
      };
    });
    
    // Mock file content
    (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
      if (filePath.includes('.txt')) {
        return 'This is a text file';
      } else if (filePath.includes('.js')) {
        return 'console.log("Hello World");';
      } else if (filePath.includes('.ts')) {
        return 'export function hello() { return "world"; }';
      }
      return '';
    });
  });

  it('should generate a project map with default options', async () => {
    await generateProjectMap({
      rootDir: '/test/rootDir',
      outputPath: '/test/output.txt'
    });

    expect(fs.writeFileSync).toHaveBeenCalled();
    
    // The first argument should be the output path
    const outputPath = (fs.writeFileSync as jest.Mock).mock.calls[0][0];
    expect(outputPath).toBe('/test/output.txt');
    
    // The second argument should be the content
    const content = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
    
    // Check content includes files but not node_modules (excluded by default)
    expect(content).toContain('file1.txt');
    expect(content).toContain('file2.js');
    expect(content).toContain('src');
    expect(content).not.toContain('node_modules');
  });

  it('should include content when includeContent is true', async () => {
    await generateProjectMap({
      rootDir: '/test/rootDir',
      outputPath: '/test/output.txt',
      includeContent: true
    });

    const content = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
    
    // Check that file content is included
    expect(content).toContain('This is a text file');
    expect(content).toContain('console.log("Hello World")');
  });

  it('should respect maxDepth option', async () => {
    await generateProjectMap({
      rootDir: '/test/rootDir',
      outputPath: '/test/output.txt',
      maxDepth: 1
    });

    const content = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
    
    // Should include src directory but not its contents
    expect(content).toContain('src');
    expect(content).not.toContain('index.ts');
    expect(content).not.toContain('utils');
  });

  it('should include node_modules when not in exclude list', async () => {
    await generateProjectMap({
      rootDir: '/test/rootDir',
      outputPath: '/test/output.txt',
      exclude: ['.git'] // node_modules not excluded
    });

    const content = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
    
    // Should include node_modules
    expect(content).toContain('node_modules');
  });
});
