import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import * as XLSX from "xlsx";
import "./App.css";

const API = "https://presence-badminton-backend.vercel.app";

function App() {
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [datesFiltrees, setDatesFiltrees] = useState([]);
  const [date, setDate] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) return alert("Accès refusé");
    setUser(data.user);
  };

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/creneaux`).then(res => res.json()).then(data => setCreneaux(Array.isArray(data) ? data : []));
  }, [user]);

  useEffect(() => {
    if (!creneau || !creneaux.length) return;
    const c = creneaux.find(i => i.creneau_code === creneau);
    if (!c) return;

    const joursMap = { DIMANCHE: 0, LUNDI: 1, MARDI: 2, MERCREDI: 3, JEUDI: 4, VENDREDI: 5, SAMEDI: 6 };
    const jourCible = joursMap[(c.jour || c.Jour || "").toUpperCase()];
    if (jourCible === undefined) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
    
    let temp = [];
    let d = new Date(year, 8, 1);
    const fin = new Date(year + 1, 7, 31);

    while (d <= fin) {
      if (d.getDay() === jourCible) temp.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    // TRI NUMÉRIQUE STRICT (Indispensable pour éviter le tri alphabétique des mois)
    temp.sort((a, b) => b.getTime() - a.getTime());

    setDatesFiltrees(temp);
    setDate(temp.find(dt => dt <= today) || temp[0]);
  }, [creneau, creneaux]);

  useEffect(() => {
    if (creneau) fetch(`${API}/api/joueurs?creneau=${creneau}`).then(res => res.json()).then(setJoueurs);
  }, [creneau]);

  useEffect(() => {
    if (creneau && date) {
      const dStr = date.toISOString().split("T")[0];
      fetch(`${API}/api/presences?creneau=${creneau}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          const map = {};
          if (Array.isArray(data)) data.forEach(p => map[p.licence] = p.present);
          setPresences(map);
        });
    }
  }, [creneau, date]);

  const toggle = async (licence, val) => {
    const dStr = date.toISOString().split("T")[0];
    await fetch(`${API}/api/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licence, creneau_code: creneau, date_seance: dStr, present: val }),
    });
    setPresences(prev => ({ ...prev, [licence]: val }));
  };

  const exportToExcel = async () => {
    try {
      const response = await fetch(`${API}/api/export/all`);
      const data = await response.json();
      const ws = XLSX.utils.json_to_sheet(data.map(r => ({
        "Créneau": r.creneau_code,
        "Date": r.date_seance ? new Date(r.date_seance).toLocaleDateString('fr-FR') : "",
        "Licence": r.licence,
        "Nom": r.nom, "Prénom": r.prenom, "Statut": r.present ? "Présent" : "Absent"
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Présences");
      XLSX.writeFile(wb, "Export_Bad.xlsx");
    } catch (e) { alert("Erreur export"); }
  };

  if (!user) return (
    <div className="dashboard"><div className="card">
      <h2 style={{textAlign:'center'}}>🏸 Connexion</h2>
      <input className="input-field" type="email" placeholder="Email" style={{width:'100%', marginBottom:'10px', padding:'10px', boxSizing:'border-box'}} onChange={e=>setCredentials({...credentials, email:e.target.value})}/>
      <input className="input-field" type="password" placeholder="Pass" style={{width:'100%', marginBottom:'10px', padding:'10px', boxSizing:'border-box'}} onChange={e=>setCredentials({...credentials, password:e.target.value})}/>
      <button className="btn-export-small" style={{width:'100%', padding:'12px', borderRadius:'8px'}} onClick={handleLogin}>Entrer</button>
    </div></div>
  );

  return (
    <div className="dashboard">
      <header className="header">
        <h3>🏸 Bad Présences</h3>
        <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Quitter</button>
      </header>

      <div className="card filter-section">
        <label style={{fontSize:'11px', fontWeight:'bold', color:'#666'}}>CRÉNEAU</label>
        <select value={creneau} onChange={e => setCreneau(e.target.value)}>
          <option value="">-- Sélectionner --</option>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour || c.Jour} ({c.horaire || c.Horaire}) - {c.entraineur || c.Entraineur || "Sans coach"}
            </option>
          ))}
        </select>

        {creneau && <>
          <label style={{fontSize:'11px', fontWeight:'bold', color:'#666', marginTop:'5px'}}>SÉANCE</label>
          <select value={date?.toISOString()} onChange={e => setDate(new Date(e.target.value))}>
            {datesFiltrees.map(d => (
              <option key={d.toISOString()} value={d.toISOString()}>
                {d.toLocaleDateString("fr-FR", { weekday: 'long', day: '2-digit', month: 'long' })}
              </option>
            ))}
          </select>
          <div className="export-container"><button className="btn-export-small" onClick={exportToExcel}>📊 Export Excel</button></div>
        </>}
      </div>

      <div className="grid">
        {joueurs.map(j => {
          const isP = presences.hasOwnProperty(j.licence) ? presences[j.licence] : false;
          return (
            <div key={j.licence} className="card player-card">
              <div className="player-info">
                <span className="player-name">{(j.nom || j.Nom || "").toUpperCase()} {j.prenom || j.Prenom}</span>
                <span className="licence-tag">{j.licence}</span>
              </div>
              <div className="actions">
                <button className="btn-presence" onClick={() => toggle(j.licence, true)} style={{ background: isP ? "#2ecc71" : "#f0f2f5", color: isP ? "white" : "black" }}>Présent</button>
                <button className="btn-presence" onClick={() => toggle(j.licence, false)} style={{ background: !isP ? "#e74c3c" : "#f0f2f5", color: !isP ? "white" : "black" }}>Absent</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;