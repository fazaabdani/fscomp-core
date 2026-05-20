import { LockKeyhole } from "lucide-react";
import { demoUsers } from "@/lib/auth";

export default function LoginPage() {
  return (
    <section className="pageStack narrowPage">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Login User</p>
          <h1>Masuk sesuai role kerja</h1>
        </div>
      </div>

      <form className="panel formGrid">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Akses internal</p>
            <h2>Admin, teknisi, atau magang</h2>
          </div>
          <LockKeyhole size={22} />
        </div>
        <label>
          Email
          <input type="email" placeholder="nama@fscomp.id" />
        </label>
        <label>
          Password
          <input type="password" placeholder="Masukkan password" />
        </label>
        <button className="primaryButton" type="button">Login</button>
      </form>

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
