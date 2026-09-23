import React, { useState } from 'react';
import { getCurrentDateString } from '../utils/dateUtils';

export function TestModePanel() {
  const [activeDate, setActiveDate] = useState(getCurrentDateString());
  const isMockActive = !!localStorage.getItem('p35_test_date');

  const shiftDays = (days) => {
    const current = new Date(activeDate);
    current.setDate(current.getDate() + days);
    const newStr = current.toISOString().split('T')[0];
    localStorage.setItem('p35_test_date', newStr);
    // REMOVED clearFinalisedWeeks() so it stops deleting your archives!
    window.location.reload();
  };

  const resetToLive = () => {
    localStorage.removeItem('p35_test_date');
    // REMOVED clearFinalisedWeeks()
    window.location.reload();
  };

  return (
    <div style={{ background: '#0f172a', border: '2px solid #00ff66', padding: '16px', borderRadius: '12px', color: '#fff', margin: '16px 0' }}>
      <div style={{ fontWeight: '800', color: '#00ff66', marginBottom: '8px', fontSize: '16px' }}>
        🧪 P35 Test Mode Controls
      </div>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
        Simulated Date: <span style={{ color: '#fff', fontWeight: 'bold' }}>{activeDate}</span> {isMockActive ? '(TEST ACTIVE)' : '(LIVE)'}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => shiftDays(-7)} style={buttonStyle}>-1 Week</button>
        <button onClick={() => shiftDays(-1)} style={buttonStyle}>-1 Day</button>
        <button onClick={() => shiftDays(1)} style={buttonStyle}>+1 Day</button>
        <button onClick={() => shiftDays(7)} style={buttonStyle}>+1 Week</button>
        <button onClick={() => shiftDays(30)} style={buttonStyle}>+30 Days</button>
        {isMockActive && (
          <button onClick={resetToLive} style={{ ...buttonStyle, background: '#ef4444', border: 'none', color: '#fff' }}>
            Reset Live
          </button>
        )}
      </div>
    </div>
  );
}

const buttonStyle = {
  background: '#18232c',
  color: '#00ff66',
  border: '1px solid #00ff66',
  padding: '6px 12px',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer'
};
