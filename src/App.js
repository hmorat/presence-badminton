import React, { useState, useEffect, useMemo } from 'react';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailContent, setEmailContent] = useState({ objet: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  // Charger les créneaux au début
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => setCreneaux(data))
      .catch(err => console.error("Erreur API:", err));
  }, []);

  // Calcul des dates de la saison
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

  // Fixer la date par défaut
  useEffect(() => {
    if (datesSaison.length > 0) {
      const auj = new Date().toISOString().split('T')[0];
      const prochaine = datesSaison.find(d => d >= auj) || datesSaison[0];
      if (date !== prochaine) setDate(prochaine);
    }
  }, [datesSaison, date]);

  // Charger les joueurs quand le créneau change
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
      setJoueurs([]);
    });
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Présences ABAC</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value) || null)}
        >
          <option value="">-- Sélectionner --</option>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code} : {c.jour} ({c.horaire})</option>
          ))}
        </select>

        {selectedCreneau && (
          <select value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }}>
            {datesSaison.map(d => (
              <option key={d} value={d}>{new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</option>
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
            <button onClick={() => {const m={}; joueurs.forEach(j=>m[j.licence]=true); setPresences(m)}} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3' }}>Tous Présents</button>
            <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>Tous Absents</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '10px', minHeight: '100px' }}>
            {joueurs.length > 0 ? joueurs.map(j => (
              <div key={j.licence} className="notranslate" onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'white' }}>
                <span className="notranslate">{j.nom} {j.prenom}</span>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly />
              </div>
            )) : <p style={{textAlign: 'center', color: 'red'}}>Aucun joueur trouvé pour ce créneau.</p>}
          </div>

          <button onClick={() => setShowEmailForm(!showEmailForm)} style={{ width: '100%', marginTop: '15px', padding: '10px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '8px' }}>
            {showEmailForm ? "✖ Annuler" : "📧 Mail au créneau"}
          </button>

          {showEmailForm && (
            <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #0078d4', borderRadius: '8px' }}>
               <input placeholder="Objet" value={emailContent.objet} onChange={e => setEmailContent({...emailContent, objet: e.target.value})} style={{width: '100%', marginBottom: '5px', padding: '8px'}} />
               <textarea placeholder="Message" rows="4" value={emailContent.message} onChange={e => setEmailContent({...emailContent, message: e.target.value})} style={{width: '100%', padding: '8px'}}></textarea>
               <button onClick={() => {/* Fonction envoi */}} style={{width: '100%', padding: '10px', backgroundColor: '#2e7d32', color: 'white', border: 'none', marginTop: '5px'}}>🚀 Envoyer</button>
            </div>
          )}

          <button onClick={sauvegarder} style={{ width: '100%', marginTop: '20px', padding: '15px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            💾 ENREGISTRER
          </button>
        </>
      )}
    </div>
  );
}

export default App;