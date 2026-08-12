import { Bot } from "lucide-react";
import { requireRole } from "@/lib/session";
import { AssistantChat } from "./AssistantChat";

export default function AsistenAiPage() {
  const currentUser = requireRole(["admin", "teknisi", "sales"]);

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Asisten AI</p>
          <h1>Tanya data Core langsung ke asisten</h1>
          <p className="bodyText">Tanya stok unit, detail unit, status batch, atau (khusus admin) rekap keuangan - jawaban selalu berdasarkan data asli di database.</p>
        </div>
        <Bot size={28} />
      </div>
      <AssistantChat currentUserRole={currentUser.role} />
    </section>
  );
}
