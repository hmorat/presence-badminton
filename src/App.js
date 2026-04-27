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
  
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailContent, setEmailContent] = useState({ objet: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  // 1. Chargement initial des créneaux
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => setCreneaux(data))
      .catch(err => console.error("Erreur chargement créneaux:", err));
  }, []);

  // 2. Calcul des dates (ne change que si selectedCreneau change)
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

  // 3. Fixer la date par défaut SANS provoquer de boucle infinie
  useEffect(() => {
    if (datesSaison.length > 0) {
      const auj = new Date().toISOString().split('T')[0];
      const prochaine = datesSaison.find(d => d >= auj) || datesSaison[0];
      // On ne met à jour la date que si elle est différente
      setDate(prev => (prev === prochaine ? prev : prochaine));
    }
  }, [datesSaison]);

  // 4. Chargement des joueurs (Déclenché par selectedCreneau ET date)
  useEffect(() => {
    let isMounted = true;
    if (selectedCreneau && date) {
      fetch(`${API}/api/joueurs?creneau=${selectedCreneau.creneau_code}&date=${date}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted) {
            setJoueurs(data);
            const map = {};
            data.forEach(j => map[j.licence] = j.present);
            setPresences(map);
          }
        })
        .catch(err => console.error("Erreur joueurs:", err));
    }
    return () => { isMounted = false; };
  }, [selectedCreneau, date]);

  const nbPresents = useMemo(() => Object.values(presences).filter(v => v === true).length, [presences]);

  const sauvegarder = () => {
    if (!selectedCreneau || !date) return;
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
      setSelectedCreneau(null); // Reset pour le prochain
      setShowEmailForm(false);
    });
  };

  const envoyerEmail = () => {
    if (!emailContent.objet || !emailContent.message) return alert("Champs vides !");
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
          style={{ padding: '12px', borderRadius: '8px', fontSize: '16px' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => {
            const found = creneaux.find(c => c.creneau_code === e.target.value);
            setSelectedCreneau(found || null);
          }}
        >
          <option value="">-- Sélectionner --</option>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code} : {c.jour} ({c.horaire})</option>
          ))}
        </select>

        {selectedCreneau && date && (
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

      {selectedCreneau && date ? (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => {const m={}; joueurs.forEach(j=>m[j.licence]=true); setPresences(m)}} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', backgroundColor: '#E3F2FD' }}>Tous Présents</button>
            <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff' }}>Tous Absents</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fff', marginBottom: '20px' }}>
            {joueurs.length > 0 ? joueurs.map(j => (
              <div key={j.licence} className="notranslate" translate="no" onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent', cursor: 'pointer' }}>
                <span className="notranslate" translate="no" style={{fontSize: '16px'}}>{j.nom} {j.prenom}</span>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.5)' }} />
              </div>
            )) : <p style={{padding: '20px', textAlign: 'center'}}>Aucun joueur trouvé.</p>}
          </div>

          <button onClick={() => setShowEmailForm(!showEmailForm)} style={{ width: '100%', padding: '12px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom: '10px' }}>
            {showEmailForm ? "✖ Annuler le mail" : "📧 Mail au créneau"}
          </button>

          {showEmailForm && (
            <div style={{ padding: '15px', backgroundColor: '#f0f4f8', borderRadius: '10px', border: '1px solid #0078d4', marginBottom: '15px' }}>
              <input placeholder="Objet" value={emailContent.objet} onChange={e => setEmailContent({...emailContent, objet: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              <textarea placeholder="Message..." rows="4" value={emailContent.message} onChange={e => setEmailContent({...emailContent, message: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}></textarea>
              <button onClick={envoyerEmail} disabled={isSending} style={{ width: '100%', padding: '10px', backgroundColor: isSending ? '#ccc' : '#2e7d32', color: 'white', borderRadius: '5px', border: 'none', fontWeight: 'bold' }}>
                {isSending ? "Envoi..." : "🚀 Envoyer"}
              </button>
            </div>
          )}

          <button onClick={sauvegarder} style={{ width: '100%', padding: '18px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
            💾 ENREGISTRER
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>Sélectionnez un créneau pour afficher les joueurs.</div>
      )}
    </div>
  );
}

export default App;