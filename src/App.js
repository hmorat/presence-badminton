import { useEffect, useState } from "react";
import supabase from "./supabase";

const API = "https://presence-badminton-backend.onrender.com";

const COACHS = [
  "secretaire.abac92@gmail.com",
];

function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [creneaux, setCreneaux] = useState([]);
  const [dates, setDates] = useState([]);
  const [joueurs, setJoueurs] = useState([]);

  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState("");

  const [presences, setPresences] = useState({});

  // =============================
  // SESSION
  // =============================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // =============================
  // LOGIN
  // =============================
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return alert("Erreur login");

    if (!COACHS.includes(data.user.email)) {
      alert("Accès refusé");
      await supabase.auth.signOut();
      return;
    }

    setUser(data.user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // =============================
  // LOAD DATA
  // =============================
  useEffect(() => {
    if (!user) return;

    fetch(`${API}/api/creneaux`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setCreneaux(data);
      });

    fetch(`${API}/api/dates`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setDates(data);
      });

  }, [user]);

  useEffect(() => {
    if (!creneau) return setJoueurs([]);

    fetch(`${API}/api/joueurs?creneau=${creneau}`)
      .then((r) => r.json())
      .then(setJoueurs);

  }, [creneau]);

  useEffect(() => {
    if (!creneau || !date) return;

    fetch(`${API}/api/presences?creneau=${creneau}&date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        data.forEach((p) => (map[p.licence] = p.present));
        setPresences(map);
      });

  }, [creneau, date]);

  // =============================
  const setPresence = async (licence, present) => {
    await fetch(`${API}/api/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        licence,
        creneau_code: creneau,
        date_seance: date,
        present,
      }),
    });

    setPresences((prev) => ({ ...prev, [licence]: present }));
  };

  // =============================
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Connexion</h2>
        <input onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <br /><br />
        <input type="password" onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        <br /><br />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🏸 Présences</h1>
      <button onClick={handleLogout}>Logout</button>

      <br /><br />

      <select value={creneau} onChange={(e) => setCreneau(e.target.value)}>
        <option value="">Créneau</option>
        {creneaux.map((c) => (
          <option key={c.creneau_code} value={c.creneau_code}>
            {c.creneau_code} - {c.jour}
          </option>
        ))}
      </select>

      <select value={date} onChange={(e) => setDate(e.target.value)}>
        <option value="">Date</option>
        {dates.map((d) => (
          <option key={d.date_seance} value={d.date_seance}>
            {d.date_seance}
          </option>
        ))}
      </select>

      <h2>Joueurs</h2>

      {joueurs.map((j) => (
        <div key={j.licence}>
          {j.nom} {j.prenom}
          <button onClick={() => setPresence(j.licence, true)}>✔</button>
          <button onClick={() => setPresence(j.licence, false)}>✖</button>
        </div>
      ))}
    </div>
  );
}

export default App;