import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  db 
} from '../lib/firebase';
import { useAuth } from './FirebaseProvider';
import { Team, ChatMessage } from '../types';
import { MessageSquare, Send, X, ChevronUp, ChevronDown, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  gameId: string;
  userTeam: Team;
}

export const Chat: React.FC<ChatProps> = ({ gameId, userTeam }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [lastBubble, setLastBubble] = useState<ChatMessage | null>(null);
  const bubbleTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameId) return;

    const q = query(
      collection(db, 'games', gameId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      const prevCount = messages.length;
      setMessages(msgs);
      
      if (msgs.length > prevCount && prevCount > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderId !== user?.uid) {
          if (!isOpen) {
            setHasNew(true);
            showBubble(lastMsg);
          }
        }
      }
    });

    const showBubble = (msg: ChatMessage) => {
      if (bubbleTimeout.current) clearTimeout(bubbleTimeout.current);
      setLastBubble(msg);
      bubbleTimeout.current = setTimeout(() => {
        setLastBubble(null);
      }, 5000);
    };

    return () => unsub();
  }, [gameId, isOpen, user?.uid, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !gameId) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await addDoc(collection(db, 'games', gameId, 'messages'), {
        senderId: user.uid,
        senderTeam: userTeam,
        text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNew(false);
      setLastBubble(null);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[5000] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {!isOpen && lastBubble && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-4 bg-slate-900/90 border border-sky-400/30 p-3 rounded-2xl rounded-br-none shadow-2xl backdrop-blur-md max-w-[240px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-3 h-3 text-red-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase text-red-400 tracking-tighter">COMUNICADO RIVAL</span>
            </div>
            <p className="text-[11px] text-white font-medium italic leading-tight">{lastBubble.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto flex flex-col items-end">
        <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 h-96 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl mb-4"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-black tracking-widest uppercase">COMUNICACIONES IN-GAME</span>
              </div>
              <button 
                onClick={toggleChat}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-500 font-mono text-center uppercase tracking-tighter">
                  Sin transmisiones activas.<br/>El silencio es parte de la estrategia.
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-tighter ${
                        msg.senderTeam === Team.ARGENTINA ? 'text-sky-400' : 'text-red-400'
                      }`}>
                        {msg.senderTeam}
                      </span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[11px] max-w-[85%] ${
                      msg.senderId === user?.uid 
                        ? 'bg-sky-500/20 text-sky-100 border border-sky-500/20 rounded-tr-none' 
                        : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-white/5 border-t border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="ENVIAR MENSAJE..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-[10px] text-white focus:outline-none focus:border-sky-500/50 placeholder:text-slate-600 transition-all uppercase font-mono"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-300 disabled:text-slate-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className={`relative p-4 rounded-full shadow-2xl border transition-all flex items-center gap-2 ${
          isOpen 
            ? 'bg-slate-800 border-white/20 text-white' 
            : 'bg-sky-600 border-sky-400 text-white'
        }`}
      >
        <MessageSquare className="w-6 h-6" />
        {hasNew && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          </span>
        )}
        {!isOpen && <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">CHAT DE GUERRA</span>}
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </motion.button>
      </div>
    </div>
  );
};
