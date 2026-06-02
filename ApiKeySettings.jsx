import React, { useState } from 'react';

export function ApiKeySettings() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleApiResponse = async (response) => {
    const result = await response.json();
    if (!response.ok) {
      setStatus({ message: result.message || 'An unknown error occurred.', type: 'error' });
    } else {
      setStatus({ message: result.message, type: 'success' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      setStatus({ message: 'API Key cannot be empty.', type: 'error' });
      return;
    }
    setIsLoading(true);
    setStatus({ message: '', type: '' });

    try {
      const response = await fetch('/api/user/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      await handleApiResponse(response);
    } catch (error) {
      setStatus({ message: 'Failed to connect to the server.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!apiKey) {
      setStatus({ message: 'Please enter a key to validate.', type: 'error' });
      return;
    }
    setIsLoading(true);
    setStatus({ message: 'Validating...', type: 'info' });

    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      await handleApiResponse(response);
    } catch (error) {
      setStatus({ message: 'Failed to connect to the server.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px' }}>
      <h2>OpenAI API Key</h2>
      <p style={{ color: '#666' }}>
        Your API key is stored securely and is only used to process your own requests.
        <br />
        <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer">
          Click here to get your OpenAI API key.
        </a>
      </p>
      <form onSubmit={handleSave}>
        <label htmlFor="api-key-input" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
          Your API Key
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input id="api-key-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." style={{ padding: '8px', flexGrow: 1, border: '1px solid #ccc', borderRadius: '4px' }} disabled={isLoading} />
          <button type="button" onClick={handleValidate} disabled={isLoading || !apiKey}>Validate</button>
          <button type="submit" disabled={isLoading || !apiKey}>{isLoading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
      {status.message && (
        <p style={{ marginTop: '12px', padding: '10px', borderRadius: '4px', backgroundColor: status.type === 'error' ? '#ffebe6' : (status.type === 'success' ? '#e6f7f0' : '#e6f0f7'), color: status.type === 'error' ? '#c00' : (status.type === 'success' ? '#006644' : '#004085') }}>
          {status.message}
        </p>
      )}
    </div>
  );
}