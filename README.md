# Document Organizer MCP Server

MCP server for systematic document organization and PDF-to-Markdown conversion with intelligent categorization and workflow automation.

## Features

- **PDF to Markdown Conversion** - High-quality conversion using marker and pymupdf4llm
- **Intelligent Document Discovery** - Recursive PDF scanning and inventory management
- **Automated Organization** - Category-based folder structures with content analysis
- **Project Documentation Standards** - Universal Project Documentation Standard (UPDS) support
- **Workflow Automation** - Complete end-to-end document processing pipelines
- **Progress Tracking** - Detailed conversion statistics and validation reports

## Installation

```bash
npm install -g document-organizer-mcp
```

## Configuration

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "document-organizer": {
      "command": "document-organizer-mcp",
      "args": []
    }
  }
}
```

## Available Tools

### PDF Conversion
- `convert_pdf` - Convert PDF to Markdown with multiple engine options
- `check_dependency` - Verify conversion dependencies and install if needed

### Document Discovery
- `discover_pdfs` - Recursively scan directories for PDF files
- `check_conversions` - Analyze conversion status and identify missing conversions
- `convert_missing` - Selectively convert only PDFs without companion Markdown files

### Content Analysis
- `analyze_content` - Intelligent document categorization using keyword analysis
- `organize_structure` - Create hierarchical directory structure based on categories

### Project Documentation
- `init_project_docs` - Initialize Universal Project Documentation Standard structure
- `validate_doc_structure` - Check compliance with documentation standards
- `archive_plan` - Move plans to archived status with proper metadata
- `create_weekly_handoff` - Generate weekly progress reports

### Workflow Automation
- `full_workflow` - Complete end-to-end document organization pipeline

## Usage Examples

### Basic PDF Conversion
```javascript
convert_pdf({
  pdf_path: "/path/to/document.pdf",
  engine: "marker",  // or "pymupdf4llm"
  options: {
    auto_clean: true,
    write_images: false
  }
})
```

### Document Discovery and Organization
```javascript
// Discover all PDFs in a directory
discover_pdfs({
  directory_path: "/path/to/documents",
  recursive: true
})

// Convert only missing Markdown files
convert_missing({
  directory_path: "/path/to/documents"
})

// Analyze content and organize
analyze_content({
  directory_path: "/path/to/documents"
})
```

### Project Documentation Setup
```javascript
// Initialize UPDS structure
init_project_docs({
  directory_path: "/path/to/project",
  project_name: "My Project",
  project_type: "web-app"
})

// Validate compliance
validate_doc_structure({
  directory_path: "/path/to/project"
})
```

### Complete Automation
```javascript
// Full end-to-end workflow
full_workflow({
  directory_path: "/path/to/documents",
  analyze_content: true
})
```

## Conversion Engines

### Marker (Recommended)
- **Best for**: Complex documents with tables and structured content
- **Features**: Superior quality, automatic formatting cleanup
- **Requirements**: Python environment with marker package

### PyMuPDF4LLM
- **Best for**: Simple documents, faster processing
- **Features**: Fast conversion, embedded image extraction
- **Requirements**: pymupdf4llm package

## Project Structure Created

```
project/
├── CURRENT_STATUS.md           # Current reality and progress
├── ACTIVE_PLAN.md             # Currently executing plan
├── docs/
│   ├── plans/
│   │   ├── archived/          # Completed plans
│   │   └── superseded/        # Replaced plans
│   ├── progress/YYYY-MM/      # Weekly progress logs
│   └── reference/             # Technical documentation
│       ├── 01-architecture/   # System design & ADRs
│       ├── 02-apis/          # API documentation
│       └── [03-09 categories] # Other reference docs
└── .claude-instructions.md    # Claude Code project settings
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run watch

# Run server
npm start
```

## Requirements

- Node.js >= 18.0.0
- Python environment (for PDF conversion engines)
- Optional: marker, pymupdf4llm packages for conversion

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## Support

For issues and feature requests, please use the GitHub issue tracker at:
https://github.com/cordlesssteve/document-organizer-mcp/issues