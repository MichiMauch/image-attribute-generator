import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Bild hochladen und beschreiben</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} accept="image/*" required />
        <button type="submit" disabled={loading}>
          {loading ? 'Hochladen...' : 'Hochladen und beschreiben'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>Fehler: {error}</p>}
      {result && (
        <div>
          <h2>Bildbeschreibung</h2>
          <p><strong>Titel:</strong> {result.title}</p>
          <p><strong>Alt-Text:</strong> {result.alt}</p>
          <img src={URL.createObjectURL(file)} alt={result.alt} style={{ maxWidth: '300px', height: 'auto' }} />
          <p>
            <a href={result.downloadUrl} download>Bild herunterladen</a>
          </p>
        </div>
      )}
    </div>
  );
}
