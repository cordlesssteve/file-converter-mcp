# Document Organizer MCP Server

[![CI/CD Pipeline](https://github.com/cordlesssteve/document-organizer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/cordlesssteve/document-organizer-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/document-organizer-mcp.svg)](https://www.npmjs.com/package/document-organizer-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Model Context Protocol (MCP) server for systematic document organization, PDF-to-Markdown conversion, and Universal Project Documentation Standard implementation.

## Features

### 🔄 PDF Conversion Engine
- **Dual Engine Support**: marker (recommended) and pymupdf4llm
- **Intelligent Table Preservation**: Advanced table-aware cleaning
- **Image Extraction**: Optional embedded image extraction
- **Memory Efficient**: Configurable processing for large documents
- **Auto-Cleaning**: Removes marker formatting artifacts automatically

### 📊 Document Organization
- **Recursive PDF Discovery**: Comprehensive file system scanning
- **Conversion Status Auditing**: Track converted vs unconverted documents
- **Intelligent Categorization**: Keyword-based content analysis
- **Automated Folder Organization**: Category-based directory structures
- **Full Workflow Automation**: End-to-end document processing pipeline

### 📋 Universal Project Documentation Standard
- **Standardized Structure**: Consistent documentation across all projects
- **Status-Driven Plans**: ACTIVE, ARCHIVED, SUPERSEDED, BLOCKED statuses
- **Weekly Progress Tracking**: Automated handoff documentation
- **Compliance Validation**: Ensure adherence to documentation standards
- **Template Generation**: Project-specific documentation templates

## Installation

```bash
npm install -g document-organizer-mcp
```

### Dependencies

For PDF conversion functionality, install one or both engines:

```bash
# Marker (recommended for complex documents)
pip install marker-pdf

# pymupdf4llm (lightweight alternative)
pip install pymupdf4llm
```

## Usage

### MCP Configuration

Add to your MCP client configuration:

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

### Available Tools

#### PDF Conversion Tools
- `convert_pdf` - Convert PDF to Markdown with configurable options
- `check_dependency` - Verify and optionally install conversion engines

#### Document Organization Tools
- `document_organizer__discover_pdfs` - Recursively find all PDF files
- `document_organizer__check_conversions` - Audit conversion status
- `document_organizer__convert_missing` - Convert only unconverted PDFs
- `document_organizer__analyze_content` - Categorize documents by content
- `document_organizer__organize_structure` - Create organized folder hierarchies
- `document_organizer__full_workflow` - Complete automation pipeline

#### Documentation Standard Tools
- `document_organizer__init_project_docs` - Initialize standard documentation structure
- `document_organizer__validate_doc_structure` - Validate compliance
- `document_organizer__archive_plan` - Archive development plans
- `document_organizer__create_weekly_handoff` - Generate progress reports

## Examples

### Basic PDF Conversion

```typescript
// Convert a single PDF using marker engine
await client.callTool("convert_pdf", {
  pdf_path: "/path/to/document.pdf",
  output_path: "/path/to/output.md",
  options: {
    engine: "marker",
    auto_clean: true
  }
});
```

### Full Document Organization Workflow

```typescript
// Discover, convert, and organize all documents
await client.callTool("document_organizer__full_workflow", {
  directory_path: "/path/to/documents",
  analyze_content: true
});
```

### Initialize Project Documentation

```typescript
// Set up Universal Project Documentation Standard
await client.callTool("document_organizer__init_project_docs", {
  directory_path: "/path/to/project",
  project_name: "My Project",
  project_type: "web-app"
});
```

## Configuration Options

### PDF Conversion Options

```typescript
interface ConversionOptions {
  engine?: "marker" | "pymupdf4llm";     // Conversion engine
  auto_clean?: boolean;                  // Auto-clean marker output
  page_chunks?: boolean;                 // Process as individual pages
  write_images?: boolean;                // Extract embedded images
  image_path?: string;                   // Image extraction directory
  table_strategy?: "fast" | "accurate";  // Table extraction strategy
  extract_content?: "text" | "figures" | "both"; // Content types
}
```

### Document Categories

Automatic categorization supports:
- **Research**: Analysis, studies, investigations
- **Planning**: Strategies, roadmaps, discussions
- **Documentation**: Guides, manuals, references
- **Technical**: Implementation, architecture, APIs
- **Business**: Market analysis, commercial strategies
- **General**: Uncategorized content

## Universal Project Documentation Standard

### Required Files
- `CURRENT_STATUS.md` - Real-time project status
- `ACTIVE_PLAN.md` - Currently executing plan
- `.claude-instructions.md` - AI assistant instructions

### Directory Structure
```
/docs/
├── plans/
│   ├── archived/     # Completed plans
│   └── superseded/   # Replaced plans
├── progress/YYYY-MM/ # Monthly progress logs
└── reference/        # Technical documentation
    ├── 01-architecture/
    ├── 02-apis/
    ├── 03-development/
    └── ...
```

### Status Management
- **ACTIVE**: Currently executing plan
- **ARCHIVED**: Historical/completed plan
- **SUPERSEDED**: Replaced by newer plan
- **BLOCKED**: Waiting for external input

## Development

```bash
# Clone repository
git clone https://github.com/cordlesssteve/document-organizer-mcp.git
cd document-organizer-mcp

# Install dependencies
npm install

# Build project
npm run build

# Run development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Performance Considerations

- **Memory Efficiency**: Use `page_chunks: true` for large PDFs
- **Processing Speed**: marker is slower but higher quality than pymupdf4llm
- **Batch Processing**: `convert_missing` tool optimizes bulk conversions
- **Table Preservation**: marker with auto-cleaning provides best table formatting

## Error Handling

The server provides comprehensive error handling:
- Dependency validation before operations
- Graceful fallback between conversion engines
- Detailed error messages with context
- Progress tracking for long-running operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Issues](https://github.com/cordlesssteve/document-organizer-mcp/issues)
- [Discussions](https://github.com/cordlesssteve/document-organizer-mcp/discussions)
- [Wiki](https://github.com/cordlesssteve/document-organizer-mcp/wiki)
