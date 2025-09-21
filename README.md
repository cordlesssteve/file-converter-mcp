# Document Organizer MCP Server

A comprehensive Model Context Protocol (MCP) server for systematic document organization, PDF-to-Markdown conversion, and Universal Project Documentation Standard implementation.

## Features

### 🔄 **PDF to Markdown Conversion**
- **Marker Engine**: Superior quality conversion with table-aware formatting
- **pymupdf4llm Engine**: Memory-efficient processing with customizable options
- **Intelligent Cleaning**: Automatic formatting artifact removal and table optimization
- **Batch Processing**: Selective conversion of unconverted documents

### 📊 **Document Organization**
- **Automated Discovery**: Recursive PDF scanning with detailed inventory
- **Content Analysis**: AI-powered categorization (Research, Planning, Technical, etc.)
- **Folder Structure Creation**: Hierarchical organization with custom categories
- **Status Tracking**: Conversion status monitoring and reporting

### 📋 **Universal Project Documentation Standard**
- **Project Initialization**: Create standardized documentation structure
- **Plan Management**: ACTIVE/ARCHIVED/SUPERSEDED plan tracking
- **Weekly Handoffs**: Automated progress reporting
- **Compliance Validation**: Structure verification and issue detection

### 🔄 **Complete Workflows**
- **End-to-End Automation**: Discover → Convert → Analyze → Organize
- **Memory Efficient**: Optimized for large document collections
- **Error Recovery**: Comprehensive error handling and reporting

## Installation

```bash
npm install document-organizer-mcp
```

## Quick Start

### PDF Conversion

```typescript
// Convert single PDF with marker (recommended)
const result = await mcp.callTool('convert_pdf', {
  pdf_path: '/path/to/document.pdf',
  output_path: '/path/to/output.md',
  options: {
    engine: 'marker',
    auto_clean: true
  }
});

// Batch convert missing PDFs
const batchResult = await mcp.callTool('document_organizer__convert_missing', {
  directory_path: '/path/to/documents'
});
```

### Document Organization

```typescript
// Discover all PDFs recursively
const discovery = await mcp.callTool('document_organizer__discover_pdfs', {
  directory_path: '/path/to/documents',
  recursive: true
});

// Analyze content for categorization
const analysis = await mcp.callTool('document_organizer__analyze_content', {
  directory_path: '/path/to/documents'
});

// Complete workflow automation
const workflow = await mcp.callTool('document_organizer__full_workflow', {
  directory_path: '/path/to/documents',
  analyze_content: true
});
```

### Project Documentation

```typescript
// Initialize project documentation standard
const projectInit = await mcp.callTool('document_organizer__init_project_docs', {
  directory_path: '/path/to/project',
  project_name: 'My Project',
  project_type: 'web-app'
});

// Validate documentation structure
const validation = await mcp.callTool('document_organizer__validate_doc_structure', {
  directory_path: '/path/to/project'
});

// Create weekly handoff
const handoff = await mcp.callTool('document_organizer__create_weekly_handoff', {
  project_path: '/path/to/project',
  completed_items: ['Implemented user authentication', 'Fixed database migration'],
  key_decisions: ['Chose PostgreSQL over MongoDB', 'Adopted TypeScript for type safety']
});
```

## Available Tools

### PDF Conversion Tools

- **`convert_pdf`** - Convert PDF to Markdown with advanced options
- **`check_dependency`** - Verify and install PDF conversion dependencies
- **`document_organizer__convert_missing`** - Batch convert unconverted PDFs

### Document Organization Tools

- **`document_organizer__discover_pdfs`** - Recursively find all PDF files
- **`document_organizer__check_conversions`** - Audit conversion status
- **`document_organizer__analyze_content`** - AI-powered content categorization
- **`document_organizer__organize_structure`** - Create organized folder structure
- **`document_organizer__full_workflow`** - Complete automation pipeline

### Project Documentation Tools

- **`document_organizer__init_project_docs`** - Initialize documentation standard
- **`document_organizer__archive_plan`** - Archive development plans
- **`document_organizer__validate_doc_structure`** - Validate compliance
- **`document_organizer__create_weekly_handoff`** - Generate progress reports

## Engine Comparison

| Feature | Marker | pymupdf4llm |
|---------|--------|-------------|
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Table Handling** | Excellent | Good |
| **Speed** | Medium | Fast |
| **Memory Usage** | Medium | Low |
| **Structured Content** | Excellent | Good |
| **Large Files** | Good | Excellent |
| **Dependencies** | External binary | Python only |

**Recommendation**: Use **marker** for highest quality output, especially for documents with complex tables and structured content.

## Universal Project Documentation Standard

### Required Files Structure

```
project-root/
├── CURRENT_STATUS.md          # Current reality and progress
├── ACTIVE_PLAN.md             # Currently executing plan
├── .claude-instructions.md     # Project-specific Claude guidance
└── docs/
    ├── plans/
    │   ├── archived/           # Completed plans
    │   └── superseded/         # Replaced plans
    ├── progress/
    │   └── YYYY-MM/           # Monthly progress logs
    └── reference/             # Technical documentation
```

### Plan Status Headers

Every plan document must include:

```markdown
# Plan Title
**Status:** ACTIVE | ARCHIVED | SUPERSEDED | BLOCKED
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
```

### Weekly Handoff Protocol

1. Update `CURRENT_STATUS.md` with actual progress
2. Archive completed plans to `docs/plans/archived/`
3. Create weekly progress log in `docs/progress/YYYY-MM/`
4. Update component status matrix

## Configuration

### MCP Server Setup

```json
{
  "mcpServers": {
    "document-organizer": {
      "command": "document-organizer-mcp"
    }
  }
}
```

### Dependencies

**For Marker (Recommended)**:
```bash
pip install marker-pdf
```

**For pymupdf4llm**:
```bash
pip install pymupdf4llm
```

**Check availability**:
```typescript
const check = await mcp.callTool('check_dependency', {
  install_if_missing: true
});
```

## Advanced Usage

### Custom Content Categories

```typescript
const categories = {
  'Research': ['analysis', 'research', 'study'],
  'Planning': ['plan', 'strategy', 'roadmap'],
  'Technical': ['implementation', 'architecture', 'api'],
  'Business': ['market', 'competitive', 'revenue']
};

const organized = await mcp.callTool('document_organizer__organize_structure', {
  directory_path: '/path/to/docs',
  categories,
  create_pdf_md_subfolders: true
});
```

### Batch Processing Workflow

```typescript
// 1. Discover and analyze
const discovery = await mcp.callTool('document_organizer__discover_pdfs', {
  directory_path: '/documents'
});

// 2. Check conversion status
const status = await mcp.callTool('document_organizer__check_conversions', {
  directory_path: '/documents'
});

// 3. Convert only missing files
const conversions = await mcp.callTool('document_organizer__convert_missing', {
  directory_path: '/documents'
});

// 4. Analyze and categorize
const analysis = await mcp.callTool('document_organizer__analyze_content', {
  directory_path: '/documents'
});
```

## Performance Optimization

### Memory Management
- Use **pymupdf4llm** with `page_chunks: true` for large files
- Process documents in batches for memory efficiency
- Enable automatic cleanup with `auto_clean: true`

### Processing Speed
- **marker**: Better for quality-critical conversions
- **pymupdf4llm**: Faster for large-scale batch processing
- Use selective conversion to avoid reprocessing

## Error Handling

The server provides comprehensive error reporting:

```typescript
{
  "success": false,
  "error": "Detailed error message",
  "processing_time": 1500,
  "warnings": ["Non-critical issues"]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the Universal Documentation Standard
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issues page.
