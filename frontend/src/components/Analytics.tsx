import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Analytics.css';

interface StoredJournalEntry {
  content: string;
  sentiment: string;
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('http://localhost:8000/journal');
        if (response.ok) {
          const fetchedData = await response.json();
          
          const sentimentMap = { 'Positive': 1, 'Neutral': 0, 'Negative': -1 };
          
          const chartData = fetchedData.entries.map((entry: StoredJournalEntry, index: number) => ({
            name: `Entry ${index + 1}`,
            sentiment: sentimentMap[entry.sentiment as keyof typeof sentimentMap] || 0,
          }));

          setData(chartData);
        } else {
          console.error('Failed to fetch entries for analytics.');
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      }
    };

    // Fetch data every 3 seconds to keep the chart updated
    const interval = setInterval(fetchEntries, 3000);
    fetchEntries(); // Initial fetch

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

  return (
    <div className="analytics-container">
      <h2>Mood Timeline</h2>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis dataKey="name" stroke="#ccc" />
            <YAxis 
              stroke="#ccc"
              domain={[-1.5, 1.5]} 
              ticks={[-1, 0, 1]} 
              tickFormatter={(value: number) => {
                if (value === 1) return 'Positive';
                if (value === 0) return 'Neutral';
                if (value === -1) return 'Negative';
                return '';
              }} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#282c34', border: '1px solid #444' }} 
              labelStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ color: '#ccc' }} />
            <Line type="monotone" dataKey="sentiment" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p>Your mood timeline will appear here after you send a few messages.</p>
      )}
    </div>
  );
};

export default Analytics;
