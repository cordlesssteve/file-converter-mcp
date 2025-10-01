# Document Organizer MCP - Current Status

**Last Updated:** 2025-09-30
**Version:** 1.0.0
**Status:** Production (Pending Major Refactor)

## Current Reality ✅

### What's Actually Working
- ✅ PDF → Markdown conversion (Marker engine)
- ✅ PDF → Markdown conversion (pymupdf4llm engine)
- ✅ Automatic marker output cleaning (table-aware)
- ✅ Dependency checking (pymupdf4llm, marker)
- ✅ Universal Project Documentation Standard tools (10 tools)
- ✅ Document discovery and organization workflow (6 tools)

### Current Tool Inventory (17 Total)
**Conversion Tools (2):**
- `convert_pdf` - PDF to Markdown with dual engine support
- `check_dependency` - Verify/install pymupdf4llm

**Document Organization Tools (10 - DEPRECATED):**
- `document_organizer__discover_pdfs`
- `document_organizer__check_conversions`
- `document_organizer__convert_missing`
- `document_organizer__analyze_content`
- `document_organizer__organize_structure`
- `document_organizer__full_workflow`
- `document_organizer__init_project_docs`
- `document_organizer__archive_plan`
- `document_organizer__validate_doc_structure`
- `document_organizer__create_weekly_handoff`

### Known Issues ❌
1. **Timeout Issue** - `check_dependency` can hit 30s MCP timeout
   - Root cause: Synchronous Python process spawn without explicit timeout
   - Impact: Blocks MCP requests during dependency checks
   - Workaround: None currently
   - Fix planned: See FEATURE_BACKLOG.md #6

2. **No Markdown → PDF Conversion** - Currently one-way conversion only

3. **Limited Format Support** - Only PDF→Markdown implemented

## Upcoming Major Refactor 🚧

### Strategic Direction Change
**FROM:** Document organization + conversion + project documentation
**TO:** Best-in-class file conversion **ONLY**

### Rename Plan
- **Old Name:** `document-organizer-mcp`
- **New Name:** `file-converter-mcp`
- **Rationale:** Focus on core competency (conversion), remove scope creep

### Scope Reduction
**Removing:**
- All document organization tools (10 tools)
- Universal Project Documentation Standard tools (moved to separate MCP)

**Keeping & Enhancing:**
- Core conversion tools (2 tools → expanding to 6+)
- Adding Pandoc for bidirectional conversion
- Adding LibreOffice for Office document support

**See:** [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md) for complete refactor plan

## Component Status Matrix

| Component | Implementation | Testing | Documentation | Status |
|-----------|---------------|---------|---------------|--------|
| PDF→MD (Marker) | ✅ Complete | 🟡 Basic | ✅ Complete | 100% |
| PDF→MD (pymupdf4llm) | ✅ Complete | 🟡 Basic | ✅ Complete | 100% |
| Dependency Checks | ⚠️ Timeout Issues | ❌ None | ✅ Complete | 70% |
| Document Discovery | ✅ Complete | ❌ None | ✅ Complete | 100% |
| Document Organization | ✅ Complete | ❌ None | ✅ Complete | 100% |
| Project Doc Standard | ✅ Complete | ❌ None | ✅ Complete | 100% |
| **Pandoc Integration** | ❌ Backlog | ❌ None | 📋 Planned | 0% |
| **Format Expansion** | ❌ Backlog | ❌ None | 📋 Planned | 0% |

## Recent Key Decisions

- **2025-09-30:** Audit revealed timeout issues in dependency checking
- **2025-09-30:** Decision to refactor into conversion-focused MCP
- **2025-09-30:** Created feature backlog for refactor roadmap
- **2025-09-30:** Identified Pandoc + Marker as optimal conversion stack

## Next Priority Actions

### Immediate (This Week)
1. Review and approve FEATURE_BACKLOG.md refactor plan
2. Decide on migration timeline for organization tools
3. Begin Pandoc integration research/prototyping

### Short-term (Next 2 Weeks)
1. Implement timeout fixes for dependency checking
2. Add Pandoc integration for Markdown→PDF
3. Create conversion quality benchmarking suite
4. Plan rename from `document-organizer` → `file-converter`

### Medium-term (Next Month)
1. Add LibreOffice integration for Office documents
2. Implement conversion engine selection logic
3. Remove deprecated organization tools
4. Update all documentation for new scope

## Development Environment

**Dependencies:**
- Node.js 18+
- TypeScript 5.0+
- Python 3 (for marker, pymupdf4llm)
- marker-pdf (`pip install marker-pdf`)
- pymupdf4llm (`pip install pymupdf4llm`)

**Planned Additions:**
- Pandoc (`apt install pandoc`)
- WeasyPrint (`pip install weasyprint`)
- LibreOffice (`apt install libreoffice`)

**Build & Test:**
```bash
npm install
npm run build
npm start

# Test MCP directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Integration Status

**Currently Integrated With:**
- metaMCP-RAG server (RAG-based tool discovery)
- Claude Code (via MCP protocol)

**Future Integrations:**
- Will need config updates after rename to `file-converter`
- Consider standalone CLI version for batch operations

## Performance Metrics

**Current Performance:**
- Marker conversion: ~2-5 seconds per page
- pymupdf4llm: ~1-2 seconds per page
- Dependency check: 2-30 seconds (timeout issue)

**Target Performance (Post-Refactor):**
- Pandoc MD→PDF: <1 second per page
- Batch operations: Parallel processing support
- Dependency checks: <100ms (cached results)

## Documentation Status

- ✅ README.md - Comprehensive user guide
- ✅ CURRENT_STATUS.md - This file
- ✅ FEATURE_BACKLOG.md - Refactor roadmap
- ❌ ACTIVE_PLAN.md - Needed for refactor execution
- ❌ .claude-instructions.md - Project-specific guidelines
- ❌ API documentation - Tool schemas only

## Blockers & Dependencies

**No Current Blockers**

**External Dependencies:**
- Marker project maintenance (GitHub: datalab-to/marker)
- Pandoc development (stable, mature project)
- LibreOffice headless mode stability

---

**Remember:** This MCP is undergoing strategic refocusing. Current functionality remains stable, but significant changes are planned. See FEATURE_BACKLOG.md for details.
