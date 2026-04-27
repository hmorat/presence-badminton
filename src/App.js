import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailContent, setEmailContent] = useState({ objet: "", message: "" });

  // 1. Charger les créneaux au démarrage
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => setCreneaux(data))
      .catch(err => console.error("Erreur API créneaux:", err));
  }, []);

  // 2. Générer les dates de la saison au format ISO pour la logique
  const datesSaison = useMemo(() => {
    if (!selectedCreneau || !selectedCreneau.jour) return [];
    const dates = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    const jourNettoye = selectedCreneau.jour.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const cible = joursMap[jourNettoye];
    
    let d = new Date(2025, 8, 1, 12, 0, 0); 
    const fin = new Date(2026, 7, 31, 12, 0, 0); 
    while (d <= fin) {
      if (d.getDay() === cible) dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  // 3. Fixer la date par défaut sans bloquer la sélection
  useEffect(() => {
    if (datesSaison.length > 0 && !date) {
      const auj = new Date().toISOString().split('T')[0];
      const prochaine = datesSaison.find(d => d >= auj) || datesSaison[0];
      setDate(prochaine);
    }
  }, [datesSaison]);

  // 4. Charger les joueurs dès que le créneau OU la date change
  useEffect(() => {
    if (selectedCreneau && date) {
      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(selectedCreneau.creneau_code)}&date=${date}`)
        .then(res => res.json())
        .then(data => {
          setJoueurs(data);
          const map = {};
          data.forEach(j => map[j.licence] = j.present);
          setPresences(map);
        });
    }
  }, [selectedCreneau, date]);

  const nbPresents = Object.values(presences).filter(v => v === true).length;

  const sauvegarder = () => {
    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creneau: selectedCreneau.creneau_code,
        date,
        joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false }))
      })
    }).then(() => alert("✅ Enregistré !"));
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Présences ABAC</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px', fontSize: '16px' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => {
            setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value));
            setDate(""); // Reset date pour forcer le recalcul
          }}
        >
          <option value="">-- Sélectionner --</option>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.horaire}) - {c.entraineur || c.Entraineur}
            </option>
          ))}
        </select>

        {selectedCreneau && (
          <select 
            style={{ padding: '12px', borderRadius: '8px', fontSize: '16px' }}
            value={date} 
            onChange={(e) => setDate(e.target.value)}
          >
            {datesSaison.map(d => (
              <option key={d} value={d}>
                {new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </option>
            ))}
          </select>
        )}

        {selectedCreneau && (
           <div style={{ backgroundColor: '#f1f3f4', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
             ✅ {nbPresents} / {joueurs.length} présents
           </div>
        )}
      </div>

      {selectedCreneau && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => {const m={}; joueurs.forEach(j=>m[j.licence]=true); setPresences(m)}} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', cursor: 'pointer' }}>Tous Présents</button>
            <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer' }}>Tous Absents</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fff', marginBottom: '20px' }}>
            {joueurs.length > 0 ? joueurs.map(j => (
              <div key={j.licence} onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent', cursor: 'pointer' }}>
                <span>{j.nom} {j.prenom}</span>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.5)' }} />
              </div>
            )) : <p style={{padding: '20px', textAlign: 'center', color: 'red'}}>Aucun joueur trouvé pour ce créneau.</p>}
          </div>

          <button onClick={() => setShowEmailForm(!showEmailForm)} style={{ width: '100%', padding: '12px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' }}>
             📧 Mail au créneau
          </button>

          <button onClick={sauvegarder} style={{ width: '100%', padding: '18px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
            💾 ENREGISTRER
          </button>
        </>
      )}
    </div>
  );
}

export default App;