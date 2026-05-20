import { LockKeyhole } from "lucide-react";
import { demoUsers } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { loginAction, logoutAction } from "./actions";

export default function LoginPage() {
  const currentUser = getCurrentUser();

  return (
    <section className="pageStack narrowPage">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Login User</p>
          <h1>Masuk sesuai role kerja</h1>
        </div>
      </div>

      {currentUser ? (
        <form className="panel formGrid" action={logoutAction}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Sedang login</p>
              <h2>{currentUser.name}</h2>
            </div>
            <LockKeyhole size={22} />
          </div>
          <p className="bodyText">Role aktif: {currentUser.role}. Logout kalau mau ganti user.</p>
          <button className="secondaryButton" type="submit">Logout</button>
        </form>
      ) : (
      <form className="panel formGrid" action={loginAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Akses internal</p>
            <h2>Admin, teknisi, atau magang</h2>
          </div>
          <LockKeyhole size={22} />
        </div>
        <label>
          Pilih User
          <select name="userName" defaultValue="Faza">
            {demoUsers.map((user) => (
              <option value={user.name} key={user.name}>{user.name} - {user.role}</option>
            ))}
          </select>
        </label>
        <button className="primaryButton" type="submit">Login</button>
      </form>
      )}

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Role demo</p>
            <h2>User yang disiapkan</h2>
          </div>
        </div>
        <div className="tableLike">
          {demoUsers.map((user) => (
            <div className="unitRow" key={user.name}>
              <span className="unitNumber">{user.name.charAt(0)}</span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
