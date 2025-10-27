"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import CookBookFHEABI from "../../abi/CookBookFHEABI.json" assert { type: "json" };
import CookBookFHEAddresses from "../../abi/CookBookFHEAddresses.json" assert { type: "json" };

export default function Mine() {
  const [ids, setIds] = useState<bigint[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        const eth = (typeof window !== 'undefined' ? (window as any).ethereum : undefined);
        if (!eth) return;
        const provider = new ethers.BrowserProvider(eth as any);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        setUserAddress(addr);
        
        const network = await provider.getNetwork();
        const networkKey = Number(network.chainId) === 31337 ? "localhost" : "sepolia";
        const caddr = (CookBookFHEAddresses as any)[networkKey]?.address as string | undefined;
        if (!caddr) { 
          setMessage("Contract address not found for current network"); 
          setLoading(false);
          return; 
        }
        const contract = new ethers.Contract(caddr, (CookBookFHEABI as any).abi, provider);
        const res = await contract.getUserRecipes(addr);
        setIds(res as bigint[]);
        setLoading(false);
      } catch (e: any) {
        setMessage(e?.message ?? String(e));
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-coffee mb-3">👨‍🍳 My Recipes</h1>
        <p className="text-coffee/60">Manage your published culinary creations</p>
        {userAddress && (
          <div className="mt-3 inline-block px-4 py-2 bg-cream rounded-full text-sm text-coffee/70">
            📍 {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 animate-bounce">🍳</div>
          <p className="text-coffee/60">Loading your recipes...</p>
        </div>
      )}

      {/* Error Message */}
      {message && !loading && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
          <p className="text-coffee">❌ {message}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && ids.length === 0 && !message && (
        <div className="text-center py-16 bg-gradient-to-br from-cream/30 to-yellow-50 rounded-2xl border-2 border-dashed border-coffee/20">
          <div className="text-7xl mb-4">🍽️</div>
          <h2 className="text-2xl font-bold text-coffee mb-2">No recipes yet</h2>
          <p className="text-coffee/60 mb-6">Start sharing your culinary creations!</p>
          <a 
            href="/publish" 
            className="inline-block px-8 py-3 bg-gradient-to-r from-tomato to-red-400 text-white rounded-full font-semibold hover:shadow-lg transition-all"
          >
            📝 Publish Your First Recipe
          </a>
        </div>
      )}

      {/* Recipe List */}
      {!loading && ids.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ids.map((id) => (
            <div key={id.toString()} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all border-2 border-coffee/5 group">
              <div className="h-40 bg-gradient-to-br from-orange-200 to-yellow-100 flex items-center justify-center text-5xl group-hover:scale-105 transition-transform">
                🍰
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-coffee mb-2">Recipe #{id.toString()}</h3>
                <p className="text-coffee/60 text-sm mb-4">Click to view details and interactions</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-coffee/60">
                    <span>❤️ --</span>
                    <span>💰 --</span>
                  </div>
                  <Link
                    href={`/recipe/${id.toString()}`}
                    className="px-4 py-2 bg-cream hover:bg-yellow-200 rounded-full text-sm font-medium transition-all"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Card */}
      {!loading && ids.length > 0 && (
        <div className="bg-gradient-to-br from-white to-cream/30 rounded-2xl shadow-md p-6 border-2 border-coffee/10">
          <h2 className="text-xl font-semibold text-coffee mb-4">📊 Your Stats</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-tomato">{ids.length}</div>
              <div className="text-sm text-coffee/60">Recipes Published</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-coffee">--</div>
              <div className="text-sm text-coffee/60">Total Likes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600">-- ETH</div>
              <div className="text-sm text-coffee/60">Total Tips Received</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


