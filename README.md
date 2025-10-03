# File Converter MCP

[![CI/CD Pipeline](https://github.com/cordlesssteve/file-converter-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/cordlesssteve/file-converter-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/file-converter-mcp.svg)](https://www.npmjs.com/package/file-converter-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that aggregates various file conversion tools for quick formatting and file type transformations.

## Features

### Supported Conversions

- **PDF to Markdown** - Convert PDF documents to markdown format
- **Image Format Conversion** - Transform between common image formats (PNG, JPG, WebP, etc.)
- **Document Conversion** - Convert between document formats (DOCX, TXT, HTML, etc.)
- **Spreadsheet Conversion** - Transform spreadsheet formats (CSV, XLSX, JSON, etc.)
- **Code Format Conversion** - Convert between code formats and syntax highlighting
- **Archive Operations** - Extract and create archive files (ZIP, TAR, etc.)

### Conversion Engines

- **PDF Engine**: marker (recommended) and pymupdf4llm support
- **Image Engine**: Sharp and ImageMagick integration
- **Document Engine**: Pandoc integration for broad format support
- **Archive Engine**: Built-in Node.js compression libraries

## Installation

```bash
npm install -g file-converter-mcp
```

### Dependencies

Install conversion engines based on your needs:

```bash
# PDF conversion engines
pip install marker-pdf pymupdf4llm

# Image processing (choose one)
npm install sharp
# OR
brew install imagemagick  # macOS
apt-get install imagemagick  # Ubuntu

# Document conversion
brew install pandoc  # macOS
apt-get install pandoc  # Ubuntu

# Archive tools (usually pre-installed)
# zip, unzip, tar, gzip
```

## Usage

### MCP Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "file-converter": {
      "command": "file-converter-mcp",
      "args": []
    }
  }
}
```

### Available Tools

#### PDF Conversion
- `convert_pdf_to_markdown` - Convert PDF files to Markdown
- `extract_pdf_text` - Extract plain text from PDF files
- `extract_pdf_images` - Extract images from PDF files

#### Image Conversion
- `convert_image_format` - Convert between image formats
- `resize_image` - Resize images with quality options
- `compress_image` - Reduce image file size

#### Document Conversion
- `convert_document` - Convert between document formats using Pandoc
- `extract_document_text` - Extract text from various document formats
- `convert_markdown_to_html` - Convert Markdown to HTML with styling

#### Spreadsheet Conversion
- `convert_csv_to_json` - Convert CSV data to JSON format
- `convert_json_to_csv` - Convert JSON data to CSV format
- `convert_xlsx_to_csv` - Extract CSV data from Excel files

#### Archive Operations
- `create_archive` - Create ZIP or TAR archives from files/folders
- `extract_archive` - Extract contents from archive files
- `list_archive_contents` - List files in archive without extracting

#### Utility Tools
- `detect_file_type` - Identify file format and encoding
- `validate_conversion` - Check if conversion is supported
- `batch_convert` - Convert multiple files in one operation

## Examples

### Basic PDF Conversion

```typescript
// Convert PDF to Markdown
await client.callTool("convert_pdf_to_markdown", {
  input_path: "/path/to/document.pdf",
  output_path: "/path/to/output.md",
  options: {
    engine: "marker",
    preserve_formatting: true
  }
});
```

### Image Format Conversion

```typescript
// Convert PNG to WebP with compression
await client.callTool("convert_image_format", {
  input_path: "/path/to/image.png",
  output_path: "/path/to/image.webp",
  options: {
    quality: 80,
    format: "webp"
  }
});
```

### Document Conversion

```typescript
// Convert DOCX to Markdown using Pandoc
await client.callTool("convert_document", {
  input_path: "/path/to/document.docx",
  output_path: "/path/to/document.md",
  options: {
    format: "markdown",
    preserve_styles: false
  }
});
```

### Batch Operations

```typescript
// Convert multiple files at once
await client.callTool("batch_convert", {
  input_directory: "/path/to/input/",
  output_directory: "/path/to/output/",
  conversions: [
    { from: "pdf", to: "markdown" },
    { from: "png", to: "webp" },
    { from: "docx", to: "txt" }
  ]
});
```

## Configuration Options

### Conversion Settings

```typescript
interface ConversionOptions {
  engine?: string;                    // Conversion engine to use
  quality?: number;                   // Output quality (1-100)
  preserve_formatting?: boolean;      // Maintain original formatting
  output_format?: string;             // Specific output format
  compression_level?: number;         // Compression level (0-9)
  custom_options?: Record<string, any>; // Engine-specific options
}
```

### Supported File Types

#### Input Formats
- **Documents**: PDF, DOCX, DOC, RTF, TXT, HTML, XML
- **Images**: PNG, JPG, JPEG, WebP, GIF, BMP, TIFF, SVG
- **Spreadsheets**: CSV, XLSX, XLS, JSON, TSV
- **Archives**: ZIP, TAR, GZ, 7Z, RAR (extract only)
- **Code**: Various programming language files

#### Output Formats  
- **Text**: Markdown, HTML, TXT, RTF
- **Images**: PNG, JPG, WebP, GIF, BMP
- **Data**: JSON, CSV, XML, YAML
- **Archives**: ZIP, TAR, GZ

## Performance Considerations

- **Memory Usage**: Large files are processed in chunks to prevent memory issues
- **Processing Speed**: Different engines have different speed/quality tradeoffs
- **Batch Processing**: More efficient for multiple file conversions
- **Caching**: Converted files can be cached to avoid re-processing

## Error Handling

The server provides comprehensive error handling:
- Input file validation and format detection
- Graceful fallback between conversion engines
- Detailed error messages with suggested solutions
- Progress tracking for long-running conversions

## Development

```bash
# Clone repository
git clone https://github.com/cordlesssteve/file-converter-mcp.git
cd file-converter-mcp

# Install dependencies
npm install

# Build project
npm run build

# Run development mode
npm run dev

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add support for new file formats or conversion engines
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Issues](https://github.com/cordlesssteve/file-converter-mcp/issues)
- [Discussions](https://github.com/cordlesssteve/file-converter-mcp/discussions)
- [Wiki](https://github.com/cordlesssteve/file-converter-mcp/wiki)