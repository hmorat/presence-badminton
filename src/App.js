import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  
  // États pour le mail
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailContent, setEmailContent] = useState({ objet: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => setCreneaux(data))
      .catch(err => console.error("Erreur créneaux:", err));
  }, []);

  const datesSaison = useMemo(() => {
    if (!selectedCreneau) return [];
    const dates = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    const cible = joursMap[selectedCreneau.jour.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()];
    let d = new Date(2025, 8, 1, 12, 0, 0); 
    const fin = new Date(2026, 7, 31, 12, 0, 0); 
    while (d <= fin) {
      if (d.getDay() === cible) dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  useEffect(() => {
    if (datesSaison.length > 0) {
      const auj = new Date().toISOString().split('T')[0];
      setDate(datesSaison.find(d => d >= auj) || datesSaison[0]);
    }
  }, [datesSaison]);

  useEffect(() => {
    if (selectedCreneau && date) {
      fetch(`${API}/api/joueurs?creneau=${selectedCreneau.creneau_code}&date=${date}`)
        .then(res => res.json())
        .then(data => {
          setJoueurs(data);
          const map = {};
          data.forEach(j => map[j.licence] = j.present);
          setPresences(map);
        });
    } else {
      setJoueurs([]);
    }
  }, [selectedCreneau, date]);

  const nbPresents = useMemo(() => Object.values(presences).filter(v => v === true).length, [presences]);

  const sauvegarder = () => {
    const payload = {
      creneau: selectedCreneau.creneau_code,
      date,
      joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false }))
    };
    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      alert("✅ Enregistré !");
      setSelectedCreneau(null);
      setShowEmailForm(false);
    });
  };

  const envoyerEmail = () => {
    if (!emailContent.objet || !emailContent.message) return alert("Remplissez tout !");
    setIsSending(true);
    fetch(`${API}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creneau: selectedCreneau.creneau_code, ...emailContent })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.success ? "🚀 Mail envoyé !" : "❌ Erreur");
      if(data.success) { setShowEmailForm(false); setEmailContent({objet:"", message:""}); }
    })
    .finally(() => setIsSending(false));
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Présences ABAC</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value) || null)}
        >
          <option value="">-- Sélectionner --</option>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code} : {c.jour} ({c.horaire}) - {c.entraineur}</option>
          ))}
        </select>

        {selectedCreneau && (
          <select value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }}>
            {datesSaison.map(d => (
              <option key={d} value={d}>{new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
          <div style={{ flex: 1, backgroundColor: '#f1f3f4', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
             ✅ {nbPresents} / {joueurs.length}
          </div>
        </div>
      </div>

      {selectedCreneau ? (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => {const m={}; joueurs.forEach(j=>m[j.licence]=true); setPresences(m)}} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', backgroundColor: '#E3F2FD' }}>Tous Présents</button>
            <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff' }}>Tous Absents</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fff' }}>
            {joueurs.map(j => (
              <div key={j.licence} className="notranslate" translate="no" onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent' }}>
                <span className="notranslate" translate="no">{j.nom} {j.prenom}</span>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly />
              </div>
            ))}
          </div>

          <button onClick={() => setShowEmailForm(!showEmailForm)} style={{ width: '100%', marginTop: '15px', padding: '10px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            {showEmailForm ? "✖ Annuler le mail" : "📧 Envoyer un mail au créneau"}
          </button>

          {showEmailForm && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#f0f4f8', borderRadius: '10px', border: '1px solid #0078d4' }}>
              <input placeholder="Objet" value={emailContent.objet} onChange={e => setEmailContent({...emailContent, objet: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              <textarea placeholder="Message..." rows="4" value={emailContent.message} onChange={e => setEmailContent({...emailContent, message: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }}></textarea>
              <button onClick={envoyerEmail} disabled={isSending} style={{ width: '100%', padding: '10px', backgroundColor: isSending ? '#ccc' : '#2e7d32', color: 'white', borderRadius: '5px', border: 'none', fontWeight: 'bold' }}>
                {isSending ? "Envoi..." : "🚀 Envoyer"}
              </button>
            </div>
          )}

          <button onClick={sauvegarder} style={{ width: '100%', marginTop: '20px', padding: '18px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '17px' }}>
            💾 ENREGISTRER
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#888', fontStyle: 'italic' }}>Sélectionnez un créneau pour commencer.</div>
      )}
    </div>
  );
}

export default App;