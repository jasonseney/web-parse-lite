
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

// Configure marked for better code highlighting
marked.setOptions({
  breaks: true,
  gfm: true
});

// Read the README.md file
const readmePath = path.join(process.cwd(), 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf8');

// Convert markdown to HTML
const htmlContent = marked(readmeContent);

// Create the complete HTML document with beautiful styling
const templatePath = path.join(process.cwd(), 'scripts', 'docs-template.html');
let fullHtml = fs.readFileSync(templatePath, 'utf8');
fullHtml = fullHtml.replace('${htmlContent}', htmlContent);

// Ensure docs directory exists
const publishPath = path.join(process.cwd(), 'public');
if (!fs.existsSync(publishPath)) {
    fs.mkdirSync(publishPath);
}

// Write the HTML file
const outputPath = path.join(publishPath, 'index.html');
fs.writeFileSync(outputPath, fullHtml);

console.log('✅ Documentation generated successfully!');
console.log(`📄 File created: ${outputPath}`);
console.log('🌐 You can now serve the docs directory as a static site');
