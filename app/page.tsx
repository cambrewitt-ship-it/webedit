import { redirect } from "next/navigation";
import { clients } from "@/config/clients";

export default function Home() {
  // Redirect to first client if only one, otherwise show a simple list
  if (clients.length === 1) {
    redirect(`/edit/${clients[0].id}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#113D79]">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div
            className="text-3xl mb-1"
            style={{ fontFamily: "var(--font-dm-serif)", color: "#BAA649" }}
          >
            113 WebEdit
          </div>
          <div className="text-sm text-gray-500">Select your website</div>
        </div>
        <div className="space-y-2">
          {clients.map((client) => (
            <a
              key={client.id}
              href={`/edit/${client.id}`}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-[#113D79] hover:bg-blue-50 transition-all text-sm font-medium text-gray-700"
            >
              {client.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
