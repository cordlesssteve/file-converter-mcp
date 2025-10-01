#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
const DiscoverPdfsArgsSchema = z.object({
  directory_path: z.string().describe("Path to directory to scan for PDF files"),
  recursive: z.boolean().optional().default(true).describe("Search subdirectories recursively")
});

const ConvertPdfArgsSchema = z.object({
  pdf_path: z.string().describe("Absolute path to the PDF file to convert"),
  output_path: z.string().optional().describe("Optional path to write markdown output. If not provided, returns content directly"),
  options: z.object({
    engine: z.enum(["pymupdf4llm", "marker"]).optional().default("marker").describe("PDF conversion engine (marker recommended for complex documents)"),
    page_chunks: z.boolean().optional().default(false).describe("Process as individual pages for memory efficiency (pymupdf4llm only)"),
    write_images: z.boolean().optional().default(false).describe("Extract embedded images to files"),
    image_path: z.string().optional().describe("Directory for extracted images (requires write_images: true)"),
    table_strategy: z.enum(["fast", "accurate"]).optional().default("accurate").describe("Table extraction strategy (pymupdf4llm only)"),
    extract_content: z.enum(["text", "figures", "both"]).optional().default("both").describe("Content to extract from PDF (pymupdf4llm only)"),
    auto_clean: z.boolean().optional().default(true).describe("Automatically clean marker formatting artifacts")
  }).optional().default({})
});

const CheckDependencyArgsSchema = z.object({
  install_if_missing: z.boolean().optional().default(false).describe("Attempt to install pymupdf4llm if not found")
});

const CheckConversionsArgsSchema = z.object({
  directory_path: z.string().describe("Path to directory containing PDF files"),
  pdf_files: z.array(z.string()).optional().describe("Specific PDF files to check (if not provided, discovers all)")
});

const ConvertMissingArgsSchema = z.object({
  directory_path: z.string().describe("Path to directory containing PDFs to convert"),
  pdf_files: z.array(z.string()).optional().describe("Specific PDF files to convert (if not provided, converts all missing)")
});

const AnalyzeContentArgsSchema = z.object({
  directory_path: z.string().describe("Path to directory containing markdown files"),
  md_files: z.array(z.string()).optional().describe("Specific MD files to analyze (if not provided, analyzes all)")
});

const OrganizeStructureArgsSchema = z.object({
  directory_path: z.string().describe("Path to directory to organize"),
  categories: z.record(z.array(z.string())).describe("Categories with their associated file patterns/names"),
  create_pdf_md_subfolders: z.boolean().optional().default(true).describe("Create PDFs and MDs subfolders in each category")
});

const FullWorkflowArgsSchema = z.object({
  directory_path: z.string().describe("Path to directory to organize completely"),
  analyze_content: z.boolean().optional().default(true).describe("Analyze content for categorization")
});

// New Documentation Standard schemas
const InitProjectDocsArgsSchema = z.object({
  directory_path: z.string().describe("Path to project directory to initialize with documentation standard"),
  project_name: z.string().describe("Name of the project for templates"),
  project_type: z.string().optional().describe("Type of project (e.g., 'web-app', 'api', 'library')")
});

const ArchivePlanArgsSchema = z.object({
  plan_path: z.string().describe("Path to the plan file to archive"),
  reason: z.string().describe("Reason for archiving this plan"),
  new_status: z.enum(["ARCHIVED", "SUPERSEDED"]).optional().default("ARCHIVED").describe("Status to set when archiving")
});

const ValidateDocStructureArgsSchema = z.object({
  directory_path: z.string().describe("Path to project directory to validate")
});

const CreateWeeklyHandoffArgsSchema = z.object({
  project_path: z.string().describe("Path to project directory"),
  completed_items: z.array(z.string()).optional().describe("Items completed this week"),
  key_decisions: z.array(z.string()).optional().describe("Key decisions made this week")
});

// Documentation Standard interfaces
interface ValidationResult {
  valid: boolean;
  missing_files: string[];
  issues: string[];
  suggestions: string[];
}

interface ProjectTemplate {
  current_status: string;
  active_plan: string;
  claude_instructions: string;
}

// Types and interfaces
interface ConversionResult {
  success: boolean;
  markdown_content?: string;
  output_file?: string;
  page_count: number;
  char_count: number;
  images_extracted: number;
  processing_time: number;
  memory_used: number;
  warnings: string[];
  error?: string;
}

// Utility functions
function validatePath(filePath: string): string {
  const expandedPath = filePath.startsWith('~/') 
    ? path.join(os.homedir(), filePath.slice(2))
    : filePath;
  
  const absolutePath = path.isAbsolute(expandedPath) 
    ? expandedPath 
    : path.resolve(process.cwd(), expandedPath);
  
  return absolutePath;
}

async function checkPymupdf4llm(): Promise<{ available: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', ['-c', 'import pymupdf4llm; print(pymupdf4llm.__version__)'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({
          available: true,
          version: stdout.trim()
        });
      } else {
        resolve({
          available: false,
          error: stderr.trim() || 'pymupdf4llm not found'
        });
      }
    });

    pythonProcess.on('error', (error: Error) => {
      resolve({
        available: false,
        error: error.message
      });
    });
  });
}

async function checkMarker(): Promise<{ available: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    const markerProcess = spawn('marker_single', ['--help'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    markerProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    markerProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    markerProcess.on('close', (code: number | null) => {
      if (code === 0 || stdout.includes('usage:') || stdout.includes('marker_single')) {
        resolve({
          available: true,
          version: 'available'
        });
      } else {
        resolve({
          available: false,
          error: stderr.trim() || 'marker not found'
        });
      }
    });

    markerProcess.on('error', (error: Error) => {
      resolve({
        available: false,
        error: error.message
      });
    });
  });
}

function cleanMarkerOutput(markdownContent: string): string {
  if (!markdownContent || typeof markdownContent !== 'string') {
    return markdownContent;
  }

  // Improved table-aware cleaning that preserves structure
  return improvedCleanMarkerOutput(markdownContent);
}

function improvedCleanMarkerOutput(text: string): string {
  // Step 1: Identify and protect table regions
  const lines = text.split('\n');
  const tableRegions: Array<[number, number]> = [];
  let inTable = false;
  let currentTableStart: number | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = (line.match(/\|/g) || []).length >= 2;
    
    if (isTableLine && !inTable) {
      inTable = true;
      currentTableStart = i;
    } else if (!isTableLine && inTable) {
      inTable = false;
      if (currentTableStart !== null) {
        tableRegions.push([currentTableStart, i - 1]);
        currentTableStart = null;
      }
    }
  }
  
  // Handle table that goes to end of document
  if (inTable && currentTableStart !== null) {
    tableRegions.push([currentTableStart, lines.length - 1]);
  }
  
  // Step 2: Clean and format lines based on whether they're in table regions
  const cleanedLines: string[] = [];
  let processedLines = 0;
  
  for (const [tableStart, tableEnd] of tableRegions) {
    // Add non-table lines before this table
    for (let i = processedLines; i < tableStart; i++) {
      cleanedLines.push(cleanRegularLine(lines[i]));
    }
    
    // Process table region
    const tableLines = [];
    for (let i = tableStart; i <= tableEnd; i++) {
      tableLines.push(cleanTableLine(lines[i]));
    }
    
    // Format the entire table for better readability
    const formattedTable = formatTableRegion(tableLines);
    cleanedLines.push(...formattedTable);
    
    processedLines = tableEnd + 1;
  }
  
  // Add remaining non-table lines
  for (let i = processedLines; i < lines.length; i++) {
    cleanedLines.push(cleanRegularLine(lines[i]));
  }
  
  // Step 3: Apply global cleanups
  let result = cleanedLines.join('\n');
  result = applyGlobalCleanups(result);
  
  return result.trim();
}

function cleanTableLine(line: string): string {
  // Conservative cleaning for table lines - preserve structure
  
  // Only do minimal cleaning - preserve the table structure completely
  // Just clean <br> tags and basic HTML within cells
  
  // Fix locations with <br> but keep within same table cell
  line = line.replace(/([A-Za-z\s]+),\s*<br>\s*([A-Za-z\s]+)/g, '$1, $2');
  
  // Replace <br> with space 
  line = line.replace(/<br\s*\/?>/g, ' ');
  
  // Remove HTML tags but preserve content
  line = line.replace(/<u>([^<>]*)<\/u>/g, '$1');
  line = line.replace(/<\/?em>/g, '');
  line = line.replace(/<\/?strong>/g, '');
  
  // Clean up excessive whitespace but preserve table structure
  line = line.replace(/\s+/g, ' ');
  line = line.replace(/\s*\|\s*/g, ' | ');
  
  return line.trim();
}

function formatTableRegion(tableLines: string[]): string[] {
  if (tableLines.length < 2) return tableLines;
  
  // Parse all table rows into cell arrays, skipping existing separator rows
  const rows: string[][] = [];
  
  for (const line of tableLines) {
    if (line.trim() && !line.match(/^\s*\|[\s\-\|]*\|\s*$/)) {
      // Split by | and clean each cell
      const cells = line.split('|')
        .map(cell => cell.trim())
        .filter((cell, index, arr) => {
          // Remove empty first/last cells that come from leading/trailing |
          return !(cell === '' && (index === 0 || index === arr.length - 1));
        });
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
  }
  
  if (rows.length === 0) return tableLines;
  
  // Calculate optimal column widths with smart sizing
  const maxColumns = Math.max(...rows.map(row => row.length));
  const columnWidths: number[] = [];
  
  for (let col = 0; col < maxColumns; col++) {
    let maxWidth = 8; // Minimum column width
    const cellLengths: number[] = [];
    
    // Collect all cell lengths for this column
    for (const row of rows) {
      if (row[col]) {
        cellLengths.push(row[col].length);
      }
    }
    
    if (cellLengths.length > 0) {
      // Use a more intelligent width calculation
      const avgLength = cellLengths.reduce((a, b) => a + b, 0) / cellLengths.length;
      const maxLength = Math.max(...cellLengths);
      
      if (maxLength <= 25) {
        // Short columns: use actual max length
        maxWidth = Math.max(maxLength, 8);
      } else if (maxLength <= 60) {
        // Medium columns: use 80% of max or average + 10, whichever is smaller
        maxWidth = Math.min(Math.floor(maxLength * 0.8), avgLength + 10);
        maxWidth = Math.max(maxWidth, 15);
      } else {
        // Very long columns: cap at 50 characters
        maxWidth = Math.min(50, Math.max(30, avgLength));
      }
    }
    
    columnWidths.push(maxWidth);
  }
  
  // Format each row with consistent column widths
  const formattedLines: string[] = [];
  
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const formattedCells: string[] = [];
    
    for (let col = 0; col < maxColumns; col++) {
      const cell = row[col] || '';
      const width = columnWidths[col];
      
      if (cell.length <= width) {
        // Pad short cells
        formattedCells.push(cell.padEnd(width));
      } else {
        // For long cells, intelligently truncate
        let truncated: string;
        if (cell.length > width) {
          // Try to break at word boundaries
          const words = cell.split(' ');
          let result = '';
          
          for (const word of words) {
            if ((result + word).length <= width - 3) {
              result += (result ? ' ' : '') + word;
            } else {
              break;
            }
          }
          
          if (result.length === 0) {
            // If even the first word is too long, just truncate
            result = cell.substring(0, width - 3);
          }
          
          truncated = (result + '...').padEnd(width);
        } else {
          truncated = cell.padEnd(width);
        }
        
        formattedCells.push(truncated);
      }
    }
    
    formattedLines.push('| ' + formattedCells.join(' | ') + ' |');
    
    // Add separator after header row (first row)
    if (rowIndex === 0) {
      const separatorCells = columnWidths.map(width => '-'.repeat(width));
      formattedLines.push('| ' + separatorCells.join(' | ') + ' |');
    }
  }
  
  return formattedLines;
}

function cleanRegularLine(line: string): string {
  // More aggressive cleaning for non-table content
  
  // Replace <br> with spaces
  line = line.replace(/<br\s*\/?>/g, ' ');
  
  // Remove HTML tags
  line = line.replace(/<u>([^<>]*)<\/u>/g, '$1');
  line = line.replace(/<\/?em>/g, '');
  line = line.replace(/<\/?strong>/g, '');
  
  // Fix location names
  line = line.replace(/([A-Za-z\s]+),\s*([A-Za-z\s]+)/g, '$1, $2');
  
  // Remove orphaned footnote numbers (conservative)
  line = line.replace(/(?<=\s)\d{1,2}(?=\s+[A-Z][a-z])/g, '');
  
  // Clean whitespace
  line = line.replace(/\s+/g, ' ');
  
  return line.trim();
}

function applyGlobalCleanups(text: string): string {
  // Fix paragraph spacing
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  // Remove empty headers
  text = text.replace(/^#+\s*$/gm, '');
  
  // Clean up broken URLs
  text = text.replace(/(https?:\/\/[^\s<>]+)<br>([^\s<>]+)/g, '$1$2');
  
  return text;
}

async function installPymupdf4llm(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const installProcess = spawn('pip', ['install', 'pymupdf4llm'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    installProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    installProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: stderr.trim() || 'Installation failed'
        });
      }
    });

    installProcess.on('error', (error: Error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
  });
}

async function convertPdfToMarkdown(
  pdfPath: string,
  outputPath?: string,
  options: {
    engine?: "pymupdf4llm" | "marker";
    page_chunks?: boolean;
    write_images?: boolean;
    image_path?: string;
    table_strategy?: "fast" | "accurate";
    extract_content?: "text" | "figures" | "both";
    auto_clean?: boolean;
  } = {}
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  try {
    // Validate PDF exists
    const validatedPdfPath = validatePath(pdfPath);
    await fs.access(validatedPdfPath);
    
    // Determine which engine to use
    const engine = options.engine || "marker";
    
    if (engine === "marker") {
      return await convertWithMarker(validatedPdfPath, outputPath, options);
    } else {
      return await convertWithPymupdf4llm(validatedPdfPath, outputPath, options);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      page_count: 0,
      char_count: 0,
      images_extracted: 0,
      processing_time: Date.now() - startTime,
      memory_used: 0,
      warnings: []
    };
  }
}

async function convertWithMarker(
  pdfPath: string,
  outputPath?: string,
  options: { auto_clean?: boolean } = {}
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  try {
    // Check if marker is available
    const markerCheck = await checkMarker();
    if (!markerCheck.available) {
      throw new Error(`Marker not available: ${markerCheck.error}`);
    }
    
    // Create temporary output directory for marker
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marker-'));
    
    // Run marker conversion with correct syntax
    const result = await new Promise<{ success: boolean; content?: string; error?: string }>((resolve) => {
      const markerProcess = spawn('marker_single', [pdfPath, '--output_dir', tempDir], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      markerProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      markerProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      markerProcess.on('close', async (code: number | null) => {
        try {
          if (code === 0) {
            // Find the markdown file that marker created
            // Marker creates a directory with PDF basename, then puts .md file inside
            const pdfBaseName = path.basename(pdfPath, '.pdf');
            const markerDir = path.join(tempDir, pdfBaseName);
            const expectedOutput = path.join(markerDir, `${pdfBaseName}.md`);
            
            // Check if the expected structure exists
            let outputFile = expectedOutput;
            try {
              await fs.access(expectedOutput);
            } catch {
              // Look for marker directory and .md file inside it
              try {
                const tempFiles = await fs.readdir(tempDir, { withFileTypes: true });
                const markerDirEntry = tempFiles.find(entry => entry.isDirectory());
                
                if (markerDirEntry) {
                  const dirPath = path.join(tempDir, markerDirEntry.name);
                  const dirFiles = await fs.readdir(dirPath);
                  const mdFile = dirFiles.find(file => file.endsWith('.md'));
                  if (mdFile) {
                    outputFile = path.join(dirPath, mdFile);
                  } else {
                    resolve({ success: false, error: 'No markdown file found in marker directory' });
                    return;
                  }
                } else {
                  resolve({ success: false, error: 'No marker output directory found' });
                  return;
                }
              } catch {
                resolve({ success: false, error: 'Failed to find marker output' });
                return;
              }
            }
            
            // Read the converted content
            const content = await fs.readFile(outputFile, 'utf-8');
            resolve({ success: true, content });
          } else {
            resolve({ success: false, error: stderr || `Marker exited with code ${code}` });
          }
        } catch (readError) {
          resolve({ success: false, error: `Failed to read marker output: ${readError}` });
        } finally {
          // Clean up temp directory
          try {
            await fs.rm(tempDir, { recursive: true });
          } catch {}
        }
      });

      markerProcess.on('error', (error: Error) => {
        resolve({ success: false, error: error.message });
      });
    });

    if (!result.success || !result.content) {
      throw new Error(result.error || 'Marker conversion failed');
    }
    
    // Apply cleaning if enabled (default: true)
    let finalContent = result.content;
    if (options.auto_clean !== false) {
      finalContent = cleanMarkerOutput(result.content);
    }
    
    // Write to output file if specified
    if (outputPath) {
      await fs.writeFile(outputPath, finalContent, 'utf-8');
    }
    
    // Calculate statistics
    const charCount = finalContent.length;
    const pageCount = Math.max(1, Math.floor(charCount / 3000)); // Rough estimate
    
    return {
      success: true,
      markdown_content: finalContent,
      output_file: outputPath,
      page_count: pageCount,
      char_count: charCount,
      images_extracted: 0, // Marker doesn't extract images to separate files
      processing_time: Date.now() - startTime,
      memory_used: 0, // Would need process monitoring
      warnings: options.auto_clean !== false ? ['Content automatically cleaned (table-aware)'] : []
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      page_count: 0,
      char_count: 0,
      images_extracted: 0,
      processing_time: Date.now() - startTime,
      memory_used: 0,
      warnings: []
    };
  }
}

async function convertWithPymupdf4llm(
  pdfPath: string,
  outputPath?: string,
  options: {
    page_chunks?: boolean;
    write_images?: boolean;
    image_path?: string;
    table_strategy?: "fast" | "accurate";
    extract_content?: "text" | "figures" | "both";
  } = {}
): Promise<ConversionResult> {
  const startTime = Date.now();
  
  try {
    // Validate PDF exists
    const validatedPdfPath = validatePath(pdfPath);
    await fs.access(validatedPdfPath);
    
    // Build Python conversion script for pymupdf4llm
    const pythonScript = `
import pymupdf4llm
import json
import sys
import os
import gc
import psutil

def get_memory_usage():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024  # MB

# Get initial memory
initial_memory = get_memory_usage()

try:
    # Set up conversion options
    kwargs = {}
    ${options.page_chunks ? "kwargs['page_chunks'] = True" : ""}
    ${options.write_images ? "kwargs['write_images'] = True" : ""}
    ${options.image_path ? `kwargs['image_path'] = "${options.image_path}"` : ""}
    
    # Convert PDF to markdown
    pdf_path = "${validatedPdfPath.replace(/\\/g, '\\\\\\\\')}"
    md_content = pymupdf4llm.to_markdown(pdf_path, **kwargs)
    
    # Get memory usage after conversion
    peak_memory = get_memory_usage()
    
    # Calculate statistics
    char_count = len(md_content)
    page_count = 0  # pymupdf4llm doesn't directly expose page count
    images_extracted = 0  # Would need to count files in image_path if provided
    
    # Estimate page count from content (rough heuristic)
    if isinstance(md_content, list):
        page_count = len(md_content)
        md_content = "\\n\\n---\\n\\n".join(md_content)
    else:
        # Estimate based on typical PDF page length
        page_count = max(1, char_count // 3000)
    
    # Count extracted images if image_path was provided
    ${options.write_images && options.image_path ? `
    if os.path.exists("${options.image_path}"):
        images_extracted = len([f for f in os.listdir("${options.image_path}") if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))])
    ` : ""}
    
    result = {
        "success": True,
        "markdown_content": md_content,
        "page_count": page_count,
        "char_count": char_count,
        "images_extracted": images_extracted,
        "memory_used": peak_memory - initial_memory,
        "warnings": []
    }
    
    # Write to file if output_path provided
    ${outputPath ? `
    output_path = "${validatePath(outputPath).replace(/\\/g, '\\\\\\\\')}"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
    result["output_file"] = output_path
    ` : ""}
    
    print(json.dumps(result))
    
except Exception as e:
    result = {
        "success": False,
        "error": str(e),
        "page_count": 0,
        "char_count": 0,
        "images_extracted": 0,
        "memory_used": get_memory_usage() - initial_memory,
        "warnings": []
    }
    print(json.dumps(result))
    sys.exit(1)
`;

    // Execute conversion
    const result = await new Promise<ConversionResult>((resolve, reject) => {
      const pythonProcess = spawn('python3', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code: number | null) => {
        try {
          const result = JSON.parse(stdout.trim()) as ConversionResult;
          result.processing_time = Date.now() - startTime;
          
          if (stderr.trim()) {
            result.warnings.push(stderr.trim());
          }
          
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse conversion result: ${parseError}, stdout: ${stdout}, stderr: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error: Error) => {
        reject(error);
      });
    });

    return result;

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      page_count: 0,
      char_count: 0,
      images_extracted: 0,
      processing_time: Date.now() - startTime,
      memory_used: 0,
      warnings: []
    };
  }
}

async function findPdfFiles(dirPath: string, recursive: boolean = true): Promise<string[]> {
  const pdfFiles: string[] = [];
  
  async function scanDirectory(currentPath: string) {
    try {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        
        if (item.isFile() && path.extname(item.name).toLowerCase() === '.pdf') {
          pdfFiles.push(fullPath);
        } else if (item.isDirectory() && recursive) {
          await scanDirectory(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentPath}:`, error);
    }
  }
  
  await scanDirectory(dirPath);
  return pdfFiles;
}

async function checkMdExists(pdfPath: string): Promise<boolean> {
  const dir = path.dirname(pdfPath);
  const basename = path.basename(pdfPath, '.pdf');
  
  // Check various possible MD naming patterns
  const possibleMdPaths = [
    path.join(dir, `${basename}.md`),
    path.join(dir, `${basename.replace(/\s+/g, '_')}.md`),
    path.join(dir, `${basename.replace(/[^a-zA-Z0-9]/g, '_')}.md`)
  ];
  
  for (const mdPath of possibleMdPaths) {
    try {
      await fs.access(mdPath);
      return true;
    } catch {
      // File doesn't exist, continue checking
    }
  }
  
  return false;
}

async function convertPdfToMd(pdfPath: string): Promise<{ success: boolean; mdPath?: string; error?: string }> {
  const dir = path.dirname(pdfPath);
  const basename = path.basename(pdfPath, '.pdf');
  const mdPath = path.join(dir, `${basename.replace(/[^a-zA-Z0-9]/g, '_')}.md`);
  
  try {
    // Use marker by default for better quality
    const result = await convertPdfToMarkdown(pdfPath, mdPath, { engine: "marker", auto_clean: true });
    if (result.success) {
      return { success: true, mdPath: result.output_file || mdPath };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Documentation Standard utility functions
function generateCurrentStatusTemplate(projectName: string, projectType?: string): string {
  const currentDate = new Date().toISOString().split('T')[0];
  return `# ${projectName} - Current Project Status
**Last Updated:** ${currentDate}  
**Active Plan:** [ACTIVE_PLAN.md](./ACTIVE_PLAN.md)  
**Current Branch:** main  
**Project Focus:** ${projectType || 'Development project'}  

## What's Actually Done ✅
- [ ] Initial project setup

## In Progress 🟡
- [ ] Document project requirements
- [ ] Set up development environment

## Blocked/Issues ❌
- [ ] No current blockers identified

## Next Priority Actions
1. Define project scope and requirements
2. Set up development environment
3. Create initial architecture

## Component/Feature Status Matrix
| Component | Design | Backend | Frontend | Testing | Status |
|-----------|--------|---------|----------|---------|--------|
| Core Setup | 🟡 | ❌ | ❌ | ❌ | 25% Complete |

## Recent Key Decisions
- **${currentDate}:** Implemented Universal Project Documentation Standard

## Development Environment Status
- **Development Setup:** 🟡 In Progress
`;
}

function generateActivePlanTemplate(projectName: string): string {
  const currentDate = new Date().toISOString().split('T')[0];
  return `# ${projectName} Active Development Plan
**Status:** ACTIVE  
**Created:** ${currentDate}  
**Last Updated:** ${currentDate}  
**Supersedes:** N/A (Initial plan)  

## Current Focus: Initial Project Setup

## Immediate Priorities (Next 1-2 Weeks)

### 1. Project Foundation (High Priority)
**Status:** 0% Complete  
**Remaining Work:**
- [ ] Define project scope and objectives
- [ ] Set up development environment
- [ ] Create initial architecture documentation
- [ ] Establish development workflow

**Files to Work On:**
- \`README.md\` - Project overview and setup instructions
- \`.gitignore\` - Version control configuration
- \`package.json\` or equivalent - Project dependencies

### 2. Documentation Setup (Medium Priority)
**Status:** 50% Complete  
**Remaining Work:**
- [ ] Complete project documentation structure
- [ ] Create development guidelines
- [ ] Set up automated documentation

## Success Criteria
- [ ] Development environment is fully functional
- [ ] Project structure is established
- [ ] Initial documentation is complete
- [ ] Development workflow is defined

## Weekly Milestones
### Week 1 (${currentDate})
- [ ] Complete project setup
- [ ] Establish documentation standard
- [ ] Define initial architecture

## Risk Mitigation
### High-Risk Items
1. **Scope Creep:** Project requirements may expand
   - *Mitigation:* Define clear boundaries and priorities
   - *Fallback:* Phase development approach

## Contact Points
### Immediate Next Actions (This Week)
1. **Priority 1:** Define project scope and requirements
2. **Priority 2:** Set up development environment
3. **Priority 3:** Create initial architecture documentation
`;
}

function generateClaudeInstructionsTemplate(projectName: string, projectType?: string): string {
  return `# ${projectName} Documentation Instructions

## 🚨 MANDATORY READING ORDER 🚨
Before starting ANY development work, Claude MUST read these files in order:

1. **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - Current reality and what's actually done
2. **[ACTIVE_PLAN.md](./ACTIVE_PLAN.md)** - What we're currently executing
3. Only then reference other documentation for context

## Project Context
- **Platform:** ${projectType || 'Development project'}
- **Current Version:** v0.1.0 (0% complete)
- **Active Branch:** main
- **Focus:** Initial project setup and planning

## Documentation Rules

### Plan Status Indicators - ALWAYS CHECK THESE
- **ACTIVE**: Currently executing - use this plan
- **ARCHIVED**: Completed/historical - reference only
- **SUPERSEDED**: Replaced by newer plan - ignore unless needed for context
- **BLOCKED**: Waiting for external input - cannot proceed

### When Plans Change
1. Move old plan to \`./docs/plans/archived/\`
2. Update status header to "SUPERSEDED" or "ARCHIVED"
3. Create new versioned plan with clear "ACTIVE" status
4. Update CURRENT_STATUS.md with latest reality
5. Log the change in weekly progress

### Weekly Context Handoff Protocol
Every Friday session should end with:
1. Update CURRENT_STATUS.md with actual progress
2. Archive any completed plans
3. Update component status matrix
4. Log key decisions made this week

### Red Flags 🚨
**STOP and ask for clarification if you see:**
- Multiple plans marked as "ACTIVE"
- Conflicting information between CURRENT_STATUS.md and ACTIVE_PLAN.md
- Plans that haven't been updated in >1 week
- Missing status headers on planning documents

## Project-Specific Guidelines

### Development Workflow
- Follow established coding standards for the project type
- Maintain comprehensive testing coverage
- Document architectural decisions
- Use semantic versioning for releases

### Quality Standards
- Code must be reviewed before merging
- All features require documentation
- Performance benchmarks must be maintained
- Security considerations must be documented

## File Structure Reference
\`\`\`
/CURRENT_STATUS.md          ← START HERE
/ACTIVE_PLAN.md             ← THEN HERE
/docs/plans/archived/       ← Historical plans
/docs/progress/YYYY-MM/     ← Weekly progress logs
\`\`\`

## Emergency Contacts
- **Technical Blockers:** Document in CURRENT_STATUS.md
- **Plan Confusion:** Update this file and create clear ACTIVE_PLAN.md

---

**Remember:** This documentation system is designed to prevent plan confusion and ensure every Claude Code session starts with accurate, current project information.
`;
}

async function validateDocumentationStructure(projectPath: string): Promise<ValidationResult> {
  const requiredFiles = [
    'CURRENT_STATUS.md',
    'ACTIVE_PLAN.md', 
    '.claude-instructions.md'
  ];
  
  const requiredDirs = [
    'docs',
    'docs/plans',
    'docs/plans/archived',
    'docs/plans/superseded', 
    'docs/progress'
  ];

  const missingFiles: string[] = [];
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(projectPath, file);
    try {
      await fs.access(filePath);
      
      // Check file content for status headers if it's a plan
      if (file === 'ACTIVE_PLAN.md') {
        const content = await fs.readFile(filePath, 'utf-8');
        if (!content.includes('**Status:**')) {
          issues.push(`${file} missing required status header`);
        }
        if (content.includes('**Status:** ARCHIVED') || content.includes('**Status:** SUPERSEDED')) {
          issues.push(`ACTIVE_PLAN.md has non-ACTIVE status`);
        }
      }
    } catch {
      missingFiles.push(file);
    }
  }

  // Check required directories
  for (const dir of requiredDirs) {
    const dirPath = path.join(projectPath, dir);
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        issues.push(`${dir} exists but is not a directory`);
      }
    } catch {
      suggestions.push(`Create missing directory: ${dir}`);
    }
  }

  // Check for multiple ACTIVE plans
  try {
    const docsPath = path.join(projectPath, 'docs');
    const activePlans: string[] = [];
    
    async function findActivePlans(dir: string) {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isFile() && item.name.endsWith('.md')) {
            const content = await fs.readFile(fullPath, 'utf-8');
            if (content.includes('**Status:** ACTIVE')) {
              activePlans.push(fullPath);
            }
          } else if (item.isDirectory()) {
            await findActivePlans(fullPath);
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    }
    
    await findActivePlans(docsPath);
    
    if (activePlans.length > 1) {
      issues.push(`Multiple ACTIVE plans found: ${activePlans.join(', ')}`);
    }
  } catch {
    // docs directory doesn't exist
  }

  return {
    valid: missingFiles.length === 0 && issues.length === 0,
    missing_files: missingFiles,
    issues,
    suggestions
  };
}

async function createWeeklyHandoff(projectPath: string, completedItems: string[] = [], keyDecisions: string[] = []): Promise<void> {
  const currentDate = new Date().toISOString().split('T')[0];
  const yearMonth = currentDate.substring(0, 7); // YYYY-MM
  
  // Create progress directory if it doesn't exist
  const progressDir = path.join(projectPath, 'docs', 'progress', yearMonth);
  await fs.mkdir(progressDir, { recursive: true });
  
  // Create weekly progress file
  const weeklyFile = path.join(progressDir, `weekly-progress-${currentDate}.md`);
  const weeklyContent = `# Weekly Progress Report - ${currentDate}

## Completed This Week ✅
${completedItems.map(item => `- [x] ${item}`).join('\n') || '- No items completed'}

## Key Decisions Made 📋
${keyDecisions.map(decision => `- **${currentDate}:** ${decision}`).join('\n') || '- No key decisions recorded'}

## Next Week Priorities 🎯
- [ ] Update based on ACTIVE_PLAN.md priorities

## Blockers and Issues ❌
- None identified

## Notes
- Weekly handoff created via document-organizer MCP
`;
  
  await fs.writeFile(weeklyFile, weeklyContent, 'utf-8');
}

async function archivePlan(planPath: string, reason: string, newStatus: 'ARCHIVED' | 'SUPERSEDED' = 'ARCHIVED'): Promise<void> {
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Read current plan content
  const content = await fs.readFile(planPath, 'utf-8');
  
  // Update status header
  const updatedContent = content
    .replace(/\*\*Status:\*\*\s+ACTIVE/g, `**Status:** ${newStatus}`)
    .replace(/\*\*Last Updated:\*\*[^\n]*/g, `**Last Updated:** ${currentDate}`);
  
  // Add archival reason
  const archivedContent = `${updatedContent}\n\n---\n## Archival Information\n**Archived Date:** ${currentDate}  \n**Reason:** ${reason}  \n`;
  
  // Determine archive destination
  const projectRoot = planPath.includes('/docs/') ? 
    planPath.split('/docs/')[0] : 
    path.dirname(planPath);
    
  const archiveDir = path.join(projectRoot, 'docs', 'plans', newStatus.toLowerCase());
  await fs.mkdir(archiveDir, { recursive: true });
  
  const fileName = path.basename(planPath);
  const archivePath = path.join(archiveDir, fileName);
  
  // Write archived plan
  await fs.writeFile(archivePath, archivedContent, 'utf-8');
  
  // Remove original if it's not in root (don't remove ACTIVE_PLAN.md)
  if (path.basename(planPath) !== 'ACTIVE_PLAN.md') {
    await fs.unlink(planPath);
  }
}

async function analyzeMarkdownContent(mdPath: string): Promise<{ category: string; confidence: number; keywords: string[] }> {
  try {
    const content = await fs.readFile(mdPath, 'utf-8');
    const firstPart = content.slice(0, 2000).toLowerCase();
    
    // Simple categorization based on content analysis
    const categories = {
      'Research': ['analysis', 'research', 'study', 'investigation', 'findings', 'methodology'],
      'Planning': ['plan', 'strategy', 'roadmap', 'timeline', 'goals', 'objectives', 'discussion'],
      'Documentation': ['documentation', 'guide', 'manual', 'instructions', 'tutorial', 'reference'],
      'Technical': ['technical', 'implementation', 'architecture', 'design', 'specification', 'api'],
      'Business': ['business', 'market', 'competitive', 'revenue', 'commercial', 'strategy']
    };
    
    let bestCategory = 'General';
    let bestScore = 0;
    const foundKeywords: string[] = [];
    
    for (const [category, keywords] of Object.entries(categories)) {
      let score = 0;
      for (const keyword of keywords) {
        if (firstPart.includes(keyword)) {
          score++;
          foundKeywords.push(keyword);
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }
    
    const confidence = Math.min(bestScore / 3, 1.0); // Normalize to 0-1
    
    return {
      category: bestCategory,
      confidence,
      keywords: foundKeywords
    };
  } catch (error) {
    return {
      category: 'General',
      confidence: 0,
      keywords: []
    };
  }
}

// MCP Server setup
const server = new Server({
  name: 'file-converter',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Tool definitions
const tools = [
  {
    name: "convert_pdf",
    description: "Convert PDF files to Markdown format using marker (recommended) or pymupdf4llm. Marker provides superior quality for complex documents with tables and structured content, with automatic cleaning of formatting artifacts. Returns detailed conversion statistics including processing time and content metrics.",
    inputSchema: zodToJsonSchema(ConvertPdfArgsSchema) as ToolInput,
  },
  {
    name: "check_dependency",
    description: "Check if pymupdf4llm is available and optionally install it if missing. Returns version information and availability status. Use this before attempting PDF conversions.",
    inputSchema: zodToJsonSchema(CheckDependencyArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__discover_pdfs",
    description: "🔍 PDF FILE DISCOVERY - Recursively scan directory trees to locate all PDF files. Returns complete inventory with file paths, directory structure analysis, and scan statistics. Supports both recursive deep scanning and single-level directory inspection for comprehensive document discovery.",
    inputSchema: zodToJsonSchema(DiscoverPdfsArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__check_conversions", 
    description: "✅ CONVERSION STATUS AUDIT - Analyze PDF collection to determine which files already have companion Markdown files. Returns detailed conversion status matrix showing converted vs. unconverted documents, enabling targeted conversion workflows and avoiding duplicate processing.",
    inputSchema: zodToJsonSchema(CheckConversionsArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__convert_missing",
    description: "🔄 SELECTIVE PDF CONVERSION - Convert only PDFs that lack companion Markdown files using pymupdf4llm. Intelligently skips already-converted documents and provides detailed conversion reports with success/failure counts, processing statistics, and error diagnostics. Memory-efficient processing for large document collections.",
    inputSchema: zodToJsonSchema(ConvertMissingArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__analyze_content",
    description: "📊 INTELLIGENT DOCUMENT CATEGORIZATION - Analyze markdown files to automatically determine document categories using keyword-based content analysis. Scans document content and classifies into categories: Research, Planning, Documentation, Technical, Business, or General. Returns category assignments with confidence scores and detected keywords for organizational decision making.",
    inputSchema: zodToJsonSchema(AnalyzeContentArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__organize_structure",
    description: "🏗️ AUTOMATED FOLDER ORGANIZATION - Create hierarchical directory structure based on document categories and automatically move files to appropriate locations. Creates category-specific folders with optional PDF/MD subfolders, then relocates documents based on provided category mappings. Supports both flat and nested organization patterns for efficient document management.",
    inputSchema: zodToJsonSchema(OrganizeStructureArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__full_workflow",
    description: "🔄 COMPLETE DOCUMENT AUTOMATION - Execute end-to-end document organization pipeline: (1) Discover all PDFs recursively, (2) Check conversion status, (3) Convert missing PDFs to Markdown, (4) Analyze content for categorization, (5) Create organized folder structure. Returns detailed workflow progress with success/failure counts, processing statistics, and final organization summary. One-command solution for complete document management.",
    inputSchema: zodToJsonSchema(FullWorkflowArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__init_project_docs",
    description: "📋 INITIALIZE PROJECT DOCUMENTATION - Create Universal Project Documentation Standard structure with required files (CURRENT_STATUS.md, ACTIVE_PLAN.md, .claude-instructions.md) and directory structure. Generates templates customized for the specific project type and creates docs/plans/archived, docs/progress directories for proper documentation management.",
    inputSchema: zodToJsonSchema(InitProjectDocsArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__archive_plan",
    description: "📂 ARCHIVE DEVELOPMENT PLAN - Move a plan file to archived or superseded status with proper status header updates and archival tracking. Updates plan status, adds archival metadata, moves to appropriate docs/plans directory, and maintains complete audit trail of plan evolution.",
    inputSchema: zodToJsonSchema(ArchivePlanArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__validate_doc_structure",
    description: "✅ VALIDATE DOCUMENTATION STRUCTURE - Check project for compliance with Universal Project Documentation Standard. Verifies required files exist, validates status headers, detects multiple ACTIVE plans, and provides detailed compliance report with suggestions for fixing issues.",
    inputSchema: zodToJsonSchema(ValidateDocStructureArgsSchema) as ToolInput,
  },
  {
    name: "document_organizer__create_weekly_handoff",
    description: "📅 CREATE WEEKLY HANDOFF - Generate weekly progress report and update project status for session handoffs. Creates dated progress entries in docs/progress/YYYY-MM/ with completed items, key decisions, and next week priorities following the Universal Project Documentation Standard protocol.",
    inputSchema: zodToJsonSchema(CreateWeeklyHandoffArgsSchema) as ToolInput,
  },
];

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "convert_pdf": {
        const parsed = ConvertPdfArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for convert_pdf: ${parsed.error}`);
        }

        // Check appropriate dependency based on engine
        const engine = parsed.data.options?.engine || "marker";
        if (engine === "marker") {
          const markerCheck = await checkMarker();
          if (!markerCheck.available) {
            // Fallback to pymupdf4llm if marker not available
            const pymupdf4llmCheck = await checkPymupdf4llm();
            if (!pymupdf4llmCheck.available) {
              throw new Error(`Neither marker nor pymupdf4llm available. Marker: ${markerCheck.error}, pymupdf4llm: ${pymupdf4llmCheck.error}`);
            }
            parsed.data.options = { ...parsed.data.options, engine: "pymupdf4llm" };
          }
        } else {
          const depCheck = await checkPymupdf4llm();
          if (!depCheck.available) {
            throw new Error(`pymupdf4llm not available: ${depCheck.error}`);
          }
        }

        const result = await convertPdfToMarkdown(
          parsed.data.pdf_path,
          parsed.data.output_path,
          parsed.data.options
        );

        if (result.success) {
          const actualEngine = parsed.data.options?.engine || "marker";
          const summary = [
            `✅ PDF Conversion Successful (${actualEngine})`,
            `📄 Pages: ${result.page_count}`,
            `📝 Characters: ${result.char_count.toLocaleString()}`,
            `🖼️ Images extracted: ${result.images_extracted}`,
            `⏱️ Processing time: ${result.processing_time}ms`,
          ];
          
          if (result.memory_used > 0) {
            summary.push(`💾 Memory used: ${result.memory_used.toFixed(2)}MB`);
          }

          if (result.warnings.length > 0) {
            summary.push(`⚠️ Warnings: ${result.warnings.join('; ')}`);
          }

          if (result.output_file) {
            summary.push(`📁 Output file: ${result.output_file}`);
          }

          const response = summary.join('\n');
          
          // Include markdown content if no output file specified
          if (!result.output_file && result.markdown_content) {
            return {
              content: [
                { type: "text", text: response },
                { type: "text", text: "\n--- MARKDOWN CONTENT ---\n" + result.markdown_content }
              ],
            };
          }

          return {
            content: [{ type: "text", text: response }],
          };
        } else {
          throw new Error(result.error || "Conversion failed");
        }
      }

      case "check_dependency": {
        const parsed = CheckDependencyArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for check_dependency: ${parsed.error}`);
        }

        // Check both marker and pymupdf4llm
        const markerCheck = await checkMarker();
        const pymupdf4llmCheck = await checkPymupdf4llm();
        
        if (!pymupdf4llmCheck.available && parsed.data.install_if_missing) {
          const installResult = await installPymupdf4llm();
          if (installResult.success) {
            const recheckResult = await checkPymupdf4llm();
            const recheckMarker = await checkMarker();
            const status = [
              recheckResult.available
                ? `✅ pymupdf4llm successfully installed and available (version: ${recheckResult.version})`
                : `❌ Installation succeeded but pymupdf4llm still not available: ${recheckResult.error}`,
              recheckMarker.available
                ? `✅ marker available (${recheckMarker.version})`
                : `❌ marker not available: ${recheckMarker.error}`
            ].join('\n');
            
            return {
              content: [{ type: "text", text: status }],
            };
          } else {
            return {
              content: [{ type: "text", text: `❌ Failed to install pymupdf4llm: ${installResult.error}` }],
            };
          }
        }

        const status = [
          markerCheck.available
            ? `✅ marker available (${markerCheck.version}) - recommended`
            : `❌ marker not available: ${markerCheck.error}`,
          pymupdf4llmCheck.available
            ? `✅ pymupdf4llm available (version: ${pymupdf4llmCheck.version})`
            : `❌ pymupdf4llm not available: ${pymupdf4llmCheck.error}`
        ].join('\n');

        return {
          content: [{ type: "text", text: status }],
        };
      }

      case "document_organizer__discover_pdfs": {
        const { directory_path, recursive } = DiscoverPdfsArgsSchema.parse(args);
        const pdfFiles = await findPdfFiles(directory_path, recursive);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                found_pdfs: pdfFiles.length,
                pdf_files: pdfFiles,
                scanned_directory: directory_path,
                recursive_scan: recursive
              }, null, 2)
            }
          ]
        };
      }

      case "document_organizer__check_conversions": {
        const { directory_path, pdf_files } = CheckConversionsArgsSchema.parse(args);
        const pdfsToCheck = pdf_files || await findPdfFiles(directory_path);
        
        const conversionStatus = [];
        for (const pdfPath of pdfsToCheck) {
          const hasMarkdown = await checkMdExists(pdfPath);
          conversionStatus.push({
            pdf_path: pdfPath,
            has_markdown: hasMarkdown,
            needs_conversion: !hasMarkdown
          });
        }
        
        return {
          content: [
            {
              type: "text", 
              text: JSON.stringify({
                total_pdfs: conversionStatus.length,
                already_converted: conversionStatus.filter(s => s.has_markdown).length,
                needs_conversion: conversionStatus.filter(s => s.needs_conversion).length,
                conversion_status: conversionStatus
              }, null, 2)
            }
          ]
        };
      }

      case "document_organizer__convert_missing": {
        const { directory_path, pdf_files } = ConvertMissingArgsSchema.parse(args);
        const pdfsToCheck = pdf_files || await findPdfFiles(directory_path);
        
        const conversions = [];
        for (const pdfPath of pdfsToCheck) {
          const hasMarkdown = await checkMdExists(pdfPath);
          if (!hasMarkdown) {
            const result = await convertPdfToMd(pdfPath);
            conversions.push({
              pdf_path: pdfPath,
              ...result
            });
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                conversions_attempted: conversions.length,
                successful_conversions: conversions.filter(c => c.success).length,
                failed_conversions: conversions.filter(c => !c.success).length,
                results: conversions
              }, null, 2)
            }
          ]
        };
      }

      case "document_organizer__analyze_content": {
        const { directory_path, md_files } = AnalyzeContentArgsSchema.parse(args);
        let markdownFiles = md_files;
        
        if (!markdownFiles) {
          // Find all markdown files
          markdownFiles = [];
          async function findMdFiles(dir: string) {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
              const fullPath = path.join(dir, item.name);
              if (item.isFile() && path.extname(item.name).toLowerCase() === '.md') {
                markdownFiles!.push(fullPath);
              } else if (item.isDirectory()) {
                await findMdFiles(fullPath);
              }
            }
          }
          await findMdFiles(directory_path);
        }
        
        const analyses = [];
        for (const mdPath of markdownFiles) {
          const analysis = await analyzeMarkdownContent(mdPath);
          analyses.push({
            file_path: mdPath,
            ...analysis
          });
        }
        
        // Group by category
        const categorized = analyses.reduce((acc, analysis) => {
          if (!acc[analysis.category]) {
            acc[analysis.category] = [];
          }
          acc[analysis.category].push(analysis.file_path);
          return acc;
        }, {} as Record<string, string[]>);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total_files: analyses.length,
                categorized_breakdown: categorized,
                detailed_analysis: analyses
              }, null, 2)
            }
          ]
        };
      }

      case "document_organizer__organize_structure": {
        const { directory_path, categories, create_pdf_md_subfolders } = OrganizeStructureArgsSchema.parse(args);
        
        const results = [];
        
        for (const [categoryName, filePatterns] of Object.entries(categories)) {
          const categoryPath = path.join(directory_path, categoryName);
          
          // Create category directory
          await fs.mkdir(categoryPath, { recursive: true });
          
          if (create_pdf_md_subfolders) {
            const pdfDir = path.join(categoryPath, 'PDFs');
            const mdDir = path.join(categoryPath, 'MDs');
            await fs.mkdir(pdfDir, { recursive: true });
            await fs.mkdir(mdDir, { recursive: true });
          }
          
          results.push({
            category: categoryName,
            path: categoryPath,
            files_to_organize: filePatterns.length,
            subfolders_created: create_pdf_md_subfolders
          });
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                categories_created: results.length,
                organization_results: results
              }, null, 2)
            }
          ]
        };
      }

      case "document_organizer__full_workflow": {
        const { directory_path, analyze_content } = FullWorkflowArgsSchema.parse(args);
        
        const workflow = [];
        
        // Step 1: Discover PDFs
        const pdfFiles = await findPdfFiles(directory_path);
        workflow.push({ step: "discover", found_pdfs: pdfFiles.length });
        
        // Step 2: Check conversions
        const conversionStatus = [];
        for (const pdfPath of pdfFiles) {
          const hasMarkdown = await checkMdExists(pdfPath);
          conversionStatus.push({
            pdf_path: pdfPath,
            has_markdown: hasMarkdown,
            needs_conversion: !hasMarkdown
          });
        }
        workflow.push({ 
          step: "check_conversions", 
          needs_conversion: conversionStatus.filter(s => s.needs_conversion).length 
        });
        
        // Step 3: Convert missing
        const conversions = [];
        for (const status of conversionStatus) {
          if (status.needs_conversion) {
            const result = await convertPdfToMd(status.pdf_path);
            conversions.push({ pdf_path: status.pdf_path, ...result });
          }
        }
        workflow.push({ 
          step: "convert_missing", 
          conversions_attempted: conversions.length,
          successful: conversions.filter(c => c.success).length
        });
        
        // Step 4: Analyze content (if requested)
        let categorization = {};
        if (analyze_content) {
          // Find all markdown files after conversion
          const allMdFiles: string[] = [];
          async function findMdFiles(dir: string) {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
              const fullPath = path.join(dir, item.name);
              if (item.isFile() && path.extname(item.name).toLowerCase() === '.md') {
                allMdFiles.push(fullPath);
              } else if (item.isDirectory()) {
                await findMdFiles(fullPath);
              }
            }
          }
          await findMdFiles(directory_path);
          
          const analyses = [];
          for (const mdPath of allMdFiles) {
            const analysis = await analyzeMarkdownContent(mdPath);
            analyses.push({ file_path: mdPath, ...analysis });
          }
          
          categorization = analyses.reduce((acc, analysis) => {
            if (!acc[analysis.category]) {
              acc[analysis.category] = [];
            }
            acc[analysis.category].push(analysis.file_path);
            return acc;
          }, {} as Record<string, string[]>);
          
          workflow.push({ 
            step: "analyze_content", 
            files_analyzed: analyses.length,
            categories_identified: Object.keys(categorization).length
          });
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                workflow_completed: true,
                steps: workflow,
                final_categorization: categorization,
                summary: {
                  pdfs_found: pdfFiles.length,
                  conversions_needed: conversions.length,
                  successful_conversions: conversions.filter(c => c.success).length,
                  categories_suggested: Object.keys(categorization).length
                }
              }, null, 2)
            }
          ]
        };
      }

      case "document_organizer__init_project_docs": {
        const { directory_path, project_name, project_type } = InitProjectDocsArgsSchema.parse(args);
        const validatedPath = validatePath(directory_path);
        
        // Create required directory structure
        const requiredDirs = [
          'docs',
          'docs/plans',
          'docs/plans/archived',
          'docs/plans/superseded',
          'docs/progress'
        ];
        
        for (const dir of requiredDirs) {
          await fs.mkdir(path.join(validatedPath, dir), { recursive: true });
        }
        
        // Generate templates
        const currentStatusContent = generateCurrentStatusTemplate(project_name, project_type);
        const activePlanContent = generateActivePlanTemplate(project_name);
        const claudeInstructionsContent = generateClaudeInstructionsTemplate(project_name, project_type);
        
        // Write required files
        const filesToCreate = [
          { path: 'CURRENT_STATUS.md', content: currentStatusContent },
          { path: 'ACTIVE_PLAN.md', content: activePlanContent },
          { path: '.claude-instructions.md', content: claudeInstructionsContent }
        ];
        
        const createdFiles = [];
        const skippedFiles = [];
        
        for (const file of filesToCreate) {
          const fullPath = path.join(validatedPath, file.path);
          try {
            // Check if file already exists
            await fs.access(fullPath);
            skippedFiles.push(file.path);
          } catch {
            // File doesn't exist, create it
            await fs.writeFile(fullPath, file.content, 'utf-8');
            createdFiles.push(file.path);
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                project_initialized: true,
                project_path: validatedPath,
                directories_created: requiredDirs,
                files_created: createdFiles,
                files_skipped: skippedFiles,
                message: `Project documentation standard initialized for ${project_name}`
              }, null, 2)
            }
          ]
        };
      }

      case "document_organizer__archive_plan": {
        const { plan_path, reason, new_status } = ArchivePlanArgsSchema.parse(args);
        const validatedPath = validatePath(plan_path);
        
        try {
          await archivePlan(validatedPath, reason, new_status);
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  plan_archived: true,
                  original_path: validatedPath,
                  status: new_status,
                  reason: reason,
                  archived_date: new Date().toISOString().split('T')[0]
                }, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(`Failed to archive plan: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case "document_organizer__validate_doc_structure": {
        const { directory_path } = ValidateDocStructureArgsSchema.parse(args);
        const validatedPath = validatePath(directory_path);
        
        const validation = await validateDocumentationStructure(validatedPath);
        
        const statusIcon = validation.valid ? "✅" : "❌";
        const summary = validation.valid ? 
          "Project documentation structure is compliant" :
          `Found ${validation.missing_files.length + validation.issues.length} compliance issues`;
        
        return {
          content: [
            {
              type: "text",
              text: `${statusIcon} Documentation Validation Report\n\n${JSON.stringify({
                project_path: validatedPath,
                compliant: validation.valid,
                summary,
                missing_files: validation.missing_files,
                issues: validation.issues,
                suggestions: validation.suggestions
              }, null, 2)}`
            }
          ]
        };
      }

      case "document_organizer__create_weekly_handoff": {
        const { project_path, completed_items, key_decisions } = CreateWeeklyHandoffArgsSchema.parse(args);
        const validatedPath = validatePath(project_path);
        
        try {
          await createWeeklyHandoff(validatedPath, completed_items, key_decisions);
          
          const currentDate = new Date().toISOString().split('T')[0];
          const yearMonth = currentDate.substring(0, 7);
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  weekly_handoff_created: true,
                  project_path: validatedPath,
                  date: currentDate,
                  progress_file: `docs/progress/${yearMonth}/weekly-progress-${currentDate}.md`,
                  completed_items: completed_items?.length || 0,
                  key_decisions: key_decisions?.length || 0,
                  message: "Weekly handoff documentation created successfully"
                }, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(`Failed to create weekly handoff: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  console.error("Initializing Document Organizer MCP Server...");
  console.error(`✓ Server initialized with ${tools.length} tools`);
  console.error("✓ PDF conversion tools available (marker + pymupdf4llm)");
  console.error("✓ Universal Project Documentation Standard tools available");
  console.error("✓ Automatic marker output cleaning enabled");
  console.error("✓ Ready to accept tool calls via MCP protocol");
  console.error("ℹ️ Default PDF engine: marker (with auto-cleaning)");
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
