const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const express = require('express');
const sharp = require('sharp');

// MathJax components for pure Node.js LaTeX rendering
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

// Initialize MathJax adaptor & HTML handler
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

// Configure TeX input with full AMS, physics, symbols, etc.
const tex = new TeX({
  packages: AllPackages,
  inlineMath: [['$', '$'], ['\\(', '\\)']],
  displayMath: [['$$', '$$'], ['\\[', '\\]']]
});
const svgOutput = new SVG({ fontCache: 'local' });
const htmlDoc = mathjax.document('', { InputJax: tex, OutputJax: svgOutput });

const port = 3001;

const staticDir = 'static';
const outputDir = 'output';
const httpOutputDir = 'output';

// Checklist of valid formats from the frontend, to verify form values are correct
const validFormats = ['SVG', 'PNG', 'JPG'];

// Maps scales received from the frontend into numeric multipliers
const scaleMap = {
  '10%': 0.1,
  '25%': 0.25,
  '50%': 0.5,
  '75%': 0.75,
  '100%': 1.0,
  '125%': 1.25,
  '150%': 1.5,
  '200%': 2.0,
  '500%': 5.0,
  '1000%': 10.0
};

// Unsupported security-sensitive commands
const unsupportedCommands = ['\\input', '\\include', '\\write18', '\\immediate', '\\verbatiminput'];

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow static html files and output files to be accessible
app.use('/', express.static(staticDir));
app.use('/output', express.static(outputDir));

// Conversion request endpoint
app.post('/convert', async (req, res) => {
  const id = generateID();

  try {
    if (!req.body.latexInput) {
      res.end(JSON.stringify({ error: 'No LaTeX input provided.' }));
      return;
    }

    if (scaleMap[req.body.outputScale] === undefined) {
      res.end(JSON.stringify({ error: 'Invalid scale.' }));
      return;
    }

    if (!validFormats.includes(req.body.outputFormat)) {
      res.end(JSON.stringify({ error: 'Invalid image format.' }));
      return;
    }

    const unsupportedCommandsPresent = unsupportedCommands.filter(cmd => req.body.latexInput.includes(cmd));
    if (unsupportedCommandsPresent.length > 0) {
      res.end(JSON.stringify({ error: `Unsupported command(s) found: ${unsupportedCommandsPresent.join(', ')}. Please remove them and try again.` }));
      return;
    }

    const equation = req.body.latexInput.trim();
    const fileFormat = req.body.outputFormat.toLowerCase();
    const outputScale = scaleMap[req.body.outputScale];

    // Render LaTeX to SVG string in pure Node.js
    const svgString = convertLatexToSvg(equation, outputScale);

    const outputFileName = path.join(outputDir, `img-${id}.${fileFormat}`);

    // Return the SVG image
    if (fileFormat === 'svg') {
      await fsPromises.writeFile(outputFileName, svgString, 'utf8');

      // Convert to PNG
    } else if (fileFormat === 'png') {
      const density = Math.round(96 * outputScale);
      await sharp(Buffer.from(svgString), { density })
        .png()
        .toFile(outputFileName);

      // Convert to JPG (white background)
    } else {
      const density = Math.round(96 * outputScale);
      await sharp(Buffer.from(svgString), { density })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toFile(outputFileName);
    }

    res.end(JSON.stringify({
      imageURL: `${httpOutputDir}/img-${id}.${fileFormat}`,
      format: fileFormat,
      svgContent: svgString
    }));

  } catch (e) {
    console.error('Conversion error:', e.message);
    const clientError = e.message.startsWith('LaTeX Error:')
      ? e.message
      : 'Error converting LaTeX to image. Please ensure the input is valid.';
    res.end(JSON.stringify({ error: clientError }));
  }
});

// Create output directory if it doesn't exist yet
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Start the server
app.listen(port, () => console.log(`Latex2Image listening at http://localhost:${port}`));

//// Helper functions

// Converts LaTeX equation into clean SVG string using MathJax
function convertLatexToSvg(latexInput, scale) {
  let eq = latexInput.trim();

  // Strip document-level wrappers if passed by the user
  eq = eq.replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/g, '');
  eq = eq.replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]+\}/g, '');
  eq = eq.replace(/\\thispagestyle\{[^}]+\}/g, '');
  eq = eq.replace(/\\begin\{document\}/g, '');
  eq = eq.replace(/\\end\{document\}/g, '');
  eq = eq.trim();

  const node = htmlDoc.convert(eq, { display: true });

  // Check for LaTeX syntax errors
  const merror = adaptor.tags(node, 'g').find(g => adaptor.getAttribute(g, 'data-mml-node') === 'merror');
  if (merror) {
    const errorMsg = adaptor.getAttribute(merror, 'data-mjx-error') || 'Syntax error in LaTeX equation';
    throw new Error(`LaTeX Error: ${errorMsg}`);
  }

  let svgString = adaptor.innerHTML(node);

  // Scale SVG dimensions if scale != 1.0
  if (scale !== 1.0) {
    svgString = svgString.replace(
      /width="([0-9.]+)ex"\s+height="([0-9.]+)ex"/,
      (match, w, h) => `width="${(parseFloat(w) * scale).toFixed(3)}ex" height="${(parseFloat(h) * scale).toFixed(3)}ex"`
    );
  }

  return svgString;
}

function generateID() {
  let output = '';
  for (let i = 0; i < 16; i++) {
    output += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16));
  }
  return output;
}
