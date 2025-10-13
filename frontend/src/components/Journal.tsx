import React, { useState, useEffect, useRef } from 'react';
import './Journal.css';

interface Message {
  sender: 'user' | 'ai';
  content: string;
  sentiment?: string;
}

const Journal: React.FC = () => {
  const [entry, setEntry] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const response = await fetch('http://localhost:8000/prompt');
        if (response.ok) {
          const data = await response.json();
          setPrompt(data.prompt);
        } else {
          console.error('Failed to fetch prompt.');
        }
      } catch (error) {
        console.error('Error fetching prompt:', error);
      }
    };

    fetchPrompt();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.trim()) return;

    const userMessage: Message = { sender: 'user', content: entry };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setEntry('');
    setIsLoading(true);

    try {
      // Get AI response
      const chatResponse = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: entry }),
      });

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        const aiMessage: Message = { sender: 'ai', content: chatData.response };
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        console.error('Failed to get AI response.');
        const errorMessage: Message = { sender: 'ai', content: "Sorry, I couldn't process that. Could you try again?" };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = { sender: 'ai', content: "Sorry, I'm having trouble connecting. Please try again later." };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="journal-container">
      <h2>Daily Reflection</h2>
      <p className="journal-prompt">{prompt || "What's on your mind today?"}</p>
      
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            <p>{msg.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message ai">
            <p className="loading-dots"><span>.</span><span>.</span><span>.</span></p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <textarea
          className="journal-textarea"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Share your thoughts..."
          rows={3}
        />
        <button type="submit" className="journal-submit-button" disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Journal;
