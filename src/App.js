import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});
  const [showMail, setShowMail] = useState(false);
  const [mail, setMail] = useState({ objet: "", message: "" });

  useEffect(() => {
    fetch(`${API}/api/creneaux`).then(res => res.json()).then(setCreneaux);
  }, []);

  const datesSaison = useMemo(() => {
    if (!selectedCreneau) return [];
    const dates = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    const cible = joursMap[selectedCreneau.jour?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()];
    let d = new Date(2025, 8, 1, 12, 0, 0);
    while (d <= new Date(2026, 7, 31)) {
      if (d.getDay() === cible) dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  useEffect(() => {
    if (datesSaison.length > 0 && !date) {
      const auj = new Date().toISOString().split('T')[0];
      setDate(datesSaison.find(d => d >= auj) || datesSaison[0]);
    }
  }, [datesSaison]);

  useEffect(() => {
    if (selectedCreneau && date) {
      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(selectedCreneau.creneau_code)}&date=${date}`)
        .then(res => res.json()).then(data => {
          setJoueurs(data);
          const m = {}; data.forEach(j => m[j.licence] = j.present); setPresences(m);
        });
    }
  }, [selectedCreneau, date]);

  const envoyerMail = () => {
    fetch(`${API}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creneau: selectedCreneau.creneau_code, ...mail })
    }).then(res => res.ok ? alert("✉️ Mail envoyé !") : alert("❌ Erreur"));
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Présences ABAC</h2>
      
      <div style={{ padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <select style={{ width: '100%', padding: '12px', marginBottom: '10px' }} onChange={(e) => {setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value)); setDate("");}}>
          <option value="">-- Créneau --</option>
          {creneaux.map(c => <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code} : {c.jour} ({c.horaire}) - {c.entraineur}</option>)}
        </select>

        {selectedCreneau && (
          <select style={{ width: '100%', padding: '12px', marginBottom: '10px' }} value={date} onChange={(e) => setDate(e.target.value)}>
            {datesSaison.map(d => <option key={d} value={d}>{new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</option>)}
          </select>
        )}

        {selectedCreneau && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>✅ {Object.values(presences).filter(v => v).length} / {joueurs.length}</strong>
            <button onClick={() => setShowMail(!showMail)} style={{ padding: '8px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '5px' }}>📧 Mail</button>
          </div>
        )}
      </div>

      {showMail && (
        <div style={{ padding: '15px', border: '1px solid #0078d4', borderRadius: '10px', marginBottom: '20px' }}>
          <input placeholder="Objet" style={{ width: '100%', marginBottom: '10px', padding: '8px' }} onChange={e => setMail({...mail, objet: e.target.value})} />
          <textarea placeholder="Message" style={{ width: '100%', height: '80px', marginBottom: '10px', padding: '8px' }} onChange={e => setMail({...mail, message: e.target.value})} />
          <button onClick={envoyerMail} style={{ width: '100%', padding: '10px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '5px' }}>Envoyer aux joueurs</button>
        </div>
      )}

      {selectedCreneau && (
        <>
          <div style={{ border: '1px solid #eee', borderRadius: '10px', marginBottom: '20px' }}>
            {joueurs.map(j => (
              <div key={j.licence} onClick={() => setPresences({...presences, [j.licence]: !presences[j.licence]})} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'white', cursor: 'pointer' }}>
                <span>{j.nom} {j.prenom}</span>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly />
              </div>
            ))}
          </div>
          <button onClick={() => {
            fetch(`${API}/api/presences`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creneau: selectedCreneau.creneau_code, date, joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false })) })
            }).then(() => alert("✅ Enregistré !"));
          }} style={{ width: '100%', padding: '15px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>💾 ENREGISTRER</button>
        </>
      )}
    </div>
  );
}

export default App;