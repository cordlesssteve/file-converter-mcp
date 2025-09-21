#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "document-organizer-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "convert_pdf",
        description: "Convert PDF files to Markdown format using marker (recommended) or pymupdf4llm",
        inputSchema: {
          type: "object",
          properties: {
            pdf_path: {
              type: "string",
              description: "Absolute path to the PDF file to convert"
            },
            output_path: {
              type: "string",
              description: "Optional path to write markdown output"
            }
          },
          required: ["pdf_path"]
        }
      },
      {
        name: "discover_pdfs", 
        description: "Recursively scan directory trees to locate all PDF files",
        inputSchema: {
          type: "object",
          properties: {
            directory_path: {
              type: "string",
              description: "Path to directory to scan for PDF files"
            },
            recursive: {
              type: "boolean",
              description: "Search subdirectories recursively",
              default: true
            }
          },
          required: ["directory_path"]
        }
      },
      {
        name: "check_conversions",
        description: "Analyze PDF collection to determine conversion status",
        inputSchema: {
          type: "object", 
          properties: {
            directory_path: {
              type: "string",
              description: "Path to directory containing PDF files"
            }
          },
          required: ["directory_path"]
        }
      },
      {
        name: "convert_missing",
        description: "Convert only PDFs that lack companion Markdown files", 
        inputSchema: {
          type: "object",
          properties: {
            directory_path: {
              type: "string", 
              description: "Path to directory containing PDFs to convert"
            }
          },
          required: ["directory_path"]
        }
      },
      {
        name: "analyze_content",
        description: "Analyze markdown files to automatically determine document categories",
        inputSchema: {
          type: "object",
          properties: {
            directory_path: {
              type: "string",
              description: "Path to directory containing markdown files"
            }
          },
          required: ["directory_path"]
        }
      },
      {
        name: "organize_structure", 
        description: "Create hierarchical directory structure and move files to appropriate locations",
        inputSchema: {
          type: "object",
          properties: {
            directory_path: {
              type: "string",
              description: "Path to directory to organize"
            },
            categories: {
              type: "object",
              description: "Categories with their associated file patterns/names"
            }
          },
          required: ["directory_path", "categories"]
        }
      },
      {
        name: "full_workflow",
        description: "Execute end-to-end document organization pipeline",
        inputSchema: {
          type: "object", 
          properties: {
            directory_path: {
              type: "string",
              description: "Path to directory to organize completely"
            }
          },
          required: ["directory_path"]
        }
      },
      {
        name: "init_project_docs",
        description: "Initialize Universal Project Documentation Standard structure",
        inputSchema: {
          type: "object",
          properties: {
            directory_path: {
              type: "string", 
              description: "Path to project directory to initialize"
            },
            project_name: {
              type: "string",
              description: "Name of the project for templates"
            },
            project_type: {
              type: "string",
              description: "Type of project (e.g., 'web-app', 'api', 'library')"
            }
          },
          required: ["directory_path", "project_name"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "convert_pdf":
        return {
          content: [
            {
              type: "text",
              text: "PDF conversion functionality - implement marker/pymupdf4llm integration"
            }
          ]
        };
        
      case "discover_pdfs":
        return {
          content: [
            {
              type: "text", 
              text: "PDF discovery functionality - recursive file scanning"
            }
          ]
        };
        
      default:
        return {
          content: [
            {
              type: "text",
              text: `Tool ${name} not implemented yet`
            }
          ]
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});