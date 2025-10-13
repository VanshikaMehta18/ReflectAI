import React from 'react';
import './App.css';
import Journal from './components/Journal';
import Analytics from './components/Analytics';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>MindMirror</h1>
        <p>Your AI companion for journaling, reflection, and emotional awareness.</p>
      </header>
      <main>
        <Journal />
        <Analytics />
      </main>
    </div>
  );
}

export default App;
