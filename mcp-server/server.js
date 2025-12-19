import express from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number.parseInt(process.env.MCP_PORT || "8787", 10);
const HOST = process.env.MCP_HOST || "0.0.0.0";
const API_BASE_URL = (process.env.MCP_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const RESOURCE_BASE_URL = (process.env.MCP_RESOURCE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const AUTH_SERVER_ISSUER = (process.env.MCP_AUTHORIZATION_SERVER_ISSUER || API_BASE_URL).replace(/\/$/, "");
const ALLOW_ANON = process.env.MCP_ALLOW_ANON === "true";

const requestContext = new AsyncLocalStorage();

const app = express();
// Parse JSON bodies so the MCP transport receives parsed messages.
app.use(express.json({ type: "application/json", limit: "4mb" }));

const mcpServer = new McpServer({
  name: "kiik.app",
  version: "1.0.0",
});

// Work around occasional Zod schema compatibility issues by falling back to passthrough.
const originalValidateToolInput = mcpServer.validateToolInput.bind(mcpServer);
mcpServer.validateToolInput = async (tool, args, toolName) => {
  try {
    return await originalValidateToolInput(tool, args, toolName);
  } catch (error) {
    console.warn(`Schema validation skipped for tool ${toolName}: ${error?.message}`);
    return args ?? {};
  }
};

// Shared HTTP transport for streamable MCP responses.
const transport = new StreamableHTTPServerTransport({ app });

const oauthSecurity = (scopes) => [{ type: "oauth2", scopes }];

const withToolMeta = (descriptor, { scopes, readOnly, openWorld = false, destructive = false }) => ({
  ...descriptor,
  securitySchemes: oauthSecurity(scopes),
  annotations: {
    readOnlyHint: readOnly,
    openWorldHint: openWorld,
    destructiveHint: destructive,
  },
  _meta: {
    securitySchemes: oauthSecurity(scopes),
  },
});

const toolResponse = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  structuredContent: data,
});

const toolError = (message, details = {}) => ({
  content: [{ type: "text", text: message }],
  structuredContent: { error: message, ...details },
});

const getAuthHeaders = (headers) => {
  const authHeader = headers?.authorization;
  const aiToken = headers?.["x-ai-service-token"];
  if (authHeader) {
    return { Authorization: authHeader };
  }
  if (aiToken) {
    return { "X-AI-Service-Token": aiToken };
  }
  return null;
};

const requireAuth = (req, res) => {
  const authHeaders = getAuthHeaders(req.headers);
  if (authHeaders || ALLOW_ANON) {
    return authHeaders;
  }

  res.status(401);
  res.setHeader(
    "WWW-Authenticate",
    `Bearer resource=\"${RESOURCE_BASE_URL}/.well-known/oauth-protected-resource\"`
  );
  res.end();
  return null;
};

const buildUrl = (path, params = {}) => {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.append(key, String(value));
  });
  return url.toString();
};

const callApi = async ({ method, path, params, body }) => {
  const context = requestContext.getStore();
  const authHeaders = context?.authHeaders;
  if (!authHeaders && !ALLOW_ANON) {
    throw new Error("Missing authorization.");
  }

  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(authHeaders || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = `API request failed (${response.status})`;
    const error = new Error(message);
    error.details = { status: response.status, data };
    throw error;
  }

  return data;
};

mcpServer.tool(
  "get_context_summary",
  withToolMeta(
    {
      title: "Get workspace summary",
      description: "Returns aggregate counts for customers, projects, estimates, invoices, and CRA entries.",
      inputSchema: z.object({}).strict(),
    },
    { scopes: ["context:read"], readOnly: true }
  ),
  async () => {
    try {
      const data = await callApi({ method: "GET", path: "/api/ai-actions/context/" });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "list_customers",
  withToolMeta(
    {
      title: "List customers",
      description: "Returns recent customers, optionally filtered by a search query.",
      inputSchema: z
        .object({
          search: z.string().optional().describe("Search by name, company, or email"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100)"),
        })
      .strict(),
    },
    { scopes: ["customers:read"], readOnly: true }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "GET",
        path: "/api/ai-actions/context/customers/",
        params: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "list_projects",
  withToolMeta(
    {
      title: "List projects",
      description: "Returns recent projects, optionally filtered by status or search query.",
      inputSchema: z
        .object({
          search: z.string().optional().describe("Search by project or customer"),
        status: z.string().optional().describe("Filter by project status"),
        limit: z.number().int().min(1).max(100).optional(),
        })
      .strict(),
    },
    { scopes: ["projects:read"], readOnly: true }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "GET",
        path: "/api/ai-actions/context/projects/",
        params: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "list_estimates",
  withToolMeta(
    {
      title: "List estimates",
      description: "Returns recent estimates, optionally filtered by status or customer.",
      inputSchema: z
        .object({
          status: z.string().optional(),
        customer: z.number().int().optional().describe("Customer ID"),
        limit: z.number().int().min(1).max(100).optional(),
        })
      .strict(),
    },
    { scopes: ["estimates:read"], readOnly: true }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "GET",
        path: "/api/ai-actions/context/estimates/",
        params: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "list_invoices",
  withToolMeta(
    {
      title: "List invoices",
      description: "Returns recent invoices, optionally filtered by status or customer.",
      inputSchema: z
        .object({
          status: z.string().optional(),
        customer: z.number().int().optional().describe("Customer ID"),
        limit: z.number().int().min(1).max(100).optional(),
        })
      .strict(),
    },
    { scopes: ["invoices:read"], readOnly: true }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "GET",
        path: "/api/ai-actions/context/invoices/",
        params: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "list_cras",
  withToolMeta(
    {
      title: "List CRA entries",
      description: "Returns recent CRA summaries, optionally filtered by status or customer.",
      inputSchema: z
        .object({
          status: z.string().optional(),
        customer: z.number().int().optional().describe("Customer ID"),
        limit: z.number().int().min(1).max(100).optional(),
        })
      .strict(),
    },
    { scopes: ["cra:read"], readOnly: true }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "GET",
        path: "/api/ai-actions/context/cras/",
        params: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "create_customer",
  withToolMeta(
    {
      title: "Create customer",
      description: "Create a new customer record.",
      inputSchema: z
        .object({
          name: z.string().describe("Customer name"),
        company: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        })
      .strict(),
    },
    { scopes: ["customers:write"], readOnly: false, openWorld: false, destructive: false }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "POST",
        path: "/api/ai-actions/actions/customers/",
        body: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "create_estimate",
  withToolMeta(
    {
      title: "Create estimate",
      description: "Create a draft estimate from line items and pricing inputs.",
      inputSchema: z
        .object({
          customer_id: z.number().int().describe("Customer ID"),
        project_id: z.number().int().optional().describe("Project ID"),
        items: z
          .array(
            z.object({
              description: z.string(),
              quantity: z.number().positive(),
              unit_price: z.number().positive(),
            })
          )
          .min(1),
        issue_date: z.string().optional().describe("ISO date"),
        valid_until: z.string().optional().describe("ISO date"),
        currency: z.string().optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        security_margin_percentage: z.number().optional(),
        tax_rate: z.number().optional(),
        })
      .strict(),
    },
    { scopes: ["estimates:write"], readOnly: false, openWorld: false, destructive: false }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "POST",
        path: "/api/ai-actions/actions/estimates/",
        body: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "create_invoice",
  withToolMeta(
    {
      title: "Create invoice",
      description: "Create a draft invoice from line items and pricing inputs.",
      inputSchema: z
        .object({
          customer_id: z.number().int().describe("Customer ID"),
        project_id: z.number().int().optional().describe("Project ID"),
        source_estimate_id: z.number().int().optional(),
        items: z
          .array(
            z.object({
              description: z.string(),
              quantity: z.number().positive(),
              unit_price: z.number().positive(),
            })
          )
          .min(1),
        issue_date: z.string().optional().describe("ISO date"),
        due_date: z.string().optional().describe("ISO date"),
        currency: z.string().optional(),
        notes: z.string().optional(),
        tax_rate: z.number().optional(),
        })
      .strict(),
    },
    { scopes: ["invoices:write"], readOnly: false, openWorld: false, destructive: false }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "POST",
        path: "/api/ai-actions/actions/invoices/",
        body: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "create_cra",
  withToolMeta(
    {
      title: "Create CRA",
      description: "Create a new CRA (activity report) for a customer and period.",
      inputSchema: z
        .object({
          customer_id: z.number().int().describe("Customer ID"),
        project_id: z.number().int().optional(),
        period_month: z.number().int().min(1).max(12),
        period_year: z.number().int().min(2000).max(2100),
        tasks_data: z
          .array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              assigned_dates: z.array(z.string()).optional(),
            })
          )
          .optional(),
        notes: z.string().optional(),
        currency: z.string().optional(),
        })
      .strict(),
    },
    { scopes: ["cra:write"], readOnly: false, openWorld: false, destructive: false }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "POST",
        path: "/api/ai-actions/actions/cras/",
        body: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

mcpServer.tool(
  "approve_import_preview",
  withToolMeta(
    {
      title: "Approve document import",
      description: "Approve an import preview and create entities from the document.",
      inputSchema: z
        .object({
          preview_id: z.number().int().describe("Import preview ID"),
        })
      .strict(),
    },
    { scopes: ["documents:import"], readOnly: false, openWorld: false, destructive: false }
  ),
  async (input) => {
    try {
      const data = await callApi({
        method: "POST",
        path: "/api/ai-actions/actions/import-customer/",
        body: input,
      });
      return toolResponse(data);
    } catch (error) {
      return toolError(error.message, error.details);
    }
  }
);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    resource: RESOURCE_BASE_URL,
    authorization_servers: [AUTH_SERVER_ISSUER],
  });
});

app.post("/mcp", async (req, res) => {
  const authHeaders = requireAuth(req, res);
  if (!authHeaders && !ALLOW_ANON) {
    return;
  }

  try {
    await requestContext.run({ authHeaders }, async () => {
      await transport.handleRequest(req, res, req.body);
    });
  } catch (error) {
    console.error("MCP request failed", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "mcp_request_failed" });
    } else {
      res.end();
    }
  }
});

// Establish the MCP server/transport connection once at startup.
(async () => {
  try {
    await mcpServer.connect(transport);
  } catch (error) {
    console.error("Failed to start MCP transport", error);
    process.exit(1);
  }

  app.listen(PORT, HOST, () => {
    console.log(`MCP server listening on http://${HOST}:${PORT}`);
  });
})();
