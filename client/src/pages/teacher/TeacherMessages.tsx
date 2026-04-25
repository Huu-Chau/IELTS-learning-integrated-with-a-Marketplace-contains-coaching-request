import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeacherLayout from '@/layouts/TeacherLayout';
import {
    Send,
    Video,
    Link as LinkIcon,
    Search,
    MessageSquare,
    X,
    Loader2,
    ChevronRight,
    Copy,
    Check,
} from 'lucide-react';
import { useTeacherApi, useTeacherMutation } from '@/hooks/useTeacherApi';
import { useAuth } from '@/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OtherUser {
    id: string;
    name: string;
    email: string;
}

interface Conversation {
    conversationId: string;
    otherId: string;
    otherUser: OtherUser;
    lastMessage: string;
    lastAt: string;
    unreadCount: number;
}

interface Message {
    id: number;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'text' | 'meeting_link';
    isRead: boolean;
    sentAt: string;
}

// ── Meeting Link Modal ────────────────────────────────────────────────────────

function MeetingLinkModal({ onSend, onClose }: { onSend: (url: string) => void; onClose: () => void }) {
    const [url, setUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-indigo-600" />
                        <h2 className="font-bold text-gray-900">Share Meeting Link</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-gray-500">Paste a Google Meet, Zoom, or Teams link to share with your student.</p>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                id="meeting-link-input"
                                type="url"
                                placeholder="https://meet.google.com/..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleCopy}
                            disabled={!url}
                            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            id="send-meeting-link"
                            onClick={() => { if (url) { onSend(url); onClose(); } }}
                            disabled={!url}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
                        >
                            Send Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
    const isMeetingLink = msg.type === 'meeting_link';
    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
                className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 ${
                    isMine
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                }`}
            >
                {isMeetingLink ? (
                    <a
                        href={msg.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm font-medium underline ${isMine ? 'text-indigo-200' : 'text-indigo-600'}`}
                    >
                        <Video className="h-4 w-4 flex-shrink-0" />
                        Join Meeting
                    </a>
                ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-300' : 'text-gray-400'} text-right`}>
                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeacherMessages() {
    console.log('[TeacherMessages] render called');

    const { conversationId: paramConvId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [activeConvId, setActiveConvId] = useState<string | null>(paramConvId ?? null);
    const [activeReceiverId, setActiveReceiverId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [showMeetingModal, setShowMeetingModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const { data: conversations, loading: convsLoading, refetch: refetchConversations } = useTeacherApi<Conversation[]>('/teacher/conversations');

    // Poll messages every 2 seconds when a conversation is open.
    // Use null when no conversation is selected to avoid a spurious duplicate fetch.
    const { data: messages, loading: msgsLoading, refetch: refetchMessages } = useTeacherApi<Message[]>(
        activeConvId ? `/teacher/messages/${activeConvId}` : null,
        activeConvId ? { pollingMs: 2000 } : undefined
    );

    const { post, loading: sending } = useTeacherMutation();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Bug #3 fix: when arriving via a direct URL (e.g. from a notification),
    // activeConvId is seeded from the URL param but activeReceiverId is null.
    // As soon as conversations load, resolve the receiver from the conversation list.
    useEffect(() => {
        if (paramConvId && conversations && !activeReceiverId) {
            console.log('[TeacherMessages] resolving receiverId from URL param', { paramConvId });
            const conv = conversations.find((c) => c.conversationId === paramConvId);
            if (conv) {
                setActiveReceiverId(conv.otherId);
            }
        }
    }, [paramConvId, conversations, activeReceiverId]);

    const handleSelectConv = useCallback((conv: Conversation) => {
        console.log('[TeacherMessages] handleSelectConv called', { convId: conv.conversationId });
        setActiveConvId(conv.conversationId);
        setActiveReceiverId(conv.otherId);
        navigate(`/teacher/messages/${conv.conversationId}`, { replace: true });
    }, [navigate]);

    const handleSend = async (content: string, type: 'text' | 'meeting_link' = 'text') => {
        if (sending) return;
        if (!content.trim() || !activeReceiverId) return;
        console.log('[TeacherMessages] handleSend called', { content, type });
        try {
            await post(`/teacher/messages/${activeReceiverId}`, { content, type });
            setMessageInput('');
            // Refresh both: message thread and left-panel preview (lastMessage text)
            refetchMessages();
            refetchConversations();
        } catch (err) {
            console.error('[TeacherMessages] handleSend error', err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sending) {
                handleSend(messageInput);
            }
        }
    };

    const filteredConvs = conversations?.filter((c) =>
        c.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

    const activeConv = conversations?.find((c) => c.conversationId === activeConvId);
    const thisMessages: Message[] = activeConvId && Array.isArray(messages) ? messages as Message[] : [];

    return (
        <TeacherLayout>
            {showMeetingModal && (
                <MeetingLinkModal
                    onSend={(url) => handleSend(url, 'meeting_link')}
                    onClose={() => setShowMeetingModal(false)}
                />
            )}

            <div className="h-[calc(100vh-9rem)] flex bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* ── LEFT: Conversation list ──────────────────────────── */}
                <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col">
                    <div className="px-4 py-4 border-b border-gray-50">
                        <h2 className="font-bold text-gray-800 mb-3">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                id="message-search"
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {convsLoading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                                            <div className="h-2.5 bg-gray-100 rounded w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConvs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center">
                                <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                                <p className="text-sm text-gray-400">No conversations yet.</p>
                                <p className="text-xs text-gray-300 mt-1">Students will appear here after you accept their orders.</p>
                            </div>
                        ) : (
                            filteredConvs.map((conv) => (
                                <button
                                    key={conv.conversationId}
                                    id={`conv-${conv.conversationId}`}
                                    onClick={() => handleSelectConv(conv)}
                                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                                        activeConvId === conv.conversationId ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                                    }`}
                                >
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
                                        {conv.otherUser.name[0]?.toUpperCase() ?? 'S'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{conv.otherUser.name}</p>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                                {new Date(conv.lastAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="ml-1 flex-shrink-0 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Chat window ───────────────────────────────── */}
                {!activeConvId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                        <div className="p-5 bg-indigo-50 rounded-full mb-5">
                            <MessageSquare className="h-10 w-10 text-indigo-400" />
                        </div>
                        <h3 className="font-semibold text-gray-700 text-lg">Your messages</h3>
                        <p className="text-gray-400 text-sm mt-1.5 max-w-xs">
                            Select a conversation from the left panel to start chatting with your students.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Chat header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 flex items-center justify-center text-sm font-bold text-indigo-700">
                                    {activeConv?.otherUser.name[0]?.toUpperCase() ?? 'S'}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">{activeConv?.otherUser.name ?? 'Student'}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium">Active</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    id="share-meeting-link-btn"
                                    onClick={() => setShowMeetingModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    <Video className="h-4 w-4 text-indigo-500" />
                                    Share Meeting Link
                                </button>
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/50">
                            {msgsLoading && thisMessages.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                                </div>
                            ) : thisMessages.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-gray-400 text-sm">No messages yet. Say hello! 👋</p>
                                </div>
                            ) : (
                                thisMessages.map((msg) => (
                                    <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === user?.uid} />
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <div className="px-5 py-4 border-t border-gray-100 bg-white">
                            <div className="flex items-end gap-3">
                                <textarea
                                    id="message-input"
                                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none max-h-28 overflow-y-auto"
                                />
                                <button
                                    id="send-message-btn"
                                    onClick={() => handleSend(messageInput)}
                                    disabled={!messageInput.trim() || sending}
                                    className="p-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex-shrink-0"
                                >
                                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
