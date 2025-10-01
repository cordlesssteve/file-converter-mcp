# Document Organizer → File Converter MCP - Feature Backlog

**Last Updated:** 2025-09-30
**Status:** ACTIVE

## Upcoming Major Refactor: Conversion-Focused Redesign

### Strategic Direction
This MCP will be refactored to focus **exclusively on high-quality file conversion**, removing document organization features to create a specialized, best-in-class conversion tool.

---

## High Priority Features

### 1. Add Pandoc Integration for Bidirectional Markdown↔PDF
**Priority:** HIGH
**Status:** Backlog
**Rationale:** Keep Marker for PDF→Markdown (excellent quality), add Pandoc for Markdown→PDF conversion

**Implementation Requirements:**
- Add Pandoc engine alongside existing Marker/pymupdf4llm
- Support multiple PDF engines via Pandoc:
  - WeasyPrint (recommended default for HTML→PDF)
  - Typst (modern, fast alternative)
  - LaTeX engines (pdflatex, lualatex, xelatex) for academic quality
- Bidirectional conversion workflow:
  - PDF → Markdown (Marker)
  - Markdown → PDF (Pandoc with configurable engine)
- Configuration options for PDF quality/style

**Expected Tools:**
- `convert_markdown_to_pdf` - New tool using Pandoc
- Enhanced `convert_pdf` with round-trip validation option

**Research Notes:**
- Pandoc supports 40+ formats (future expansion potential)
- WeasyPrint: Python-based, CSS styling support
- Typst: Gaining popularity in 2025, faster than LaTeX
- LaTeX: Highest quality for academic/professional documents

---

### 2. Expand Document Conversion Capabilities (High-Quality Focus)
**Priority:** HIGH
**Status:** Backlog
**Rationale:** Aggregate best-in-class conversion tools for comprehensive format support

**Target Conversion Capabilities:**

#### Additional PDF Converters
- **Docling** - Flawless table preservation, complex layouts
- **MinerU** - Academic papers, research documents
- **Mistral Document AI** (optional, API-based) - Highest accuracy, commercial

#### Office Document Conversions
- **DOC/DOCX ↔ PDF**
  - LibreOffice headless mode (current best practice)
  - Command: `libreoffice --headless --convert-to pdf file.docx`
  - Batch support with wildcards

- **XLSX/XLS ↔ CSV/PDF**
  - LibreOffice for Excel conversions
  - Pandas for CSV operations (Python)

#### Additional Format Support (Future)
- **HTML ↔ Markdown** - Via Pandoc
- **reStructuredText ↔ Markdown** - Via Pandoc
- **LaTeX ↔ PDF** - Via Pandoc + LaTeX engines
- **DOCX ↔ Markdown** - Via Pandoc

**Implementation Strategy:**
1. **Phase 1:** Pandoc + LibreOffice (covers 80% of use cases)
2. **Phase 2:** Add Docling/MinerU for specialized PDF needs
3. **Phase 3:** Explore API-based premium converters (Mistral, Mathpix)

**Quality Benchmarking:**
- Implement conversion quality tests
- Compare output across engines for same input
- Document when to use which engine

---

### 3. Remove Document Organization Tools (Scope Reduction)
**Priority:** HIGH
**Status:** Backlog
**Rationale:** Focus exclusively on conversion, remove organization features

**Tools to REMOVE:**
- ❌ `document_organizer__discover_pdfs`
- ❌ `document_organizer__check_conversions`
- ❌ `document_organizer__convert_missing`
- ❌ `document_organizer__analyze_content`
- ❌ `document_organizer__organize_structure`
- ❌ `document_organizer__full_workflow`
- ❌ `document_organizer__init_project_docs`
- ❌ `document_organizer__archive_plan`
- ❌ `document_organizer__validate_doc_structure`
- ❌ `document_organizer__create_weekly_handoff`

**Tools to KEEP (and enhance):**
- ✅ `convert_pdf` - Core PDF→Markdown conversion
- ✅ `check_dependency` - Dependency validation
- ✅ NEW: `convert_markdown_to_pdf` - Pandoc-based conversion
- ✅ NEW: `convert_document` - Universal converter dispatcher
- ✅ NEW: `list_supported_formats` - Capability discovery
- ✅ NEW: `convert_batch` - Batch conversion operations

**Migration Notes:**
- Document organization features could be split to separate MCP if needed
- Universal Project Documentation Standard tools (`init_project_docs`, etc.) could move to dedicated "project-template" MCP

---

### 4. Rename MCP Server: `document-organizer` → `file-converter`
**Priority:** HIGH
**Status:** Backlog
**Rationale:** Name should reflect focused conversion purpose

**Rename Checklist:**
- [ ] Package name: `document-organizer-mcp` → `file-converter-mcp`
- [ ] Directory: `document-organizer-mcp/` → `file-converter-mcp/`
- [ ] Binary name: `document-organizer-mcp` → `file-converter-mcp`
- [ ] Server name in code: `'document-organizer'` → `'file-converter'`
- [ ] Tool prefixes: `document_organizer__*` → `convert__*` or no prefix
- [ ] README.md updates
- [ ] GitHub repository rename
- [ ] npm package rename (if published)
- [ ] MCP configuration updates in:
  - metaMCP-RAG server config
  - Claude Code global config
  - User documentation

**Breaking Changes:**
- All existing tool names will change
- Configuration updates required for all users
- Consider deprecation period with dual naming support

---

## Medium Priority Features

### 5. Add Conversion Quality Validation
**Priority:** MEDIUM
**Status:** Backlog

**Features:**
- Round-trip conversion testing (PDF→MD→PDF comparison)
- Content validation (character count, image preservation)
- Table structure verification
- Format integrity checks

---

### 6. Enhanced Error Handling & Timeout Management
**Priority:** MEDIUM
**Status:** Backlog
**Related to:** Issue discovered in audit - dependency check timeout

**Improvements:**
- Add explicit timeout parameters to all spawn() calls
- Cache dependency check results (Redis/in-memory)
- Make dependency checking lazy (only when needed)
- Async checking with proper error handling
- Graceful degradation when engines unavailable

**Specific Fixes:**
- Line 134-172: Add timeout to `checkPymupdf4llm()`
- Line 174-212: Add timeout to `checkMarker()`
- Cache results for 5-10 minutes to avoid repeated checks

---

## Low Priority / Future Considerations

### 7. Conversion Engine Performance Benchmarking
**Priority:** LOW
**Status:** Backlog

**Metrics to Track:**
- Processing time per page
- Memory usage
- Output file size
- Quality scores (manual evaluation)

---

### 8. API-Based Premium Converter Integration
**Priority:** LOW
**Status:** Research

**Services to Evaluate:**
- Mistral Document AI (highest accuracy)
- Mathpix (excellent STEM/math support)
- CloudConvert API (40+ formats)

**Considerations:**
- Cost per conversion
- API rate limits
- Privacy/security for sensitive documents
- Offline capability requirements

---

## Completed Features

_(None yet - this is the initial backlog)_

---

## Notes & Considerations

### Design Principles
1. **Quality over Speed** - Prioritize conversion accuracy
2. **Engine Selection Guidance** - Help users choose right tool for job
3. **Graceful Fallbacks** - Multiple engines for resilience
4. **Transparent Results** - Report which engine was used, conversion stats

### Technical Debt
- Current ES module timeout issues (lines 134-212)
- No caching for expensive dependency checks
- Limited batch processing capabilities
- No conversion quality metrics

### Future Directions
- Consider GUI for conversion configuration
- Integration with document management systems
- OCR capabilities for scanned PDFs
- Specialized converters for code documentation (Sphinx, JSDoc, etc.)
