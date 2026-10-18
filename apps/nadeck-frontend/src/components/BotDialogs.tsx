/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Bot, Hand, Loader2, MessageCircle, Send, UserRound } from 'lucide-react';
import { Language } from '../types';

// The Telegram bot's private chats (GET /api/admin/dialogs). A manager can read any of them and
// answer in the bot's place: the reply reaches the customer from the bot itself, and the
// advisor then stays quiet for an hour (every reply restarts that) or until handed back.

interface DialogMessage {
  id: string;
  role: 'customer' | 'bot' | 'operator';
  text: string;
  orderId: string | null;
  createdAt: string;
}

interface DialogSummary {
  id: string;
  telegramId: string;
  username: string | null;
  name: string;
  paused: boolean;
  pausedUntil: string | null;
  lastMessageAt: string;
  lastMessage: DialogMessage | null;
}

interface DialogDetail extends Omit<DialogSummary, 'lastMessage'> {
  messages: DialogMessage[];
}

interface BotDialogsProps {
  currentLang: Language;
  token?: string;
}

// New customer messages should show up while the manager is looking, without a refresh button.
const POLL_MS = 5000;

export default function BotDialogs({ currentLang, token }: BotDialogsProps) {
  const isRu = currentLang === 'ru';
  const [dialogs, setDialogs] = useState<DialogSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DialogDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);

  const api = async (path: string, init?: RequestInit) => {
    const res = await fetch(`/api/admin/dialogs${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || `${res.status}`);
    }
    return res.json();
  };

  const loadList = () =>
    api('')
      .then((list: DialogSummary[]) => setDialogs(list))
      .catch((err) => setErrorMsg(String(err.message || err)));

  const loadDetail = (id: string) =>
    api(`/${id}`)
      .then((d: DialogDetail) => setDetail((prev) => (prev === null || prev.id === id ? d : prev)))
      .catch((err) => setErrorMsg(String(err.message || err)));

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, POLL_MS);
    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    setDetail(null);
    lastSeenCount.current = 0;
    if (!selectedId) return;
    loadDetail(selectedId);
    const timer = setInterval(() => loadDetail(selectedId), POLL_MS);
    return () => clearInterval(timer);
  }, [selectedId, token]);

  // Scroll to the newest message when the chat opens or a new message arrives - not on every poll.
  useEffect(() => {
    if (detail && detail.messages.length !== lastSeenCount.current) {
      lastSeenCount.current = detail.messages.length;
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [detail]);

  const handleSend = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setErrorMsg('');
    try {
      await api(`/${selectedId}/reply`, { method: 'POST', body: JSON.stringify({ text: draft }) });
      setDraft('');
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch (err: any) {
      setErrorMsg(String(err.message || err));
    } finally {
      setSending(false);
    }
  };

  const setPaused = async (paused: boolean) => {
    if (!selectedId) return;
    setErrorMsg('');
    try {
      await api(`/${selectedId}`, { method: 'PATCH', body: JSON.stringify({ paused }) });
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch (err: any) {
      setErrorMsg(String(err.message || err));
    }
  };

  const locale = isRu ? 'ru-RU' : 'en-US';
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay
      ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const titleOf = (d: { name: string; username: string | null; telegramId: string }) => d.name || (d.username ? `@${d.username}` : `id ${d.telegramId}`);

  const roleLabel: Record<DialogMessage['role'], string> = {
    customer: isRu ? 'Клиент' : 'Customer',
    bot: isRu ? 'Бот' : 'Bot',
    operator: isRu ? 'Менеджер' : 'Manager',
  };

  return (
    <div className="space-y-4" id="view-admin-dialogs">
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1 break-words">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-black">×</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Conversation list - hidden on phones while a chat is open */}
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden ${selectedId ? 'hidden md:block' : ''}`}>
          <div className="px-5 py-4 border-b border-slate-100 text-xs font-extrabold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-slate-400" />
            {isRu ? 'Чаты с ботом в Telegram' : 'Telegram bot chats'}
          </div>
          {dialogs === null ? (
            <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : dialogs.length === 0 ? (
            <p className="p-6 text-xs text-slate-400 font-semibold">
              {isRu ? 'Пока никто не писал боту в личку. Диалоги появятся здесь с первым сообщением.' : 'No one has messaged the bot privately yet.'}
            </p>
          ) : (
            <ul className="max-h-[65vh] overflow-y-auto divide-y divide-slate-50">
              {dialogs.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setSelectedId(d.id)}
                    className={`w-full text-left px-5 py-3 transition-colors ${selectedId === d.id ? 'bg-nadeck-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 truncate">{titleOf(d)}</span>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">{formatTime(d.lastMessageAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {d.paused && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
                          {isRu ? 'менеджер' : 'manager'}
                        </span>
                      )}
                      <span className={`text-[11px] truncate ${d.lastMessage?.role === 'customer' ? 'font-bold text-slate-700' : 'text-slate-400'}`}>
                        {d.lastMessage ? `${d.lastMessage.role === 'customer' ? '' : `${roleLabel[d.lastMessage.role]}: `}${d.lastMessage.text}` : ''}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open conversation */}
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-xs flex flex-col min-h-[50vh] ${selectedId ? '' : 'hidden md:flex'}`}>
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center p-6 text-xs text-slate-400 font-semibold">
              {isRu ? 'Выберите диалог слева' : 'Pick a chat on the left'}
            </div>
          ) : !detail ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                <button onClick={() => setSelectedId(null)} className="md:hidden text-slate-400" aria-label={isRu ? 'Назад' : 'Back'}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-slate-900 truncate">{titleOf(detail)}</div>
                  {detail.username && (
                    <a href={`https://t.me/${detail.username}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-nadeck-600">
                      @{detail.username}
                    </a>
                  )}
                </div>
                {detail.paused ? (
                  <button
                    onClick={() => setPaused(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white"
                    title={detail.pausedUntil ? `${isRu ? 'Бот вернётся сам в' : 'Bot resumes at'} ${formatTime(detail.pausedUntil)}` : undefined}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {isRu ? 'Вернуть боту' : 'Hand back to bot'}
                  </button>
                ) : (
                  <button
                    onClick={() => setPaused(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    {isRu ? 'Остановить бота' : 'Pause the bot'}
                  </button>
                )}
              </div>

              {detail.paused && detail.pausedUntil && (
                <div className="px-5 py-2 bg-amber-50 text-[11px] font-semibold text-amber-800">
                  {isRu
                    ? `Бот молчит, отвечаете вы. Он вернётся сам в ${formatTime(detail.pausedUntil)}, если не писать дальше.`
                    : `The bot is quiet while you answer. It resumes at ${formatTime(detail.pausedUntil)} unless you keep replying.`}
                </div>
              )}

              <div className="flex-1 overflow-y-auto max-h-[55vh] px-4 py-4 space-y-2 bg-slate-50/50">
                {detail.messages.map((m) => {
                  const mine = m.role !== 'customer';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                          m.role === 'customer'
                            ? 'bg-white border border-slate-100 text-slate-800'
                            : m.role === 'operator'
                              ? 'bg-amber-100 text-amber-950'
                              : 'bg-nadeck-600 text-white'
                        }`}
                      >
                        <div className={`mb-0.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-wide ${m.role === 'bot' ? 'text-white/70' : 'text-slate-400'}`}>
                          {m.role === 'customer' ? <UserRound className="w-3 h-3" /> : m.role === 'bot' ? <Bot className="w-3 h-3" /> : <Hand className="w-3 h-3" />}
                          {roleLabel[m.role]} · {formatTime(m.createdAt)}
                          {m.orderId && <span> · {isRu ? 'заказ' : 'order'} {m.orderId}</span>}
                        </div>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="border-t border-slate-100 p-3 flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
                  }}
                  rows={2}
                  maxLength={4096}
                  placeholder={isRu ? 'Ответить от имени бота… (Enter — отправить)' : 'Reply as the bot… (Enter to send)'}
                  className="flex-1 resize-none rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:border-nadeck-600"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="h-10 w-10 shrink-0 rounded-2xl bg-nadeck-600 text-white flex items-center justify-center disabled:opacity-40"
                  aria-label={isRu ? 'Отправить' : 'Send'}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
