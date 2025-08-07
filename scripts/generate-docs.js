
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
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Parser API Documentation</title>
    <style>
        :root {
            --bg-primary: #fafafa;
            --bg-secondary: #ffffff;
            --text-primary: #1a1a1a;
            --text-secondary: #6b7280;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --border: #e5e7eb;
            --code-bg: #f3f4f6;
            --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-primary: #0f0f0f;
                --bg-secondary: #1a1a1a;
                --text-primary: #fafafa;
                --text-secondary: #a1a1aa;
                --accent: #60a5fa;
                --accent-hover: #3b82f6;
                --border: #374151;
                --code-bg: #374151;
                --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2);
                --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
            }
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background-color: var(--bg-primary);
            transition: background-color 0.2s ease;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem 0;
            border-bottom: 1px solid var(--border);
        }

        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--accent), var(--accent-hover));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header p {
            font-size: 1.25rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }

        .content {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 2.5rem;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border);
        }

        h1, h2, h3, h4, h5, h6 {
            margin-top: 2rem;
            margin-bottom: 1rem;
            font-weight: 600;
            line-height: 1.3;
        }

        h1 { font-size: 2.5rem; }
        h2 { 
            font-size: 2rem; 
            border-bottom: 2px solid var(--border);
            padding-bottom: 0.5rem;
        }
        h3 { font-size: 1.5rem; }
        h4 { font-size: 1.25rem; }

        p {
            margin-bottom: 1rem;
            color: var(--text-secondary);
        }

        ul, ol {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
        }

        li {
            margin-bottom: 0.25rem;
            color: var(--text-secondary);
        }

        code {
            background: var(--code-bg);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.875rem;
            color: var(--text-primary);
            border: 1px solid var(--border);
        }

        pre {
            background: var(--code-bg);
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
            border: 1px solid var(--border);
        }

        pre code {
            background: none;
            padding: 0;
            border: none;
        }

        blockquote {
            border-left: 4px solid var(--accent);
            padding-left: 1rem;
            margin: 1rem 0;
            font-style: italic;
            color: var(--text-secondary);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            background: var(--bg-primary);
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid var(--border);
        }

        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        th {
            background: var(--code-bg);
            font-weight: 600;
            color: var(--text-primary);
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: var(--accent);
            color: white;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
            margin-right: 0.5rem;
        }

        .endpoint {
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
        }

        .method-post { color: #059669; }
        .method-get { color: var(--accent); }

        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .content {
                padding: 1.5rem;
            }
            
            pre {
                padding: 1rem;
                font-size: 0.8rem;
            }
        }

        /* Smooth scrolling */
        html {
            scroll-behavior: smooth;
        }

        /* Focus styles for accessibility */
        a:focus, button:focus {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>HTML Parser API</h1>
            <p>A powerful REST API service for extracting content from web pages using CSS selectors</p>
        </header>

        <main class="content">
            ${htmlContent}
        </main>

        <footer class="footer">
            <p>Generated from README.md • Built with ❤️ for developers</p>
        </footer>
    </div>

    <script>
        // Add copy button to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            const button = document.createElement('button');
            button.textContent = 'Copy';
            button.style.cssText = \`
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: var(--accent);
                color: white;
                border: none;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s ease;
            \`;
            
            const pre = block.parentElement;
            pre.style.position = 'relative';
            pre.appendChild(button);
            
            pre.addEventListener('mouseenter', () => button.style.opacity = '1');
            pre.addEventListener('mouseleave', () => button.style.opacity = '0');
            
            button.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(block.textContent);
                    button.textContent = 'Copied!';
                    setTimeout(() => button.textContent = 'Copy', 2000);
                } catch (err) {
                    button.textContent = 'Failed';
                    setTimeout(() => button.textContent = 'Copy', 2000);
                }
            });
        });
    </script>
</body>
</html>`;

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
