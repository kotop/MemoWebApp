import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { Box } from '@mui/material';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true
});

// Create a custom renderer
const renderer = new marked.Renderer();

// Customize link rendering to open in new tab
renderer.link = (href, title, text) => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
};

// Add support for #tags in text - improved pattern to match Russian text
renderer.paragraph = (text) => {
  // Ensure text is a string before using replace
  const textStr = text && typeof text === 'string' ? text : String(text || '');
  
  // Replace #tags with styled spans - updated regex for better matching
  const taggedText = textStr.replace(
    /(^|\s)(#[a-zA-Zа-яА-ЯёЁ0-9]\w*(?:[-_][a-zA-Zа-яА-ЯёЁ0-9]\w*)*)/g,
    (match, space, tag) => `${space}<span class="tag">${tag}</span>`
  );
  return `<p>${taggedText}</p>`;
};

// Add custom code renderer to handle LaTeX blocks
renderer.code = (code, language) => {
  if (language === 'latex' || language === 'math' || language === 'tex') {
    try {
      // Render display math with KaTeX
      const html = katex.renderToString(code, {
        displayMode: true,
        throwOnError: false
      });
      return `<div class="katex-block">${html}</div>`;
    } catch (error) {
      console.error('KaTeX error:', error);
      return `<pre><code class="language-${language}">${code}</code></pre>`;
    }
  }
  return `<pre><code class="language-${language}">${code}</code></pre>`;
};

function MarkdownPreview({ content }) {
  const [html, setHtml] = useState('');
  
  // Process content to handle LaTeX inline formulas
  const processContent = (content) => {
    if (!content) return '';
    
    // First replace any text that contains tags with proper HTML
    let processedContent = content;
    
    // Handle inline LaTeX: \( ... \)
    processedContent = processedContent.replace(/\\\((.*?)\\\)/g, (match, formula) => {
      try {
        const rendered = katex.renderToString(formula, {
          displayMode: false,
          throwOnError: false
        });
        return rendered;
      } catch (error) {
        console.error('KaTeX inline error:', error);
        return match;
      }
    });
    
    // Handle display LaTeX: $$ ... $$ (improved to handle multi-line and spaces)
    processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      try {
        const rendered = katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
          strict: false
        });
        return `<div class="katex-block">${rendered}</div>`;
      } catch (error) {
        console.error('KaTeX display error:', error);
        console.error('Formula that caused error:', formula);
        return match;
      }
    });
    
    return processedContent;
  };
  
  useEffect(() => {
    try {
      // Pre-process content for LaTeX
      const processedContent = processContent(content || '');
      
      // Parse markdown with our custom renderer
      const parsedHtml = marked(processedContent, { renderer });
      
      setHtml(parsedHtml);
    } catch (error) {
      console.error('Error rendering markdown:', error);
      setHtml(`<p>Error rendering content: ${error.message}</p>`);
    }
  }, [content]);
  
  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        overflow: 'auto',
        fontFamily: 'sans-serif',
        '& img': {
          maxWidth: '100%'
        },
        '& .tag': {
          backgroundColor: '#e1f5fe',
          color: '#0277bd',
          padding: '2px 4px',
          borderRadius: '4px',
          fontWeight: 'bold',
          display: 'inline-block',
          margin: '0 2px'
        },
        '& blockquote': {
          borderLeft: '3px solid #ccc',
          margin: '1.5em 0',
          padding: '0.5em 10px',
          color: '#555'
        },
        '& pre': {
          backgroundColor: '#f5f5f5',
          padding: '16px',
          borderRadius: '4px',
          overflow: 'auto'
        },
        '& code': {
          backgroundColor: '#f5f5f5',
          padding: '2px 4px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        },
        '& .katex-block': {
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '0.5em 0',
          margin: '1em 0',
          textAlign: 'center'
        },
        '& .katex': {
          fontSize: '1.1em',
          lineHeight: 1.2
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MarkdownPreview;