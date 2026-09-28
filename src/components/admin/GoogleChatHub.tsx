import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Plus, 
  RefreshCw, 
  Users, 
  Flame, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Radio, 
  FileSpreadsheet, 
  Crown,
  ChefHat,
  BellRing,
  ExternalLink,
  Info,
  Building2
} from 'lucide-react';
import { 
  listGoogleChatSpaces, 
  listGoogleChatMessages, 
  sendGoogleChatMessage, 
  createGoogleChatSpace, 
  sendOperationalDispatchToChat,
  GoogleChatSpace, 
  GoogleChatMessage 
} from '../../services/googleChatService';
import { signInWithGoogleWorkspace, hasWorkspaceToken, clearWorkspaceToken } from '../../services/googleWorkspaceAuth';
import { centralAgent, OperationalReport } from '../../services/centralAgentService';
import { cn } from '../../lib/utils';

export default function GoogleChatHub() {
  const [connected, setConnected] = useState<boolean>(hasWorkspaceToken());
  const [connecting, setConnecting] = useState<boolean>(false);
  const [spaces, setSpaces] = useState<GoogleChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<GoogleChatSpace | null>(null);
  const [messages, setMessages] = useState<GoogleChatMessage[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [composerText, setComposerText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [operationalReport, setOperationalReport] = useState<OperationalReport | null>(null);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Space Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSpaceName, setNewSpaceName] = useState<string>('');
  const [newSpaceDesc, setNewSpaceDesc] = useState<string>('');
  const [creatingSpace, setCreatingSpace] = useState<boolean>(false);

  // Mandatory Explicit Confirmation Dialog State (Per Workspace Integration Skill)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    targetSpaceName?: string;
    contentPreview?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {}
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected) {
      loadSpaces();
      loadOperationalReport();
    }
  }, [connected]);

  useEffect(() => {
    if (selectedSpace) {
      loadMessages(selectedSpace.name);
    }
  }, [selectedSpace]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOperationalReport = async () => {
    try {
      const data = await centralAgent.getOperationalReport();
      setOperationalReport(data);
    } catch {
      // Non-blocking
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setStatusMessage(null);
    try {
      await signInWithGoogleWorkspace();
      setConnected(true);
      setStatusMessage({ type: 'success', text: 'Connected to Google Chat & Google Workspace successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to authorize Google Chat.' });
    } finally {
      setConnecting(false);
    }
  };

  const loadSpaces = async () => {
    setLoadingSpaces(true);
    setStatusMessage(null);
    try {
      const list = await listGoogleChatSpaces();
      setSpaces(list);
      if (list.length > 0 && !selectedSpace) {
        setSelectedSpace(list[0]);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Could not load Google Chat spaces.' });
    } finally {
      setLoadingSpaces(false);
    }
  };

  const loadMessages = async (spaceName: string) => {
    setLoadingMessages(true);
    try {
      const list = await listGoogleChatMessages(spaceName);
      setMessages(list);
    } catch (err: any) {
      console.warn('Could not load space messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Prompts user with mandatory confirmation before sending any message
  const triggerSendMessage = (textToSend?: string) => {
    const text = textToSend || composerText;
    if (!text.trim() || !selectedSpace) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Send Google Chat Message',
      description: `You are about to post a message to "${selectedSpace.displayName}". Google Workspace requires your explicit confirmation before messages are sent on your behalf.`,
      targetSpaceName: selectedSpace.displayName,
      contentPreview: text,
      onConfirm: async () => {
        setSending(true);
        setStatusMessage(null);
        try {
          await sendGoogleChatMessage(selectedSpace.name, text);
          setComposerText('');
          setStatusMessage({ type: 'success', text: `Message posted successfully to "${selectedSpace.displayName}".` });
          await loadMessages(selectedSpace.name);
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Failed to send Google Chat message.' });
        } finally {
          setSending(false);
        }
      }
    });
  };

  // Prompts user with mandatory confirmation before dispatching structured template
  const triggerOperationalDispatch = (
    category: 'ORDER_DISPATCH' | 'SHIFT_REPORT' | 'KITCHEN_ALERT' | 'VIP_RESERVATION' | 'GENERAL_ANNOUNCEMENT',
    title: string,
    details: Record<string, any>,
    notes?: string
  ) => {
    if (!selectedSpace) return;

    const summaryText = Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    setConfirmDialog({
      isOpen: true,
      title: `Dispatch ${title} to Google Chat`,
      description: `Are you sure you want to broadcast this operational dispatch to "${selectedSpace.displayName}"? This will alert team members and staff on Google Chat.`,
      targetSpaceName: selectedSpace.displayName,
      contentPreview: `[${category}] ${title}\n${summaryText}${notes ? `\nNotes: ${notes}` : ''}`,
      onConfirm: async () => {
        setSending(true);
        setStatusMessage(null);
        try {
          await sendOperationalDispatchToChat(selectedSpace.name, {
            category,
            title,
            priority: category === 'KITCHEN_ALERT' ? 'HIGH' : 'NORMAL',
            details,
            notes
          });
          setStatusMessage({ type: 'success', text: `Operational alert "${title}" dispatched to "${selectedSpace.displayName}".` });
          await loadMessages(selectedSpace.name);
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Failed to dispatch operational message.' });
        } finally {
          setSending(false);
        }
      }
    });
  };

  // Prompts user with mandatory confirmation before creating a new Google Chat space
  const triggerCreateSpace = () => {
    if (!newSpaceName.trim()) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Create Google Chat Space',
      description: `This will create a new permanent space named "${newSpaceName.trim()}" in your organization's Google Chat. Do you wish to continue?`,
      targetSpaceName: newSpaceName.trim(),
      contentPreview: newSpaceDesc ? `Description: ${newSpaceDesc}` : undefined,
      onConfirm: async () => {
        setCreatingSpace(true);
        setStatusMessage(null);
        try {
          const newSpace = await createGoogleChatSpace(newSpaceName, newSpaceDesc);
          setShowCreateModal(false);
          setNewSpaceName('');
          setNewSpaceDesc('');
          setStatusMessage({ type: 'success', text: `Space "${newSpace.displayName}" created successfully.` });
          await loadSpaces();
          setSelectedSpace(newSpace);
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Failed to create space.' });
        } finally {
          setCreatingSpace(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6 text-white">
      {/* Top Banner & Status */}
      <div className="p-8 rounded-[2.5rem] bg-gradient-to-r from-stone-900 via-stone-900/95 to-blue-950/40 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500 text-white font-mono font-black text-[9px] uppercase tracking-widest rounded-full flex items-center gap-1.5">
                <MessageSquare size={12} /> Google Chat v1 Integration
              </span>
              <span className="text-xs font-mono text-white/50">Enterprise Collaboration Node</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-display font-black uppercase italic tracking-tight">
              Restaurant <span className="text-blue-400">Team Chat Hub</span>
            </h2>
            <p className="text-xs text-white/60 font-sans mt-1 max-w-xl leading-relaxed">
              Connect Quetta Mahfil kitchen, floor staff, and executive managers with live Google Chat spaces. Broadcast orders, coordinate shift handovers, and sync daily sales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="gsi-material-button px-6 py-3.5 bg-white text-stone-900 hover:bg-stone-100 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-3 shadow-xl transition-all"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                {connecting ? 'Connecting...' : 'Sign in with Google'}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-mono font-bold flex items-center gap-2">
                  <CheckCircle2 size={14} /> Google Workspace Connected
                </span>
                <button
                  onClick={() => {
                    clearWorkspaceToken();
                    setConnected(false);
                    setSpaces([]);
                    setSelectedSpace(null);
                    setMessages([]);
                  }}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-mono text-white/50 hover:text-white transition-all"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div className={cn(
          "p-4 rounded-2xl border text-xs font-mono flex items-center justify-between transition-all",
          statusMessage.type === 'success' 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          <span className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {statusMessage.text}
          </span>
          <button onClick={() => setStatusMessage(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Workspace Interface */}
      {!connected ? (
        <div className="p-12 rounded-[2.5rem] bg-stone-950 border border-white/10 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto">
            <MessageSquare size={36} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-2xl font-display font-black uppercase italic">Google Chat Authentication Required</h3>
            <p className="text-xs text-white/60 font-sans leading-relaxed">
              Connect your Google Workspace account to sync restaurant communication channels, send live operational alerts to your staff, and dispatch daily kitchen shift metrics with permission from your account.
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:scale-105 inline-flex items-center gap-3"
          >
            <MessageSquare size={16} />
            {connecting ? 'Authorizing Google...' : 'Authorize Google Chat Access'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Spaces List (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-[2rem] bg-stone-950 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-display font-black uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-blue-400" />
                  Chat Spaces ({spaces.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={loadSpaces}
                    disabled={loadingSpaces}
                    title="Refresh Spaces"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                  >
                    <RefreshCw size={13} className={loadingSpaces ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    title="Create New Channel"
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {loadingSpaces ? (
                <div className="py-8 text-center text-xs font-mono text-white/40 animate-pulse">
                  Loading Google Chat spaces...
                </div>
              ) : spaces.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-white/40 font-mono">No spaces found in your Google account.</p>
                  <button
                    onClick={() => {
                      setNewSpaceName('Quetta Mahfil — Kitchen & Operations');
                      setNewSpaceDesc('Real-time kitchen orders, shift handovers, and restaurant management');
                      setShowCreateModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-mono hover:bg-blue-600/30 transition-all"
                  >
                    + Create Operations Channel
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto no-scrollbar pr-1">
                  {spaces.map((space) => {
                    const isSelected = selectedSpace?.name === space.name;
                    return (
                      <button
                        key={space.name}
                        onClick={() => setSelectedSpace(space)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3",
                          isSelected
                            ? "bg-blue-600/15 border-blue-500/40 text-white shadow-lg"
                            : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-xs truncate">{space.displayName}</span>
                          </div>
                          <p className="text-[10px] text-white/40 font-mono truncate">
                            {space.spaceDetails?.description || space.name}
                          </p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-mono uppercase tracking-wider text-white/60">
                          {space.type === 'DIRECT_MESSAGE' ? 'DM' : 'Space'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Dispatch Presets Card */}
            <div className="p-6 rounded-[2rem] bg-stone-950 border border-white/10 space-y-3">
              <h4 className="text-xs font-display font-black uppercase tracking-wider flex items-center gap-2 text-primary-gold">
                <ChefHat size={15} /> 1-Click Operational Dispatches
              </h4>
              <p className="text-[10px] text-white/40 font-mono">
                Formats authoritative alerts and prompts for confirmation before posting to the selected space.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    triggerOperationalDispatch(
                      'SHIFT_REPORT',
                      'Executive Shift Sales Digest',
                      {
                        'Estimated Daily Sales': operationalReport?.financials?.dailyEstimatedSales || 'Rs. 248,500',
                        'Average Ticket': operationalReport?.financials?.averageOrderTicket || 'Rs. 840',
                        'In-Stock Items': `${operationalReport?.inventory?.inStock ?? 22} / 22`,
                        'Active Table Bookings': operationalReport?.reservations?.totalBooked ?? 0
                      },
                      'Generated via Central Restaurant AI Engine'
                    );
                  }}
                  disabled={!selectedSpace || sending}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono flex items-center gap-2 text-white/80 hover:text-white transition-all disabled:opacity-40"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>Post Daily Shift Synthesis</span>
                </button>

                <button
                  onClick={() => {
                    triggerOperationalDispatch(
                      'KITCHEN_ALERT',
                      'Kitchen 86 Stock Notice',
                      {
                        'Status': 'OUT OF STOCK (86)',
                        'Affected Item': 'Special Khoya Khajor Shake',
                        'Reason': 'Exhausted evening date supply',
                        'Kitchen Action': 'Halt taking orders on floor'
                      },
                      'Please inform servers and customers immediately.'
                    );
                  }}
                  disabled={!selectedSpace || sending}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono flex items-center gap-2 text-white/80 hover:text-white transition-all disabled:opacity-40"
                >
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span>Broadcast 86 (Stock Out) Alert</span>
                </button>

                <button
                  onClick={() => {
                    triggerOperationalDispatch(
                      'VIP_RESERVATION',
                      'VIP Hujra Lounge Arrival',
                      {
                        'Lounge': 'Executive Royal Hujra',
                        'Guests': '6 Pax',
                        'Service Notes': 'Prepare fresh Matka Chai & Zafrani sampler on arrival'
                      },
                      'VIP Protocol active.'
                    );
                  }}
                  disabled={!selectedSpace || sending}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono flex items-center gap-2 text-white/80 hover:text-white transition-all disabled:opacity-40"
                >
                  <Crown size={14} className="text-primary-gold" />
                  <span>Notify VIP Guest Arrival</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Active Space Feed & Composer (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-[700px] rounded-[2rem] bg-stone-950 border border-white/10 overflow-hidden shadow-2xl">
            {/* Space Header */}
            <div className="p-5 bg-stone-900 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-display font-black uppercase italic tracking-wide text-white">
                    {selectedSpace ? selectedSpace.displayName : 'Select a Google Chat Space'}
                  </h3>
                  {selectedSpace && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-mono">
                      ACTIVE_ROOM
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">
                  {selectedSpace?.spaceDetails?.description || (selectedSpace ? selectedSpace.name : 'Choose a channel from the left panel')}
                </p>
              </div>

              {selectedSpace && (
                <button
                  onClick={() => loadMessages(selectedSpace.name)}
                  disabled={loadingMessages}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                  title="Reload Messages"
                >
                  <RefreshCw size={14} className={loadingMessages ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 no-scrollbar bg-black/40">
              {!selectedSpace ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-3">
                  <MessageSquare size={40} />
                  <p className="text-xs font-mono">Please select or create a space to view Google Chat messages.</p>
                </div>
              ) : loadingMessages ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-white/40 animate-pulse">
                  Fetching Google Chat message stream...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/40 space-y-3">
                  <Building2 size={36} className="text-white/20" />
                  <p className="text-xs font-mono">No messages in this space yet.</p>
                  <p className="text-[10px] text-white/30 max-w-sm">Use the composer below to post your first operational note or dispatch to your team.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isBot = m.sender?.type === 'BOT';
                  const formattedTime = new Date(m.createTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={m.name} className="flex items-start gap-3 text-xs">
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 font-bold font-mono text-[10px]">
                        {m.sender?.displayName?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 max-w-2xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white/90">{m.sender?.displayName || 'Team Member'}</span>
                          {isBot && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[8px] font-mono">
                              BOT
                            </span>
                          )}
                          <span className="text-[10px] text-white/30 font-mono">{formattedTime}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-white/80 leading-relaxed font-sans whitespace-pre-wrap">
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="p-4 bg-stone-900 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && triggerSendMessage()}
                  placeholder={selectedSpace ? `Write message to #${selectedSpace.displayName}...` : "Select a space first"}
                  disabled={!selectedSpace || sending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-400 font-sans transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => triggerSendMessage()}
                  disabled={!selectedSpace || !composerText.trim() || sending}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40 disabled:hover:bg-blue-600"
                >
                  <Send size={14} /> Send
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 px-1">
                <span>Requires explicit confirmation dialog before sending</span>
                <span>Google Chat API v1</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create New Space Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-stone-900 border border-white/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <h3 className="text-xl font-display font-black uppercase italic">Create Chat Space</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-white/40 hover:text-white">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-white/50 mb-1">Channel / Space Name</label>
                  <input
                    type="text"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    placeholder="e.g. Quetta Mahfil — Kitchen Dispatch"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-blue-400 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-white/50 mb-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={newSpaceDesc}
                    onChange={(e) => setNewSpaceDesc(e.target.value)}
                    placeholder="e.g. Channel for live order alerts, chef dispatch, and stock coordination."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-blue-400 font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold transition-all text-white/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={triggerCreateSpace}
                  disabled={!newSpaceName.trim() || creatingSpace}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Create Channel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Mandatory Explicit Confirmation Dialog (Workspace Integration Skill) */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-stone-900 border border-blue-500/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-white"
            >
              <div className="flex items-center gap-3 text-blue-400">
                <ShieldCheck size={28} />
                <h3 className="text-xl font-display font-black uppercase tracking-tight">
                  {confirmDialog.title}
                </h3>
              </div>

              <p className="text-sm text-white/80 leading-relaxed font-sans">
                {confirmDialog.description}
              </p>

              {confirmDialog.targetSpaceName && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs font-mono text-white/90">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider mb-1">Target Space:</span>
                  #{confirmDialog.targetSpaceName}
                </div>
              )}

              {confirmDialog.contentPreview && (
                <div className="space-y-1">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider font-mono">Message Preview:</span>
                  <div className="p-4 bg-black/60 rounded-2xl border border-white/10 text-xs font-mono text-white/80 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {confirmDialog.contentPreview}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold transition-all text-white/80"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    await action();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-black uppercase tracking-wider transition-all shadow-lg hover:scale-105"
                >
                  Confirm & Post
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
