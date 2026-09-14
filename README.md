# LaTeX2Image Web

A lightweight, high-performance Node.js web application that converts LaTeX math equations into clean, transparent PNG, JPG, and vector SVG images.

## Features

- **Pure Node.js**: Powered by MathJax and Sharp. No Docker or heavy TeX installations required.
- **Fast & Responsive**: Renders equations in milliseconds.
- **Multiple Formats**: Export as PNG (with transparency), JPG (white background), or scalable vector SVG.
- **Custom Scaling**: Scale from 10% up to 1000% resolution.
- **Auto-Alignment**: Support for `\begin{align*}` equation blocks.
- **Interactive UI**: Preview rendered equations with one-click copy for Image URLs, Raw SVG markup, and Markdown embeds.

## Requirements

- [Node.js](https://nodejs.org/) (v16 or newer recommended)

## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3001
   ```

## Usage

1. Enter a LaTeX math equation (e.g. `\frac{\pi}{2} = \int_{-1}^{1} \sqrt{1-x^2}\ dx`).
2. Select your desired image format (PNG, JPG, or SVG) and scaling percentage.
3. Click **Convert**.
4. View the rendered preview, copy the direct image URL, raw SVG, or markdown embed code, or click **Download Image** to save it locally.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
