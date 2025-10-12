# Project CLAUDE.md

## ═══════════════════════════════════════════════════════
## GLOBAL CONFIGURATION (Auto-Inherited - Do Not Edit Here)
## ═══════════════════════════════════════════════════════
## These are imported from ~/.claude/config/*
## To update global behavior, edit those files directly
## Changes will automatically apply to all projects using this template
##
## NOTE: Using tilde paths (~/.claude/...) works across all project locations
## Alternative formats: relative (@../../../.claude/...) or absolute (@/home/user/...)

@~/.claude/config/intellectual-honesty.md
@~/.claude/config/verification-protocols.md
@~/.claude/config/file-organization.md
@~/.claude/config/backup-systems.md
@~/.claude/config/mcp-discovery-protocol.md

## ═══════════════════════════════════════════════════════
## PROJECT-SPECIFIC CONFIGURATION
## ═══════════════════════════════════════════════════════
## Edit below this line for project-specific instructions

## Project Context
- **Name:** File Converter MCP
- **Type:** MCP Server
- **Status:** Active
- **Tech Stack:** TypeScript, MCP SDK
- **Repository:** [Git repo URL if applicable]

## 🚨 MANDATORY READING ORDER 🚨
Before starting ANY development work, Claude MUST read these files in order:

1. **CURRENT_STATUS.md** - Current reality and what's actually done
2. **ACTIVE_PLAN.md** - What we're currently executing (if exists)
3. Only then reference other documentation for context

## Project-Specific Guidelines

### Directory Structure
**Directory Tree:** Use `.directory_tree.txt` in project root for complete structure
**NEVER regenerate directory tree** - read existing file to save context tokens

### MCP Server Purpose
Document conversion (PDF to markdown, etc.) via MCP.

### Development Workflow
[Add project-specific development workflow here]

### Testing Requirements
[Add project-specific testing requirements here]

## Architecture Overview
MCP server for file format conversion and document processing.

## External Dependencies
- PDF processing libraries
- MCP SDK

## Common Tasks
[Add frequently used commands, scripts, or procedures]

## Known Issues / Gotchas
[Document any quirks, workarounds, or things to watch out for]
