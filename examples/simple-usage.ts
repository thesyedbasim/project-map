import { generateProjectMap } from 'project-map';

async function main() {
  try {
    await generateProjectMap({
      rootDir: '../your-project',
      outputPath: './project-structure.txt',
      exclude: ['node_modules', '.git', 'dist'],
      includeContent: true,
      maxDepth: 3,
      contentSizeLimit: 50 // limit file content to 50KB
    });
    
    console.log('Project structure map generated successfully!');
  } catch (error) {
    console.error('Error generating project map:', error);
  }
}

main();
