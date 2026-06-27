import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("aw_token", data.token);
        onLogin(data.token);
      } else {
        setError(data.message || "Login gagal.");
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">AW</div>
          <div>
            <h2>AW Laundry</h2>
            <span>ADMIN PANEL</span>
          </div>
        </div>
        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" required autoFocus />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "⏳ Masuk..." : "🔐 Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

const STATUS_COLOR = {
  "Menunggu Penjemputan": "status-menunggu",
  "Sedang Dicuci": "status-cuci",
  "Sedang Disetrika": "status-setrika",
  "Siap Diantar": "status-antar",
  "Selesai": "status-selesai",
};

function PesananCard({ item, loadingNota, onUpdate, onHapus, isArsip }) {
  return (
    <div className={`pesanan-card${loadingNota === item.nota ? " loading" : ""}`}>
      <div className="pesanan-card-header">
        <span className="pesanan-nota">{item.nota}</span>
        <span className={`pesanan-badge ${STATUS_COLOR[item.status] || ""}`}>
          {item.status}
        </span>
      </div>
      <div className="pesanan-card-body">
        {item.id && (
          <div className="pesanan-row">
            <span className="pesanan-label">ID</span>
            <span className="pesanan-value">#{item.id}</span>
          </div>
        )}
        <div className="pesanan-row">
          <span className="pesanan-label">Nama</span>
          <span className="pesanan-value">{item.nama}</span>
        </div>
        <div className="pesanan-row">
          <span className="pesanan-label">HP</span>
          <span className="pesanan-value">{item.hp}</span>
        </div>
        <div className="pesanan-row">
          <span className="pesanan-label">Alamat</span>
          <span className="pesanan-value">{item.alamat || "-"}</span>
        </div>
        <div className="pesanan-row">
          <span className="pesanan-label">Layanan</span>
          <span className="pesanan-value">{item.layanan}</span>
        </div>
        {item.tanggal && (
          <div className="pesanan-row">
            <span className="pesanan-label">Tanggal</span>
            <span className="pesanan-value">
              {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        )}
      </div>
      <div className="pesanan-card-footer">
        {!isArsip ? (
          <>
            <select className="pesanan-select" value={item.status} disabled={loadingNota === item.nota} onChange={(e) => onUpdate(item.nota, e.target.value)}>
              <option>Menunggu Penjemputan</option>
              <option>Sedang Dicuci</option>
              <option>Sedang Disetrika</option>
              <option>Siap Diantar</option>
              <option>Selesai</option>
            </select>
            <button className="btn-selesai" disabled={loadingNota === item.nota} onClick={() => onUpdate(item.nota, "Selesai")}>
              {loadingNota === item.nota ? "⏳" : "✅ Selesai"}
            </button>
          </>
        ) : (
          <button className="btn-hapus" disabled={loadingNota === item.nota} onClick={() => onHapus(item.nota)}>
            {loadingNota === item.nota ? "⏳ Menghapus..." : "🗑️ Hapus Permanen"}
          </button>
        )}
      </div>
    </div>
  );
}

function Dashboard({ token, onLogout }) {
  const [pesanan, setPesanan] = useState([]);
  const [menu, setMenu] = useState("aktif");
  const [loadingNota, setLoadingNota] = useState(null);
  const [error, setError] = useState(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const pesananAktif = pesanan.filter((p) => p.status !== "Selesai");
  const arsipSelesai = pesanan.filter((p) => p.status === "Selesai");

  const loadPesanan = async () => {
    try {
      const res = await fetch(`${API}/pesanan`, { headers: authHeaders });
      if (res.status === 401 || res.status === 403) { onLogout(); return; }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.success) setPesanan(data.data);
    } catch (err) {
      console.error("Gagal ambil data:", err);
      setError("Gagal terhubung ke server. Pastikan server.js sudah jalan di port 5000.");
    }
  };

  useEffect(() => {
    const fetchAwal = async () => {
      try {
        const res = await fetch(`${API}/pesanan`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
        if (res.status === 401 || res.status === 403) { onLogout(); return; }
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        if (data.success) setPesanan(data.data);
      } catch (err) {
        console.error("Gagal ambil data:", err);
        setError("Gagal terhubung ke server. Pastikan server.js sudah jalan di port 5000.");
      }
    };
    fetchAwal();
  }, []);

  const updateStatus = async (nota, statusBaru) => {
    setLoadingNota(nota);
    try {
      const res = await fetch(`${API}/pesanan/${nota}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: statusBaru }),
      });
      if (res.status === 401 || res.status === 403) { onLogout(); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) {
        await loadPesanan();
        if (statusBaru === "Selesai") setMenu("arsip");
      }
    } catch { console.error("Gagal update"); }
    finally { setLoadingNota(null); }
  };

  const hapusPesanan = async (nota) => {
    if (!window.confirm(`Hapus permanen pesanan ${nota}?`)) return;
    setLoadingNota(nota);
    try {
      const res = await fetch(`${API}/pesanan/${nota}`, { method: "DELETE", headers: authHeaders });
      if (res.status === 401 || res.status === 403) { onLogout(); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) await loadPesanan();
    } catch { console.error("Gagal hapus"); }
    finally { setLoadingNota(null); }
  };

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-state">
          <h2>⚠️ Koneksi Gagal</h2>
          <p>{error}</p>
          <p>Jalankan server dengan:</p>
          <code>node server.js</code>
          <br /><br />
          <button className="btn-retry" onClick={() => { setError(null); window.location.reload(); }}>
            🔄 Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const currentList = menu === "aktif" ? pesananAktif : arsipSelesai;

  return (
    <div className="dashboard">
      {/* SIDEBAR — desktop only */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">AW</div>
          <div><h2>AW Laundry</h2><span>ADMIN</span></div>
        </div>
        <button className={menu === "aktif" ? "menu active" : "menu"} onClick={() => setMenu("aktif")}>
          📦 Pesanan Aktif
          <span className="menu-badge">{pesananAktif.length}</span>
        </button>
        <button className={menu === "arsip" ? "menu active" : "menu"} onClick={() => setMenu("arsip")}>
          ✅ Arsip Selesai
          <span className="menu-badge">{arsipSelesai.length}</span>
        </button>
        <button className="menu logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </aside>

      <main className="main-content">
        {/* MOBILE HEADER */}
        <div className="mobile-header">
          <div className="mobile-logo">
            <div className="logo-icon sm">AW</div>
            <span>AW Laundry Admin</span>
          </div>
          <button className="mobile-logout" onClick={onLogout}>🚪</button>
        </div>

        {/* TABLE — desktop */}
        <div className="table-card desktop-only">
          <h3>{menu === "aktif" ? "DATABASE CUCIAN" : "ARSIP SELESAI"}</h3>
          {currentList.length === 0 ? (
            <p className="empty-state">
              {menu === "aktif" ? "🎉 Semua pesanan sudah selesai!" : "Belum ada pesanan selesai."}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>NOTA</th><th>NAMA</th><th>HP</th><th>ALAMAT</th><th>LAYANAN</th><th>TANGGAL</th><th>STATUS</th><th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {currentList.map((item) => (
                  <tr key={item.nota}>
                    <td>#{item.id}</td>
                    <td><b>{item.nota}</b></td>
                    <td>{item.nama}</td>
                    <td>{item.hp}</td>
                    <td>{item.alamat || "-"}</td>
                    <td>{item.layanan}</td>
                    <td>{item.tanggal ? new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                    <td>
                      {menu === "aktif" ? (
                        <select value={item.status} disabled={loadingNota === item.nota} onChange={(e) => updateStatus(item.nota, e.target.value)}>
                          <option>Menunggu Penjemputan</option>
                          <option>Sedang Dicuci</option>
                          <option>Sedang Disetrika</option>
                          <option>Siap Diantar</option>
                          <option>Selesai</option>
                        </select>
                      ) : (
                        <span className="badge-selesai">✅ Selesai</span>
                      )}
                    </td>
                    <td>
                      {menu === "aktif" ? (
                        <button className="selesai" disabled={loadingNota === item.nota} onClick={() => updateStatus(item.nota, "Selesai")}>
                          {loadingNota === item.nota ? "⏳..." : "✅ Selesai"}
                        </button>
                      ) : (
                        <button className="hapus" disabled={loadingNota === item.nota} onClick={() => hapusPesanan(item.nota)}>
                          {loadingNota === item.nota ? "⏳..." : "🗑️ Hapus"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* CARD LIST — mobile */}
        <div className="card-list mobile-only">
          <h3 className="section-title">
            {menu === "aktif" ? "📦 Pesanan Aktif" : "✅ Arsip Selesai"}
          </h3>
          {currentList.length === 0 ? (
            <div className="empty-card">
              <p>{menu === "aktif" ? "🎉 Semua pesanan sudah selesai!" : "Belum ada pesanan selesai."}</p>
            </div>
          ) : (
            currentList.map((item) => (
              <PesananCard key={item.nota} item={item} loadingNota={loadingNota} onUpdate={updateStatus} onHapus={hapusPesanan} isArsip={menu === "arsip"} />
            ))
          )}
        </div>
      </main>

      {/* BOTTOM NAV — mobile only */}
      <nav className="bottom-nav mobile-only">
        <button className={menu === "aktif" ? "bnav-btn active" : "bnav-btn"} onClick={() => setMenu("aktif")}>
          <span className="bnav-icon">📦</span>
          <span className="bnav-label">Aktif</span>
          {pesananAktif.length > 0 && <span className="bnav-badge">{pesananAktif.length}</span>}
        </button>
        <button className={menu === "arsip" ? "bnav-btn active" : "bnav-btn"} onClick={() => setMenu("arsip")}>
          <span className="bnav-icon">✅</span>
          <span className="bnav-label">Arsip</span>
          {arsipSelesai.length > 0 && <span className="bnav-badge">{arsipSelesai.length}</span>}
        </button>
      </nav>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("aw_token"));
  const handleLogin = (t) => setToken(t);
  const handleLogout = () => { localStorage.removeItem("aw_token"); setToken(null); };
  if (!token) return <Login onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}

export default App;
