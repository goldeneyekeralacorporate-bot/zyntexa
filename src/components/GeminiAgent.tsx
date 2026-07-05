import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Send, Globe, Trash2, Edit3, CheckCircle2, 
  HelpCircle, ExternalLink, Loader2, ArrowRightLeft, 
  Tag, Percent, RefreshCcw, FileText
} from "lucide-react";
import { Product } from "../types";

interface GeminiAgentProps {
  products: Product[];
  isAdmin: boolean;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
}

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  citations?: { title: string; uri: string }[];
  suggestedEdit?: {
    productId: string;
    productName: string;
    field: "price" | "description" | "name";
    newValue: string | number;
    explanation: string;
  };
};

export default function GeminiAgent({ products, isAdmin, onUpdateProduct }: GeminiAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hello! I am **Zyntexa AI Concierge**, powered by Gemini 3.5. I am connected to real-time Google Search results and our live catalog. Let me help you analyze trends, fact-check, or make direct catalog modifications!",
    },
  ]);
  const [input, setInput] = useState("");
  const [searchGrounding, setSearchGrounding] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<string>("");
  const [applyingEditId, setApplyingEditId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    if (!customText) setInput("");

    const userMsgId = `user_${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      { id: userMsgId, role: "user", text: textToSend }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build a contextual instruction including our live product catalog
      const catalogContext = products.map(p => 
        `- ID: "${p.id}", Name: "${p.name}", Category: "${p.category}", Price: ₹${p.price}, Stock: ${p.stock}, Description: "${p.description}"`
      ).join("\n");

      const systemInstruction = `You are Zyntexa AI Concierge, a brilliant full-stack retail assistant.
You are embedded in Zyntexa, an premium e-commerce store with live delivery across India.
Here is the current live product catalog:
${catalogContext}

Capabilities:
1. You can discuss current events, cite recent news, and fact-check information using the live Google Search tool.
2. You can analyze product descriptions or pricing and suggest improvements.
3. CRITICAL: If you suggest an edit to a product, you MUST output a structured JSON blocks inside your response so the client UI can parse it and let the user apply it in one click!
   The JSON block MUST be formatted exactly like this:
   \`\`\`json-edit
   {
     "productId": "id-of-the-product",
     "productName": "Product Name",
     "field": "price", // or "description" or "name"
     "newValue": 11499, // price as number, others as strings
     "explanation": "Brief explanation of why this change is suggested based on search trends or improvements."
   }
   \`\`\`
   Do not put any other text inside the json-edit codeblock. Provide only 1 block per message if suggesting an edit.
4. Keep answers friendly, professional, formatted cleanly in Markdown. Cite sources when search grounding is used.`;

      // History mapping for Gemini format
      const history = messages.slice(1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          searchGrounding,
          systemInstruction
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch response");
      }

      const data = await res.json();
      
      // Parse for json-edit block in response text
      let cleanedText = data.text;
      let suggestedEdit: Message["suggestedEdit"] = undefined;

      const editBlockRegex = /```json-edit([\s\S]*?)```/g;
      const match = editBlockRegex.exec(data.text);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed.productId && parsed.field && parsed.newValue !== undefined) {
            suggestedEdit = {
              productId: parsed.productId,
              productName: parsed.productName || "Product",
              field: parsed.field,
              newValue: parsed.newValue,
              explanation: parsed.explanation || "Suggested update by AI Agent."
            };
            // Strip the codeblock from the user's visible text so they get a nice clean card instead
            cleanedText = data.text.replace(editBlockRegex, "").trim();
          }
        } catch (pe) {
          console.error("Failed to parse json-edit block:", pe);
        }
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "model",
          text: cleanedText,
          citations: data.groundingChunks || [],
          suggestedEdit
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "model",
          text: `⚠️ **AI Service Offline**: ${err.message || "An unexpected error occurred. Please check server settings."}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyEdit = async (edit: NonNullable<Message["suggestedEdit"]>, msgId: string) => {
    setApplyingEditId(msgId);
    try {
      const updates: Partial<Product> = {};
      if (edit.field === "price") {
        updates.price = Number(edit.newValue);
      } else if (edit.field === "description") {
        updates.description = String(edit.newValue);
      } else if (edit.field === "name") {
        updates.name = String(edit.newValue);
      }

      await onUpdateProduct(edit.productId, updates);

      // Replace or update message to show "Applied" state
      setMessages(prev => 
        prev.map(m => m.id === msgId ? {
          ...m,
          suggestedEdit: undefined,
          text: m.text + `\n\n✅ **Success:** Instantly applied AI update: changed **${edit.field}** of *${edit.productName}* to **${edit.newValue}**.`
        } : m)
      );
    } catch (e: any) {
      alert(`Failed to apply edit: ${e.message}`);
    } finally {
      setApplyingEditId(null);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        text: "Chat cleared! What shall we analyze or search today?",
      },
    ]);
  };

  const handleQuickAction = (actionType: string) => {
    if (actionType === "current_events") {
      handleSendMessage("Search Google for the latest tech and fashion trends in India for July 2026.");
    } else if (actionType === "price_optimize" && selectedProductForEdit) {
      const prod = products.find(p => p.id === selectedProductForEdit);
      if (prod) {
        handleSendMessage(`Search the web for current retail pricing of premium mechanical chronographs or headphones similar to "${prod.name}" (which we sell for ₹${prod.price}). Analyze market pricing and suggest an optimized price edit with reasons.`);
      }
    } else if (actionType === "desc_optimize" && selectedProductForEdit) {
      const prod = products.find(p => p.id === selectedProductForEdit);
      if (prod) {
        handleSendMessage(`Analyze our product "${prod.name}". The description is: "${prod.description}". Optimize this description to make it highly persuasive, using a premium/luxury aesthetic, and output an edit suggestion.`);
      }
    }
  };

  return (
    <>
      {/* Floating Activation Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer border-2 border-white transition-all duration-300 hover:scale-105 active:scale-95 animate-bounce-slow"
        title="Open Gemini AI Assistant"
        id="gemini-assistant-toggle"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all font-bold text-xs ml-0 group-hover:ml-2">
          AI Co-Pilot
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col font-sans"
            id="gemini-assistant-panel"
          >
            {/* Header block with Geometric Balance styling */}
            <div className="bg-slate-900 text-white h-20 px-6 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h2 className="text-sm font-black tracking-widest text-indigo-400 uppercase">ZYNTEXA AI</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Search Grounding & Catalog Agent</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Clear Conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 rounded-lg text-xs font-extrabold cursor-pointer transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </div>

            {/* Quick Agent Context Controls */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-col gap-3">
              {/* Google Search grounding toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className={`w-4 h-4 ${searchGrounding ? 'text-indigo-600 animate-spin-slow' : 'text-slate-400'}`} />
                  <span className="text-[11px] font-bold text-slate-700">Real-time Google Search Results</span>
                </div>
                <button
                  onClick={() => setSearchGrounding(!searchGrounding)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    searchGrounding ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      searchGrounding ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Quick Operation Panel */}
              <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Interactive Storefront Tasks</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickAction("current_events")}
                    className="p-2 bg-white border border-slate-200 hover:border-indigo-600 rounded-xl text-[10px] font-bold text-slate-600 hover:text-indigo-600 text-left transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Fact-Check Retail Trends</span>
                  </button>

                  <div className="flex flex-col gap-1">
                    <select
                      value={selectedProductForEdit}
                      onChange={(e) => setSelectedProductForEdit(e.target.value)}
                      className="w-full p-1 border border-slate-200 rounded-lg text-[9px] font-bold bg-white"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name.substring(0, 20)}...</option>
                      ))}
                    </select>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickAction("price_optimize")}
                        disabled={!selectedProductForEdit}
                        className="flex-1 p-1 bg-white border border-slate-200 hover:border-indigo-600 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-[9px] font-black text-slate-700 hover:text-indigo-600 text-center transition-all cursor-pointer"
                        title="AI Pricing Analysis"
                      >
                        Suggest Price
                      </button>
                      <button
                        onClick={() => handleQuickAction("desc_optimize")}
                        disabled={!selectedProductForEdit}
                        className="flex-1 p-1 bg-white border border-slate-200 hover:border-indigo-600 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-[9px] font-black text-slate-700 hover:text-indigo-600 text-center transition-all cursor-pointer"
                        title="AI Description Optimizer"
                      >
                        Optimize Desc
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat message flow container */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col max-w-[85%] ${m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">
                    {m.role === "user" ? "You" : "Zyntexa AI"}
                  </span>
                  
                  <div
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed font-medium ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none shadow-sm"
                        : "bg-white text-slate-800 border-slate-200 rounded-tl-none shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* Citations block for news fact-checking */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 border-t border-slate-100 pt-2 space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>Google Search Sources:</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.citations.map((c, idx) => (
                            <a
                              key={idx}
                              href={c.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] text-indigo-600 rounded-md font-bold flex items-center gap-1 transition-colors border border-slate-200"
                            >
                              <span className="truncate max-w-[120px]">{c.title || "Source"}</span>
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interactive Suggested Edit block inside chat */}
                    {m.suggestedEdit && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border-2 border-indigo-100 space-y-3">
                        <div className="flex items-start gap-2">
                          <Tag className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Suggested Product Edit</p>
                            <p className="text-xs font-bold text-slate-800">{m.suggestedEdit.productName}</p>
                          </div>
                        </div>

                        <div className="text-[11px] space-y-1 text-slate-600">
                          <p>
                            Field: <span className="font-bold text-indigo-600">{m.suggestedEdit.field}</span>
                          </p>
                          <p>
                            New Value: <span className="font-extrabold text-slate-800">{m.suggestedEdit.field === 'price' ? `₹${m.suggestedEdit.newValue}` : String(m.suggestedEdit.newValue)}</span>
                          </p>
                          <p className="italic text-slate-500">"{m.suggestedEdit.explanation}"</p>
                        </div>

                        {isAdmin ? (
                          <button
                            onClick={() => handleApplyEdit(m.suggestedEdit!, m.id)}
                            disabled={applyingEditId !== null}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {applyingEditId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Apply to Live Website</span>
                          </button>
                        ) : (
                          <p className="text-[9px] text-slate-400 font-bold uppercase italic text-center">
                            🔒 Admin permissions required to apply edits
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 mr-auto text-slate-400 bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Consulting global search results and catalog parameters...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about news, fact-check, or request product edits..."
                  className="flex-grow p-3 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white rounded-xl text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:pointer-events-none text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[9px] text-slate-400 text-center mt-2">
                Connected to model <strong>gemini-3.5-flash</strong> via secure backend proxy.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
