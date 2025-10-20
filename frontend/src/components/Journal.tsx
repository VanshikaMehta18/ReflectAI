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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        
        setIsLoading(true); // Show loading indicator while transcribing
        try {
          const response = await fetch('http://localhost:8000/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            setEntry(data.transcription);
          } else {
            console.error('Failed to transcribe audio.');
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

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

        // New: Synthesize and play audio for the AI response
        try {
          const synthesisResponse = await fetch('http://localhost:8000/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: chatData.response }),
          });
          if (synthesisResponse.ok) {
            const audioBlob = await synthesisResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
          } else {
            console.error('Failed to synthesize audio.');
          }
        } catch (error) {
          console.error('Error synthesizing audio:', error);
        }

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
        <button 
            type="button" 
            className={`mic-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
        >
            {isRecording ? '■' : '●'}
        </button>
        <button type="submit" className="journal-submit-button" disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Journal;
