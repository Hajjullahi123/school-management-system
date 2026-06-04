import React, { useState } from 'react';
import { Globe, Server, Activity, Search, MapPin, CircleCheck } from 'lucide-react';
import GlobalMapNode from '../../components/TechHub/GlobalMapNode';

const REGIONS = [
  { name: 'European Union', location: 'Frankfurt', residency: 'Yes', model: 'Maths model aligned to EU curricula', price: '€0.0003/token' },
  { name: 'India', location: 'Mumbai', residency: 'Yes', model: 'Bilingual (English/Hindi) + NCERT', price: '₹0.025/token' },
  { name: 'Brazil', location: 'São Paulo', residency: 'Coming Q3 2026', model: 'Portuguese + ENEM exam prep', price: 'R$0.001/token' },
  { name: 'United States', location: 'N. Virginia', residency: 'Yes', model: 'Common Core Aligned', price: '$0.0004/token' },
  { name: 'Japan', location: 'Tokyo', residency: 'Yes', model: 'MEXT curriculum + Kanji support', price: '¥0.06/token' }
];

const GlobalNetworkPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearchResult({
      latency: Math.floor(Math.random() * 80) + 12, // Random latency between 12-92ms
      node: ['Frankfurt', 'Mumbai', 'N. Virginia', 'Tokyo', 'Sydney'][Math.floor(Math.random() * 5)],
      compliance: 'GDPR / SOC2 Verified'
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32">
      {/* Hero */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">40+ edge locations.<br/><span className="text-cyan-400">One unified learning graph.</span></h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">Distributed, low-latency, and internationally compliant infrastructure built specifically for the demands of real-time education.</p>
        </div>
      </section>

      {/* Latency Map */}
      <section className="py-16 px-6 border-y border-gray-800 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <h2 className="text-3xl font-bold flex items-center gap-2"><Globe className="text-cyan-400"/> Live Network Telemetry</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400"><span className="w-3 h-3 rounded-full bg-cyan-400"></span> Edge Node</div>
              <div className="flex items-center gap-2 text-sm text-gray-400"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Active Routing</div>
            </div>
          </div>
          
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-12 shadow-2xl">
            <GlobalMapNode />
          </div>
        </div>
      </section>

      {/* Check Region Tool */}
      <section className="py-24 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold mb-4">Check your region</h2>
          <p className="text-gray-400 mb-8">Enter your city or country to ping the nearest EduTechAI edge node.</p>
          
          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="e.g. London, Nairobi, Tokyo" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-gray-700 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-full font-bold transition-colors">
              Ping
            </button>
          </form>

          {searchResult && (
            <div className="grid md:grid-cols-3 gap-4 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <div className="text-gray-500 text-sm uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><MapPin size={16}/> Nearest Node</div>
                <div className="text-2xl font-bold text-white">{searchResult.node}</div>
              </div>
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <div className="text-gray-500 text-sm uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><Activity size={16}/> Est. Latency</div>
                <div className="text-2xl font-bold text-cyan-400">{searchResult.latency}ms</div>
              </div>
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <div className="text-gray-500 text-sm uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><CircleCheck size={16}/> Compliance</div>
                <div className="text-lg font-bold text-emerald-400">{searchResult.compliance}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Regional Table */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Regional Capabilities</h2>
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#111] border-b border-gray-800">
                  <tr>
                    <th className="p-6 font-bold text-gray-400 uppercase tracking-widest">Region</th>
                    <th className="p-6 font-bold text-gray-400 uppercase tracking-widest">Data Residency</th>
                    <th className="p-6 font-bold text-gray-400 uppercase tracking-widest">Local Model</th>
                    <th className="p-6 font-bold text-gray-400 uppercase tracking-widest text-right">Pricing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {REGIONS.map((region, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-6 font-bold text-white flex items-center gap-2"><Server size={16} className="text-cyan-400"/> {region.name}</td>
                      <td className="p-6 text-gray-300">
                        {region.residency === 'Yes' ? (
                           <span className="text-emerald-400 flex items-center gap-1"><CircleCheck size={14}/> Yes ({region.location})</span>
                        ) : (
                          <span className="text-yellow-500">{region.residency}</span>
                        )}
                      </td>
                      <td className="p-6 text-gray-400">{region.model}</td>
                      <td className="p-6 text-right font-mono text-cyan-400">{region.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GlobalNetworkPage;
