import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// API: AI Chat with Google Search Grounding & Content Analysis Capabilities
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, searchGrounding, systemInstruction } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured on the server. Please check your Secrets panel.",
      });
    }

    // Build contents structure
    // Translate history to correct parts format if any
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      });
    }
    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Configure tools if searchGrounding is enabled
    const tools: any[] = [];
    if (searchGrounding) {
      tools.push({ googleSearch: {} });
    }

    // Call Gemini Model (gemini-3.5-flash is our standard for basic text & search grounding)
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: systemInstruction || "You are Zyntexa AI, a smart assistant for the Zyntexa store. You can assist with shopping, discuss current events, cite recent news, fact-check information, and help edit store products.",
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      text,
      groundingChunks: groundingChunks.map((chunk: any) => ({
        title: chunk.web?.title || "",
        uri: chunk.web?.uri || "",
      })),
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with Gemini API." });
  }
});

// API: Cashfree Create Live Order Session
app.post("/api/cashfree/create-order", async (req, res) => {
  try {
    const { amount, customerPhone, customerEmail, customerName, orderId } = req.body;

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) {
      return res.status(400).json({
        error: "Cashfree App ID or Secret Key is not configured on the server. Please check your Secrets panel."
      });
    }

    // Determine environment based on client id prefix
    const isProd = !appId.toUpperCase().startsWith("TEST");
    const cashfreeUrl = isProd 
      ? "https://api.cashfree.com/pg/orders" 
      : "https://sandbox.cashfree.com/pg/orders";

    // Format customerPhone (Must be standard 10 digit number)
    let phone = customerPhone ? customerPhone.replace(/\D/g, "") : "";
    if (phone.startsWith("91") && phone.length > 10) {
      phone = phone.substring(2);
    }
    if (phone.length < 10) {
      phone = "9999999999"; // Fallback for Cashfree validation
    } else {
      phone = phone.substring(0, 10);
    }

    const customerId = "cust_" + Math.random().toString(36).substring(2, 10);

    const requestBody = {
      order_id: orderId || "order_" + Math.random().toString(36).substring(2, 12),
      order_amount: parseFloat(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: customerId,
        customer_email: customerEmail || "customer@example.com",
        customer_phone: phone,
        customer_name: customerName || "Guest Customer"
      },
      order_meta: {
        return_url: `${req.headers.origin || "https://ais-dev-z3yinxadonprgw33saydv3-96387776787.asia-southeast1.run.app"}/?order_id={order_id}`
      }
    };

    const response = await fetch(cashfreeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey
      },
      body: JSON.stringify(requestBody)
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error("Cashfree API error:", data);
      return res.status(response.status).json({ error: data.message || "Cashfree order creation failed" });
    }

    res.json({
      paymentSessionId: data.payment_session_id,
      orderId: data.order_id,
      cfOrderId: data.cf_order_id,
      mode: isProd ? "production" : "sandbox",
      paymentLink: data.payments?.url || null
    });
  } catch (err: any) {
    console.error("Cashfree order creation exception:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Cashfree configuration status check
app.get("/api/cashfree/config-status", (req, res) => {
  const appId = process.env.CASHFREE_APP_ID || "";
  const secretKey = process.env.CASHFREE_SECRET_KEY || "";
  res.json({
    configured: appId.length > 0 && secretKey.length > 0,
    appIdMask: appId ? appId.substring(0, 4) + "..." + appId.substring(appId.length > 4 ? appId.length - 2 : appId.length) : "",
    isTestKey: appId.toUpperCase().startsWith("TEST")
  });
});

// API: Cashfree Verify Live Order Status
app.get("/api/cashfree/verify-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) {
      return res.status(400).json({
        error: "Cashfree credentials are not configured on the server."
      });
    }

    const isProd = !appId.toUpperCase().startsWith("TEST");
    const cashfreeUrl = isProd 
      ? `https://api.cashfree.com/pg/orders/${orderId}`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    const response = await fetch(cashfreeUrl, {
      method: "GET",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey
      }
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error("Cashfree verification error:", data);
      return res.status(response.status).json({ error: data.message || "Failed to fetch order status" });
    }

    res.json({
      orderId: data.order_id,
      orderStatus: data.order_status, // e.g. "PAID", "ACTIVE", "EXPIRED", etc.
      paymentSessionId: data.payment_session_id
    });
  } catch (err: any) {
    console.error("Cashfree Verification exception:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

import http from "http";
import { WebSocketServer, WebSocket } from "ws";

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const activeSockets = new Set<WebSocket>();

wss.on("connection", (ws: WebSocket) => {
  activeSockets.add(ws);
  console.log(`New WS Client connected. Total active: ${activeSockets.size}`);

  // Send immediate welcome and presence update
  ws.send(JSON.stringify({ type: "WELCOME", message: "Connected to Zyntexa Live Network" }));
  broadcast({ type: "PRESENCE_CHANGE", count: activeSockets.size });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Received WS message:", data);
      
      // If it's a broadcast message from client, distribute it to all clients
      if (data.type === "BROADCAST") {
        broadcast(data.payload);
      } else {
        // General broadcast
        broadcast(data);
      }
    } catch (e) {
      console.error("Failed to parse WS message:", e);
    }
  });

  ws.on("close", () => {
    activeSockets.delete(ws);
    console.log(`WS Client disconnected. Total active: ${activeSockets.size}`);
    broadcast({ type: "PRESENCE_CHANGE", count: activeSockets.size });
  });

  ws.on("error", (err) => {
    console.error("WS connection error:", err);
    activeSockets.delete(ws);
    broadcast({ type: "PRESENCE_CHANGE", count: activeSockets.size });
  });
});

function broadcast(data: any) {
  const payload = JSON.stringify(data);
  activeSockets.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN is 1
      client.send(payload);
    }
  });
}

// POST endpoint to trigger websocket broadcasts from REST endpoints
app.post("/api/ws/broadcast", (req, res) => {
  const payload = req.body;
  broadcast(payload);
  res.json({ success: true });
});

// Configure Vite middleware or Static files depending on NODE_ENV
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    const pathname = url.split("?")[0];
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Zyntexa Server running on http://0.0.0.0:${PORT}`);
  });
}

initServer();
