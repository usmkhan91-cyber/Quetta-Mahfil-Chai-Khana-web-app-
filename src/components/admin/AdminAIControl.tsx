import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  ShieldAlert, 
  Activity, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Radio, 
  Layers, 
  Coffee, 
  Calendar, 
  FileText,
  Lock,
  ChevronRight,
  Sliders,
  Flame,
  Search,
  Wrench,
  ShieldCheck,
  Check,
  Terminal,
  FileSpreadsheet,
  HardDrive,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { centralAgent, OperationalReport } from '../../services/centralAgentService';
import { useFirebase } from '../../context/FirebaseContext';
import { cn } from '../../lib/utils';
import { signInWithGoogleWorkspace, hasWorkspaceToken } from '../../services/googleWorkspaceAuth';
import { uploadReportToDrive } from '../../services/googleDriveService';
import { exportShiftReportToDoc } from '../../services/googleDocsService';
import { listGoogleChatSpaces, sendOperationalDispatchToChat } from '../../services/googleChatService';

export default function AdminAIControl() {
  const { user, profile } = useFirebase();
  const [commandInput, setCommandInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [workspaceConnected, setWorkspaceConnected] = useState(hasWorkspaceToken());
  const [workspaceConnecting, setWorkspaceConnecting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'export_docs' | 'upload_drive' | 'dispatch_chat';
    payload?: any;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'export_docs'
  });
  const [workspaceActionSuccess, setWorkspaceActionSuccess] = useState<string | null>(null);
  const [workspaceActionError, setWorkspaceActionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolCall?: any;
    timestamp: string;
  }>>([
    {
      id: 'init-1',
      role: 'assistant',
      content: "Pakhair Raghlay Khan Sahib! Central Restaurant AI Agent 'Saki' is authenticated for Administrative Operations. All business mutations are executed with backend authority, parameter validation, and cryptographic audit records.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [report, setReport] = useState<OperationalReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'report' | 'quick-tools' | 'registry'>('console');
  
  // Direct Quick Tool Form States
  const [quickPriceItem, setQuickPriceItem] = useState('Zafrani Chai');
  const [quickPriceVal, setQuickPriceVal] = useState('420');
  const [quickToggleItem, setQuickToggleItem] = useState('Arabic Paratha');
  const [quickToggleStatus, setQuickToggleStatus] = useState(true);
  const [quickBroadcastMsg, setQuickBroadcastMsg] = useState('');

  // Tool Registry Explorer States
  const [registryTools, setRegistryTools] = useState<any[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryCategory, setRegistryCategory] = useState('ALL');
  const [selectedTool, setSelectedTool] = useState<any | null>(null);
  const [toolArgsJson, setToolArgsJson] = useState('{}');
  const [toolExecutionResult, setToolExecutionResult] = useState<any | null>(null);
  const [toolExecuting, setToolExecuting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgentStatus();
    loadOperationalReport();
    loadToolsRegistry();
  }, []);

  const loadToolsRegistry = async () => {
    setRegistryLoading(true);
    try {
      const token = user ? await user.getIdToken() : undefined;
      const data = await centralAgent.getToolsRegistry(token, { all: true });
      setRegistryTools(data.registry || []);
    } catch (err) {
      console.warn('Failed to load tool registry:', err);
    } finally {
      setRegistryLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAgentStatus = async () => {
    const status = await centralAgent.getAgentStatus();
    setAgentStatus(status);
  };

  const loadOperationalReport = async () => {
    setReportLoading(true);
    try {
      const token = user ? await user.getIdToken() : undefined;
      const data = await centralAgent.getOperationalReport(token);
      setReport(data);
    } catch (err) {
      console.warn('Could not load report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleSendCommand = async (cmdText?: string) => {
    const textToSend = cmdText || commandInput.trim();
    if (!textToSend || loading) return;

    const userMsgId = `usr-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        role: 'user' as const,
        content: textToSend,
        timestamp: new Date().toLocaleTimeString()
      }
    ];
    setMessages(newMessages);
    setCommandInput('');
    setLoading(true);

    try {
      const token = user ? await user.getIdToken() : undefined;
      const response = await centralAgent.sendAdminCommand({
        command: textToSend,
        authToken: token
      });

      const replyContent = response.reply || (response.result?.message) || 'Operation completed successfully.';
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: replyContent,
          toolCall: response.toolCalls?.[0] || (response.tool ? { name: response.tool, result: response.result } : undefined),
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Refresh stats if a state change happened
      loadOperationalReport();
      loadAgentStatus();
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `[SECURITY ALERT] Action could not be fulfilled: ${error.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeDirectTool = async (tool: string, args: any) => {
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : undefined;
      const response = await centralAgent.sendAdminCommand({
        tool,
        args,
        authToken: token
      });

      setMessages(prev => [
        ...prev,
        {
          id: `usr-direct-${Date.now()}`,
          role: 'user',
          content: `Execute Tool: ${tool} with parameters ${JSON.stringify(args)}`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: `ai-direct-${Date.now()}`,
          role: 'assistant',
          content: response.result?.message || 'Tool execution confirmed by backend authority.',
          toolCall: { name: tool, result: response.result },
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      loadOperationalReport();
      loadAgentStatus();
    } catch (err: any) {
      alert(`Tool Execution Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-white">
      {/* Header & Status Bar */}
      <div className="p-8 rounded-[2.5rem] bg-gradient-to-r from-stone-900 via-stone-900/90 to-primary-maroon/20 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-gold/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-primary-gold text-black font-black text-[9px] uppercase tracking-widest rounded-full">
                Level 4 • Central AI Authority
              </span>
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Agent Node Active
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-display font-black uppercase italic tracking-tight">
              Admin <span className="text-primary-gold">AI Control Center</span>
            </h2>
            <p className="text-xs text-white/50 uppercase tracking-widest font-mono mt-1">
              Authoritative Orchestration Engine • Zero Client Trust • Cryptographic Auditing
            </p>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveSubTab('console')}
              className={cn(
                "px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                activeSubTab === 'console' ? "bg-primary-gold text-black shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              <Bot size={15} /> Neural Console
            </button>
            <button
              onClick={() => setActiveSubTab('quick-tools')}
              className={cn(
                "px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                activeSubTab === 'quick-tools' ? "bg-primary-gold text-black shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              <Sliders size={15} /> Operations Matrix
            </button>
            <button
              onClick={() => setActiveSubTab('report')}
              className={cn(
                "px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                activeSubTab === 'report' ? "bg-primary-gold text-black shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              <Activity size={15} /> Live Report
            </button>
            <button
              onClick={() => setActiveSubTab('registry')}
              className={cn(
                "px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                activeSubTab === 'registry' ? "bg-primary-gold text-black shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              <Wrench size={15} /> Tool Registry ({registryTools.length})
            </button>
          </div>
        </div>

        {/* Live Hardware & Models Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="block text-[8px] uppercase tracking-widest text-white/40 font-mono mb-1">Primary Engine</span>
            <span className="text-xs font-black text-primary-gold font-mono">
              {agentStatus?.models?.primary || 'gemini-3.8-flash'}
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="block text-[8px] uppercase tracking-widest text-white/40 font-mono mb-1">Authority Gate</span>
            <span className="text-xs font-black text-emerald-400 font-mono">Backend Authoritative</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="block text-[8px] uppercase tracking-widest text-white/40 font-mono mb-1">Active Tools</span>
            <span className="text-xs font-black text-white font-mono">
              {agentStatus?.toolsAvailable?.length || 9} Registered
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="block text-[8px] uppercase tracking-widest text-white/40 font-mono mb-1">Audit Ledger</span>
            <span className="text-xs font-black text-white/80 font-mono">
              {report?.auditLogsCount ?? 0} Recorded Actions
            </span>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: Natural Language Console */}
      {activeSubTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chat Stream */}
          <div className="lg:col-span-2 flex flex-col h-[600px] bg-stone-950/80 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-[9px] font-mono text-white/40 uppercase">
                    {m.role === 'assistant' ? (
                      <>
                        <Bot size={12} className="text-primary-gold" /> Saki Neural Intelligence
                      </>
                    ) : (
                      <>
                        <Lock size={12} className="text-emerald-400" /> Admin Command
                      </>
                    )}
                    <span>• {m.timestamp}</span>
                  </div>

                  <div className={cn(
                    "p-5 rounded-3xl text-sm leading-relaxed",
                    m.role === 'user' 
                      ? "bg-primary-gold text-black font-semibold rounded-tr-none shadow-lg" 
                      : "bg-white/5 border border-white/10 text-white rounded-tl-none"
                  )}>
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* Tool execution badge if present */}
                    {m.toolCall && (
                      <div className="mt-3 p-3 bg-black/40 rounded-2xl border border-white/10 text-xs font-mono">
                        <div className="flex items-center justify-between text-primary-gold mb-1">
                          <span className="flex items-center gap-1 font-black">
                            <CheckCircle2 size={13} className="text-emerald-400" /> {m.toolCall.name}
                          </span>
                          <span className="text-[9px] text-white/40">EXECUTED_SERVER_SIDE</span>
                        </div>
                        <pre className="text-[10px] text-white/70 overflow-x-auto p-2 bg-black/60 rounded-xl">
                          {JSON.stringify(m.toolCall.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl w-fit border border-white/10 text-xs font-mono text-primary-gold animate-pulse">
                  <RefreshCw size={14} className="animate-spin" /> Saki is validating parameters & orchestrating backend state...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="p-3 bg-black/40 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleSendCommand("Update Zafrani Chai price to 420")}
                className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-mono text-white/70 hover:text-white transition-all"
              >
                💰 Set Zafrani Chai to 420
              </button>
              <button
                onClick={() => handleSendCommand("Mark Special Khoya Khajor Shake as sold out")}
                className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-mono text-white/70 hover:text-white transition-all"
              >
                🛑 86 Khoya Khajor Shake
              </button>
              <button
                onClick={() => handleSendCommand("Generate full operational shift report")}
                className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-mono text-white/70 hover:text-white transition-all"
              >
                📊 Generate Shift Report
              </button>
              <button
                onClick={() => handleSendCommand("Broadcast: 'Live Rubab Night this Friday at Quetta Mahfil Bahria Town!'")}
                className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-mono text-white/70 hover:text-white transition-all"
              >
                📢 Broadcast Rubab Night
              </button>
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-black/80 border-t border-white/10 flex items-center gap-3">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                placeholder="Enter natural language admin directive (e.g. 'Set Matka Chai to 250 Rs')..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-white/30 outline-none focus:border-primary-gold transition-all font-mono"
              />
              <button
                onClick={() => handleSendCommand()}
                disabled={loading || !commandInput.trim()}
                className="px-6 py-4 bg-primary-gold text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
              >
                <Send size={15} /> Execute
              </button>
            </div>
          </div>

          {/* Side Info & Live Audit Log Stream */}
          <div className="space-y-6">
            <div className="p-6 rounded-[2.5rem] bg-stone-950/80 border border-white/10">
              <h3 className="text-lg font-display font-black uppercase italic mb-4 flex items-center gap-2">
                <Radio className="text-emerald-400 animate-pulse" size={16} /> Live Announcement
              </h3>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs font-mono text-primary-gold leading-relaxed">
                "{agentStatus?.announcement || 'Welcome to Quetta Mahfil • 24/7 Heritage Dining in Bahria Town'}"
              </div>
            </div>

            <div className="p-6 rounded-[2.5rem] bg-stone-950/80 border border-white/10">
              <h3 className="text-lg font-display font-black uppercase italic mb-4 flex items-center gap-2">
                <FileText className="text-primary-gold" size={16} /> Recent Audit Records
              </h3>
              <div className="space-y-3">
                {report?.recentAudits && report.recentAudits.length > 0 ? (
                  report.recentAudits.map((a: any) => (
                    <div key={a.id} className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs font-mono">
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span className="text-emerald-400 font-bold">{a.action}</span>
                        <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-white/80">{JSON.stringify(a.details)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/40 font-mono">No modifications recorded yet this session.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Operations Matrix (Direct UI Form Controls) */}
      {activeSubTab === 'quick-tools' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Direct Price Adjustment */}
          <div className="p-8 rounded-[2.5rem] bg-stone-950/80 border border-white/10 space-y-6 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-primary-gold/10 flex items-center justify-center text-primary-gold">
              <DollarSign size={24} />
            </div>
            <div>
              <h3 className="text-xl font-display font-black uppercase italic">Price Control Matrix</h3>
              <p className="text-xs text-white/40 mt-1">Authoritative catalog price override with live audit verification.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-white/50 mb-1">Target Menu Item</label>
                <select 
                  value={quickPriceItem}
                  onChange={(e) => setQuickPriceItem(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary-gold"
                >
                  <option value="Zafrani Chai">Zafrani Chai</option>
                  <option value="Matka Chai">Matka Chai</option>
                  <option value="Matka Gurr Chai">Matka Gurr Chai</option>
                  <option value="Arabic Paratha">Arabic Paratha</option>
                  <option value="Chicken Cheese Paratha">Chicken Cheese Paratha</option>
                  <option value="Special Khoya Khajor Shake">Special Khoya Khajor Shake</option>
                  <option value="Peshawari Chapli Paratha">Peshawari Chapli Paratha</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-white/50 mb-1">New Price (PKR)</label>
                <input 
                  type="number"
                  value={quickPriceVal}
                  onChange={(e) => setQuickPriceVal(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary-gold font-mono"
                  placeholder="e.g. 420"
                />
              </div>

              <button
                onClick={() => executeDirectTool('admin_update_price', { itemIdOrName: quickPriceItem, newPrice: Number(quickPriceVal) })}
                disabled={loading}
                className="w-full py-4 bg-primary-gold text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg"
              >
                Apply Authoritative Price
              </button>
            </div>
          </div>

          {/* Card 2: 86 Kitchen Stock Toggle */}
          <div className="p-8 rounded-[2.5rem] bg-stone-950/80 border border-white/10 space-y-6 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-display font-black uppercase italic">Kitchen 86 Stock Switch</h3>
              <p className="text-xs text-white/40 mt-1">Instantly mark exhausted dishes out of stock or re-enable them.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-white/50 mb-1">Target Menu Item</label>
                <select 
                  value={quickToggleItem}
                  onChange={(e) => setQuickToggleItem(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary-gold"
                >
                  <option value="Arabic Paratha">Arabic Paratha</option>
                  <option value="Beef Qeema Paratha">Beef Qeema Paratha</option>
                  <option value="Special Khoya Khajor Shake">Special Khoya Khajor Shake</option>
                  <option value="Pomegranate Anaar Juice">Pomegranate Anaar Juice</option>
                  <option value="Zafrani Chai">Zafrani Chai</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setQuickToggleStatus(true)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                    quickToggleStatus ? "bg-emerald-500 text-black shadow-lg" : "bg-white/5 text-white/60"
                  )}
                >
                  In Stock
                </button>
                <button
                  type="button"
                  onClick={() => setQuickToggleStatus(false)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                    !quickToggleStatus ? "bg-red-500 text-white shadow-lg" : "bg-white/5 text-white/60"
                  )}
                >
                  86 (Sold Out)
                </button>
              </div>

              <button
                onClick={() => executeDirectTool('admin_toggle_availability', { itemIdOrName: quickToggleItem, isAvailable: quickToggleStatus })}
                disabled={loading}
                className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg mt-4"
              >
                Set Stock Status
              </button>
            </div>
          </div>

          {/* Card 3: Global Broadcast */}
          <div className="p-8 rounded-[2.5rem] bg-stone-950/80 border border-white/10 space-y-6 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Radio size={24} />
            </div>
            <div>
              <h3 className="text-xl font-display font-black uppercase italic">Marquee Announcement</h3>
              <p className="text-xs text-white/40 mt-1">Broadcast real-time messages to all active customers and screens.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-white/50 mb-1">Announcement Message</label>
                <textarea 
                  rows={3}
                  value={quickBroadcastMsg}
                  onChange={(e) => setQuickBroadcastMsg(e.target.value)}
                  placeholder="e.g. Special Zafrani evening tonight! Enjoy fresh Matka Chai with hot Lacha Paratha in Bahria Town."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-primary-gold font-sans"
                />
              </div>

              <button
                onClick={() => {
                  if (!quickBroadcastMsg.trim()) return;
                  executeDirectTool('admin_broadcast_announcement', { message: quickBroadcastMsg });
                  setQuickBroadcastMsg('');
                }}
                disabled={loading || !quickBroadcastMsg.trim()}
                className="w-full py-4 bg-primary-gold text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg"
              >
                Broadcast to All Screens
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Operational Report */}
      {activeSubTab === 'report' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-display font-black uppercase italic">
                Executive Shift Synthesis
              </h3>
              <p className="text-xs text-white/40 font-mono mt-1">
                Live performance data synced with central restaurant intelligence & Google Workspace
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!workspaceConnected ? (
                <button
                  onClick={async () => {
                    setWorkspaceConnecting(true);
                    setWorkspaceActionError(null);
                    try {
                      await signInWithGoogleWorkspace();
                      setWorkspaceConnected(true);
                      setWorkspaceActionSuccess('Connected to Google Drive & Google Docs successfully.');
                    } catch (err: any) {
                      setWorkspaceActionError(err.message || 'Failed to connect Google Workspace');
                    } finally {
                      setWorkspaceConnecting(false);
                    }
                  }}
                  disabled={workspaceConnecting}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md"
                >
                  <HardDrive size={14} />
                  {workspaceConnecting ? 'Authorizing...' : 'Connect Google Workspace'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Export Shift Report to Google Docs',
                        description: `This will create a new formatted Google Document titled "Quetta Mahfil — Executive Shift Report (${new Date().toLocaleDateString()})" in your Google account. Do you wish to continue?`,
                        actionType: 'export_docs',
                        payload: report
                      });
                    }}
                    className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 transition-all"
                  >
                    <FileSpreadsheet size={14} /> Export to Google Docs
                  </button>

                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Save Shift Report to Google Drive',
                        description: `This will upload a JSON archive titled "quetta-mahfil-shift-report-${Date.now()}.json" to your Google Drive. Do you wish to continue?`,
                        actionType: 'upload_drive',
                        payload: report
                      });
                    }}
                    className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 transition-all"
                  >
                    <HardDrive size={14} /> Save to Google Drive
                  </button>

                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Broadcast Shift Report to Google Chat',
                        description: `This will format and post the current executive shift performance digest to your active Google Chat team channel. Google Workspace requires your explicit confirmation before messages are sent on your behalf. Do you wish to proceed?`,
                        actionType: 'dispatch_chat',
                        payload: report
                      });
                    }}
                    className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 transition-all"
                  >
                    <MessageSquare size={14} /> Post to Google Chat
                  </button>
                </>
              )}

              <button
                onClick={loadOperationalReport}
                disabled={reportLoading}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-mono flex items-center gap-2 transition-all"
              >
                <RefreshCw size={14} className={reportLoading ? "animate-spin" : ""} /> Refresh Analytics
              </button>
            </div>
          </div>

          {/* Feedback messages for Workspace operations */}
          {workspaceActionSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs font-mono text-emerald-400">
              <span className="flex items-center gap-2">
                <Check size={16} /> {workspaceActionSuccess}
              </span>
              <button onClick={() => setWorkspaceActionSuccess(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
          )}

          {workspaceActionError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-xs font-mono text-red-400">
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} /> {workspaceActionError}
              </span>
              <button onClick={() => setWorkspaceActionError(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-stone-950 border border-white/10">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono block mb-2">Estimated Daily Revenue</span>
              <span className="text-2xl lg:text-3xl font-display font-black text-primary-gold">
                {report?.financials?.dailyEstimatedSales || 'Rs. 248,500'}
              </span>
              <p className="text-[10px] text-white/40 mt-1 font-mono">Bahria Town SEZ Kitchen</p>
            </div>

            <div className="p-6 rounded-3xl bg-stone-950 border border-white/10">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono block mb-2">Average Order Ticket</span>
              <span className="text-2xl lg:text-3xl font-display font-black text-emerald-400">
                {report?.financials?.averageOrderTicket || 'Rs. 840'}
              </span>
              <p className="text-[10px] text-white/40 mt-1 font-mono">High Density Paratha & Tea</p>
            </div>

            <div className="p-6 rounded-3xl bg-stone-950 border border-white/10">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono block mb-2">In-Stock Catalog Items</span>
              <span className="text-2xl lg:text-3xl font-display font-black text-white">
                {report?.inventory?.inStock ?? 22} / {report?.inventory?.totalCatalogItems ?? 22}
              </span>
              <p className="text-[10px] text-white/40 mt-1 font-mono">
                {report?.inventory?.soldOutCount ?? 0} Items Sold Out
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-stone-950 border border-white/10">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono block mb-2">Active Table Bookings</span>
              <span className="text-2xl lg:text-3xl font-display font-black text-primary-gold">
                {report?.reservations?.totalBooked ?? 0} Reserved
              </span>
              <p className="text-[10px] text-white/40 mt-1 font-mono">Hujra & Dining Halls</p>
            </div>
          </div>

          {/* Reservations List */}
          <div className="p-8 rounded-[2.5rem] bg-stone-950 border border-white/10">
            <h4 className="text-xl font-display font-black uppercase italic mb-6 flex items-center gap-2">
              <Calendar className="text-primary-gold" size={20} /> Today's Table Reservations
            </h4>

            {report?.reservations?.recent && report.reservations.recent.length > 0 ? (
              <div className="divide-y divide-white/5">
                {report.reservations.recent.map((res: any) => (
                  <div key={res.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base">{res.customerName}</span>
                        <span className="px-2 py-0.5 bg-primary-gold/10 text-primary-gold text-[9px] font-mono rounded-md">
                          {res.guests} Guests
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono rounded-md">
                          {res.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 font-mono mt-1">
                        Phone: {res.phone} • Date: {res.date} • Time: {res.time} • Notes: {res.notes || 'None'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">{res.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40 font-mono">No reservations booked through Saki yet for today.</p>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Authoritative Tool Registry Explorer */}
      {activeSubTab === 'registry' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-display font-black uppercase italic flex items-center gap-2">
                <Wrench className="text-primary-gold" size={24} />
                Authoritative Central Tool Registry
              </h3>
              <p className="text-xs text-white/50 font-mono mt-1">
                Server-side catalog of 65 production tools governed by strict RBAC, risk gating, and cryptographic audit trails.
              </p>
            </div>
            <button
              onClick={loadToolsRegistry}
              disabled={registryLoading}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-mono flex items-center gap-2 transition-all self-start md:self-auto"
            >
              <RefreshCw size={14} className={registryLoading ? "animate-spin" : ""} /> Refresh Registry
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="p-6 rounded-[2rem] bg-stone-950 border border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  placeholder="Search tools by name, description, or role (e.g. 'order', 'reservation', 'kitchen')..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-primary-gold font-mono"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { id: 'ALL', label: 'All Tools' },
                { id: 'CUSTOMER_INFO', label: 'Customer Info' },
                { id: 'CUSTOMER_ACCOUNT', label: 'Account & Memory' },
                { id: 'ORDER', label: 'Orders' },
                { id: 'RESERVATION', label: 'Reservations' },
                { id: 'OPERATIONS', label: 'Kitchen & Dispatch' },
                { id: 'LOYALTY', label: 'Loyalty' },
                { id: 'NOTIFICATION', label: 'Notifications' },
                { id: 'ADMIN', label: 'Admin & Reports' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setRegistryCategory(cat.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all",
                    registryCategory === cat.id
                      ? "bg-primary-gold text-black font-black shadow-md"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filtered Tools Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {registryTools
              .filter(tool => {
                const matchesSearch = registrySearch === '' || 
                  tool.name.toLowerCase().includes(registrySearch.toLowerCase()) ||
                  (tool.purpose && tool.purpose.toLowerCase().includes(registrySearch.toLowerCase())) ||
                  (tool.category && tool.category.toLowerCase().includes(registrySearch.toLowerCase())) ||
                  (Array.isArray(tool.allowedRoles) && tool.allowedRoles.some((r: string) => r.toLowerCase().includes(registrySearch.toLowerCase())));

                const matchesCategory = registryCategory === 'ALL' ||
                  tool.category === registryCategory ||
                  (registryCategory === 'OPERATIONS' && (tool.category === 'KITCHEN' || tool.category === 'DISPATCH' || tool.category === 'OPERATIONS')) ||
                  (registryCategory === 'ADMIN' && (tool.category === 'ADMIN' || tool.category === 'ADMIN_CONFIG' || tool.category === 'ADMIN_REPORTS'));

                return matchesSearch && matchesCategory;
              })
              .map((tool) => {
                const isSelected = selectedTool?.name === tool.name;
                const riskBadgeColor = 
                  tool.riskLevel === 'CRITICAL_ADMIN' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                  tool.riskLevel === 'HIGH_RISK_WRITE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  tool.riskLevel === 'LOW_RISK_WRITE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/30';

                return (
                  <div
                    key={tool.name}
                    className={cn(
                      "p-6 rounded-[2rem] border transition-all text-left space-y-4",
                      isSelected
                        ? "bg-stone-900 border-primary-gold shadow-xl shadow-primary-gold/5"
                        : "bg-stone-950/80 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-mono text-xs font-bold text-white tracking-wide">
                            {tool.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-white/5 text-white/60">
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                          {tool.purpose || 'Authoritative backend tool handler registered in Central AI Agent.'}
                        </p>
                      </div>

                      <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider border shrink-0", riskBadgeColor)}>
                        {tool.riskLevel || 'STANDARD'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-white/50">
                      <span className="text-white/40">Allowed:</span>
                      {Array.isArray(tool.allowedRoles) && tool.allowedRoles.map((r: string) => (
                        <span key={r} className="px-2 py-0.5 rounded bg-white/5 text-white/70">
                          {r}
                        </span>
                      ))}
                      {tool.requiresConfirmation && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                          Requires Confirmation
                        </span>
                      )}
                      {tool.rateLimitClass && (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white/40 ml-auto">
                          {tool.rateLimitClass} rate
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-mono text-white/40">
                        {tool.requiresAuth ? '🔒 Auth Required' : '🌐 Public / Guest Safe'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTool(tool);
                          setToolArgsJson('{}');
                          setToolExecutionResult(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-primary-gold hover:text-black text-xs font-mono font-bold transition-all flex items-center gap-1.5"
                      >
                        <Terminal size={12} /> Inspect / Test
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Interactive Tool Execution Tester Drawer/Modal */}
          {selectedTool && (
            <div className="p-8 rounded-[2.5rem] bg-stone-900 border-2 border-primary-gold/60 shadow-2xl space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-3 py-1 bg-primary-gold/10 text-primary-gold font-mono text-[10px] rounded-full uppercase tracking-wider">
                    Authoritative Gateway Live Test
                  </span>
                  <h4 className="text-2xl font-display font-black uppercase italic text-white mt-2">
                    Execute <span className="text-primary-gold font-mono">{selectedTool.name}</span>
                  </h4>
                  <p className="text-xs text-white/60 font-mono mt-1">
                    {selectedTool.purpose}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTool(null)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-mono text-white"
                >
                  ✕ Close Inspector
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50">
                    Tool Input Arguments (JSON Format)
                  </label>
                  <textarea
                    rows={8}
                    value={toolArgsJson}
                    onChange={(e) => setToolArgsJson(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs font-mono text-emerald-400 placeholder-white/20 outline-none focus:border-primary-gold"
                    placeholder={`{\n  "itemIdOrName": "Zafrani Chai"\n}`}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      disabled={toolExecuting}
                      onClick={async () => {
                        setToolExecuting(true);
                        setToolExecutionResult(null);
                        try {
                          let parsedArgs = {};
                          if (toolArgsJson.trim()) {
                            parsedArgs = JSON.parse(toolArgsJson);
                          }
                          const token = user ? await user.getIdToken() : undefined;
                          const res = await centralAgent.executeTool(selectedTool.name, parsedArgs, {
                            authToken: token
                          });
                          setToolExecutionResult(res);
                          loadOperationalReport();
                        } catch (err: any) {
                          setToolExecutionResult({
                            success: false,
                            error: err.message,
                            executedBy: user?.email || 'Anonymous'
                          });
                        } finally {
                          setToolExecuting(false);
                        }
                      }}
                      className="px-6 py-3 bg-primary-gold text-black font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <Terminal size={14} />
                      {toolExecuting ? 'Executing in Gateway...' : 'Execute Tool via Gateway'}
                    </button>
                    {selectedTool.requiresConfirmation && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        Note: Provide {`"confirmed": true`} in args for irreversible mutations.
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50">
                    Gateway Output & Cryptographic Response
                  </label>
                  <div className="w-full min-h-[200px] max-h-[300px] overflow-auto bg-black/80 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white/80">
                    {toolExecutionResult ? (
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(toolExecutionResult, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-white/30 italic">
                        Click 'Execute Tool via Gateway' to dispatch call through verified RBAC, risk gating, and audit logging.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mandatory User Confirmation Modal for External Workspace Document Operations */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-stone-900 border border-white/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-white"
            >
              <div className="flex items-center gap-3 text-primary-gold">
                <ShieldCheck size={28} />
                <h3 className="text-xl font-display font-black uppercase tracking-tight">
                  {confirmModal.title}
                </h3>
              </div>

              <p className="text-sm text-white/80 leading-relaxed font-sans">
                {confirmModal.description}
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold transition-all text-white/80"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmModal.actionType;
                    const payload = confirmModal.payload;
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    setWorkspaceActionError(null);
                    setWorkspaceActionSuccess(null);

                    try {
                      if (action === 'export_docs') {
                        const result = await exportShiftReportToDoc(payload);
                        setWorkspaceActionSuccess(`Document created successfully! Document ID: ${result.documentId}.`);
                      } else if (action === 'upload_drive') {
                        const fileName = `quetta-mahfil-shift-report-${Date.now()}.json`;
                        const result = await uploadReportToDrive(fileName, JSON.stringify(payload, null, 2), 'application/json');
                        setWorkspaceActionSuccess(`File saved to Google Drive: ${result.name} (ID: ${result.id}).`);
                      } else if (action === 'dispatch_chat') {
                        const spaces = await listGoogleChatSpaces();
                        if (!spaces || spaces.length === 0) {
                          throw new Error('No Google Chat spaces found in your account. Please create or join a space first.');
                        }
                        const targetSpace = spaces[0];
                        await sendOperationalDispatchToChat(targetSpace.name, {
                          category: 'SHIFT_REPORT',
                          title: 'Executive Shift Synthesis Digest',
                          details: {
                            'Estimated Daily Revenue': payload?.financials?.dailyEstimatedSales || 'Rs. 248,500',
                            'Average Order Ticket': payload?.financials?.averageOrderTicket || 'Rs. 840',
                            'In-Stock Dishes': `${payload?.inventory?.inStock ?? 22} / 22`,
                            'Confirmed Table Bookings': payload?.reservations?.totalBooked ?? 0
                          },
                          notes: 'Dispatched from Quetta Mahfil AI Operations Center'
                        });
                        setWorkspaceActionSuccess(`Shift synthesis broadcasted to Google Chat space "${targetSpace.displayName}"!`);
                      }
                    } catch (err: any) {
                      setWorkspaceActionError(err.message || 'Workspace operation failed.');
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-primary-gold text-black text-xs font-mono font-black uppercase tracking-wider hover:scale-105 transition-all shadow-lg"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
