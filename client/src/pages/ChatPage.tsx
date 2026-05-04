import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageSquare, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { usePageTracking } from '../hooks/usePageTracking';

// Relative paths work via Vite proxy — same origin, cookies work
const API_BASE = '/api';
// WebSocket must use absolute URL but same port as frontend (5173)
// Vite proxies /ws -> ws://localhost:3001/ws
const WS_CHAT_URL = "ws://localhost:3001/ws/chat";

type ChatMsg = {
  type: 'chat';
  userId: number;
  username: string;
  displayName: string;
  role: string;
  text: string;
  createdAt: string;
};

type SystemMsg = {
  type: 'system';
  text: string;
};

type DisplayMessage = ChatMsg | SystemMsg;

type IncomingFrame =
  | ChatMsg
  | { type: 'history'; messages: ChatMsg[] }
  | { type: 'user_joined'; displayName: string }
  | { type: 'user_left'; displayName: string }
  | { type: 'error'; message: string };

export function ChatPage() {
  usePageTracking('chat');
  const { user } = useAuth();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [wsError, setWsError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      // Fetch session ID from server so we can pass it to the WebSocket
      let sid: string | null = null;
      try {
        const res = await fetch(`${API_BASE}/auth/session-id`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = (await res.json()) as { sid: string };
          sid = data.sid;
          console.log('[chat] Got session ID:', sid);
        }
      } catch (err) {
        console.warn('[chat] Failed to get session ID:', err);
      }

      if (cancelled) return;

      const url = sid
        ? `${WS_CHAT_URL}?sid=${encodeURIComponent(sid)}`
        : WS_CHAT_URL;

      console.log('[chat] Connecting to:', url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setWsError('');
        console.log('[chat] Connected');
      };

      ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(ev.data as string) as IncomingFrame;
          if (frame.type === 'history') {
            setMessages(frame.messages.map((m) => ({ ...m })));
            return;
          }
          if (frame.type === 'chat') {
            setMessages((prev) => [...prev, { ...frame }]);
            return;
          }
          if (frame.type === 'user_joined') {
            setMessages((prev) => [
              ...prev,
              { type: 'system', text: `${frame.displayName} joined the chat` },
            ]);
            return;
          }
          if (frame.type === 'user_left') {
            setMessages((prev) => [
              ...prev,
              { type: 'system', text: `${frame.displayName} left the chat` },
            ]);
            return;
          }
          if (frame.type === 'error') {
            console.error('[chat] Server error:', frame.message);
            setWsError(frame.message);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = (e) => {
        console.error('[chat] WebSocket error:', e);
        setWsError('WebSocket connection error.');
      };
      ws.onclose = (e) => {
        console.log('[chat] WebSocket closed:', e.code, e.reason);
        setConnected(false);
      };
    }

    void connect();

    return () => {
      cancelled = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', text: trimmed }));
    setText('');
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Live Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-sm text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {wsError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {wsError}
        </div>
      )}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Chat Room</CardTitle>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>Logged in as</span>
              <Badge className="bg-blue-600 text-white text-xs">{user?.displayName}</Badge>
              <Badge
                variant="outline"
                className={`text-xs ${user?.role === 'ADMIN' ? 'border-purple-300 text-purple-700' : 'border-gray-300 text-gray-600'}`}
              >
                {user?.role}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-[480px] overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No messages yet. Say hello!</p>
            )}
            {messages.map((msg, i) => {
              if (msg.type === 'system') {
                return (
                  <div key={i} className="text-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                );
              }
              const isOwn = msg.userId === user?.id;
              return (
                <div key={i} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold text-white ${msg.role === 'ADMIN' ? 'bg-purple-600' : 'bg-blue-600'}`}
                  >
                    {msg.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    <div className={`flex items-center gap-1.5 text-xs text-gray-500 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium text-gray-700">{msg.displayName}</span>
                      {msg.role === 'ADMIN' && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">
                          ADMIN
                        </Badge>
                      )}
                      <span>{formatTime(msg.createdAt)}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${isOwn ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={connected ? 'Type a message… (Enter to send)' : 'Connecting…'}
                disabled={!connected}
                className="bg-gray-50 border-gray-200"
              />
              <Button
                onClick={sendMessage}
                disabled={!connected || !text.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}