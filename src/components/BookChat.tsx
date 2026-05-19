import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { page: number; similarity: number }[];
}

interface BookChatProps {
  apiUrl?: string;
  book?: string;
  placeholder?: string;
  title?: string;
}

export default function BookChat({
  apiUrl = 'http://localhost:8000',
  book = 'Das passende Leben',
  placeholder = 'Stelle eine Frage zum Buch...',
  title = 'Buch-Assistent',
}: BookChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const endpoint = mode === 'agent' ? '/agent' : '/ask';
      const body = mode === 'agent'
        ? { task: userMessage, book, max_steps: 5 }
        : { question: userMessage, book, num_context: 5 };

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="book-chat">
      <div className="book-chat-header">
        <h3>{title}</h3>
        <div className="book-chat-mode">
          <button
            className={mode === 'ask' ? 'active' : ''}
            onClick={() => setMode('ask')}
          >
            Fragen
          </button>
          <button
            className={mode === 'agent' ? 'active' : ''}
            onClick={() => setMode('agent')}
          >
            Agent
          </button>
        </div>
      </div>

      <div className="book-chat-messages">
        {messages.length === 0 && (
          <div className="book-chat-empty">
            <p>Stelle eine Frage zu "{book}"</p>
            <div className="book-chat-suggestions">
              <button onClick={() => setInput('Was sind die Hauptthesen?')}>
                Hauptthesen
              </button>
              <button onClick={() => setInput('Fasse das Buch zusammen')}>
                Zusammenfassung
              </button>
              <button onClick={() => setInput('Was sagt das Buch über Kindheit?')}>
                Kindheit
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`book-chat-message ${msg.role}`}>
            <div className="book-chat-message-content">
              {msg.content}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="book-chat-sources">
                Quellen: {msg.sources.map(s => `S.${s.page}`).join(', ')}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="book-chat-message assistant">
            <div className="book-chat-loading">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="book-chat-input">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          Senden
        </button>
      </div>

      <style>{`
        .book-chat {
          display: flex;
          flex-direction: column;
          height: 500px;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 12px;
          background: var(--color-bg, #fff);
          overflow: hidden;
        }

        .book-chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--color-border, #e0e0e0);
          background: var(--color-bg-secondary, #f5f5f5);
        }

        .book-chat-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .book-chat-mode {
          display: flex;
          gap: 0.5rem;
        }

        .book-chat-mode button {
          padding: 0.3rem 0.8rem;
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 20px;
          background: transparent;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .book-chat-mode button.active {
          background: var(--color-primary, #3b82f6);
          color: white;
          border-color: var(--color-primary, #3b82f6);
        }

        .book-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .book-chat-empty {
          text-align: center;
          color: var(--color-text-muted, #666);
          padding: 2rem;
        }

        .book-chat-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-top: 1rem;
        }

        .book-chat-suggestions button {
          padding: 0.5rem 1rem;
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 20px;
          background: transparent;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .book-chat-suggestions button:hover {
          background: var(--color-bg-secondary, #f5f5f5);
        }

        .book-chat-message {
          max-width: 85%;
          padding: 0.8rem 1rem;
          border-radius: 12px;
          line-height: 1.5;
        }

        .book-chat-message.user {
          align-self: flex-end;
          background: var(--color-primary, #3b82f6);
          color: white;
        }

        .book-chat-message.assistant {
          align-self: flex-start;
          background: var(--color-bg-secondary, #f5f5f5);
        }

        .book-chat-sources {
          font-size: 0.75rem;
          color: var(--color-text-muted, #666);
          margin-top: 0.5rem;
          opacity: 0.8;
        }

        .book-chat-loading {
          display: flex;
          gap: 4px;
        }

        .book-chat-loading span {
          width: 8px;
          height: 8px;
          background: var(--color-text-muted, #666);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .book-chat-loading span:nth-child(1) { animation-delay: -0.32s; }
        .book-chat-loading span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .book-chat-input {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          border-top: 1px solid var(--color-border, #e0e0e0);
          background: var(--color-bg-secondary, #f5f5f5);
        }

        .book-chat-input textarea {
          flex: 1;
          padding: 0.8rem 1rem;
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 8px;
          resize: none;
          font-family: inherit;
          font-size: 0.95rem;
        }

        .book-chat-input textarea:focus {
          outline: none;
          border-color: var(--color-primary, #3b82f6);
        }

        .book-chat-input button {
          padding: 0.8rem 1.5rem;
          background: var(--color-primary, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .book-chat-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .book-chat-input button:hover:not(:disabled) {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
