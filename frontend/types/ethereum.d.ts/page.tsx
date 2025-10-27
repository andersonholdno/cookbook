"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import CookBookFHEABI from "../abi/CookBookFHEABI.json" assert { type: "json" };
import CookBookFHEAddresses from "../abi/CookBookFHEAddresses.json" assert { type: "json" };

const SDK_CDN = "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs";

async function loadRelayerSDK(): Promise<any> {
  if (typeof window === "undefined") return undefined;
  if ((window as any).relayerSDK) return (window as any).relayerSDK;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_CDN; s.type = "text/javascript"; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Relayer SDK"));
    document.head.appendChild(s);
  });
  return (window as any).relayerSDK;
}

export default function Home() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [message, setMessage] = useState<string>("");
  const [fhevm, setFhevm] = useState<any>(null);
  const [recipeId, setRecipeId] = useState<string>("");
  const [tipEth, setTipEth] = useState<string>("0.001");
  const [likeState, setLikeState] = useState<"idle"|"encrypting"|"sending"|"success"|"error">("idle");
  const [likeTxHash, setLikeTxHash] = useState<string | undefined>(undefined);
  const [recent, setRecent] = useState<Array<{ id: bigint; title: string; ipfsCID: string; imageUrl?: string }>>([]);
  const [recentLoading, setRecentLoading] = useState<boolean>(false);
  const [tipState, setTipState] = useState<"idle"|"sending"|"success"|"error">("idle");
  const [tipTxHash, setTipTxHash] = useState<string | undefined>(undefined);
  const [tipRecipeId, setTipRecipeId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const eth = (typeof window !== 'undefined' ? (window as any).ethereum : undefined);
      if (!eth) return;
      const p = new ethers.BrowserProvider(eth as any);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const network = await p.getNetwork();
      setProvider(p); setSigner(s); setChainId(Number(network.chainId));

      const networkKey = Number(network.chainId) === 31337 ? "localhost" : "sepolia";
      const address = (CookBookFHEAddresses as any)[networkKey]?.address as string | undefined;
      if (!address) { setMessage("Contract address not found for current network"); return; }

      const c = new ethers.Contract(address, (CookBookFHEABI as any).abi, s);
      setContract(c);

      if (Number(network.chainId) === 11155111) {
        try {
          const relayerSDK = await loadRelayerSDK();
          await relayerSDK.initSDK();
          const instance = await relayerSDK.createInstance({
            ...relayerSDK.SepoliaConfig,
            network: (window as any).ethereum,
          });
          setFhevm(instance);
        } catch (e) {
          setMessage(`Relayer SDK init failed: ${(e as any)?.message ?? e}`);
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        if (!contract) return;
        setRecentLoading(true);
        const total: bigint = await contract.recipeCount();
        const max = 6n;
        const start = total > 0n ? (total - (total > max ? max : total)) + 1n : 1n;
        const ids: bigint[] = total > 0n ? Array.from({ length: Number(total - start + 1n) }, (_, i) => start + BigInt(i)) : [];
        const results = await Promise.all(
          ids.map(async (id) => {
            const r: any = await contract.getRecipe(id);
            const info = { id: r[0] as bigint, title: (r[2] as string) || `Recipe #${id.toString()}`, ipfsCID: r[3] as string };
            let imageUrl: string | undefined;
            if (info.ipfsCID) {
              try {
                const url = `https://ipfs.io/ipfs/${info.ipfsCID}`;
                const resp = await fetch(url);
                const type = resp.headers.get("content-type") || "";
                if (type.includes("application/json")) {
                  const j = await resp.json();
                  const img = j?.image || j?.img || j?.picture;
                  if (typeof img === "string") {
                    imageUrl = img.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${img.replace("ipfs://", "")}` : img;
                  }
                } else {
                  imageUrl = url;
                }
              } catch {}
            }
            return { ...info, imageUrl };
          })
        );
        setRecent(results);
      } catch (e: any) {
        setMessage(`Load recent failed: ${e?.message ?? e}`);
      } finally {
        setRecentLoading(false);
      }
    };
    loadRecent();
  }, [contract]);

  const connectStatus = useMemo(() => {
    if (!provider) return "Not connected";
    if (!signer) return "No signer";
    if (!chainId) return "Unknown network";
    return `Connected - Chain ${chainId}`;
  }, [provider, signer, chainId]);

  const like = async () => {
    try {
      if (!contract || !signer) throw new Error("Contract or wallet not ready");
      if (!fhevm) throw new Error("FHEVM not initialized (Sepolia only)");
      const id = BigInt(recipeId);
      const user = await (signer as any).getAddress();
      setLikeState("encrypting");
      const input = fhevm.createEncryptedInput(contract.target as string, user);
      input.add32(BigInt(1));
      const enc = await input.encrypt();
      setLikeState("sending");
      const tx = await contract.likeRecipe(id, enc.handles[0], enc.inputProof);
      setLikeTxHash(tx.hash);
      setMessage(`Like tx sent: ${tx.hash}`);
      await tx.wait();
      setLikeState("success");
      setMessage(`Liked successfully!`);
      // auto reset UI
      setTimeout(() => { setLikeState("idle"); setLikeTxHash(undefined); }, 2500);
    } catch (e: any) {
      setLikeState("error");
      setMessage(`Like failed: ${e?.message ?? e}`);
      setTimeout(() => setLikeState("idle"), 2500);
    }
  };

  const tip = async () => {
    try {
      if (!contract) throw new Error("Contract not ready");
      if (!tipRecipeId) throw new Error("Please enter a recipe id");
      const id = BigInt(tipRecipeId);
      const value = ethers.parseEther(tipEth || "0");
      if (value <= 0n) throw new Error("Amount must be greater than 0");
      const total: bigint = await contract.recipeCount();
      if (id <= 0n || id > total) throw new Error(`Invalid recipe id ${id.toString()}`);
      setTipState("sending");
      const tx = await contract.tipAuthor(id, { value });
      setTipTxHash(tx.hash);
      setMessage(`Tip tx sent: ${tx.hash}`);
      await tx.wait();
      setTipState("success");
      setMessage(`Tipped successfully!`);
      setTimeout(() => { setTipState("idle"); setTipTxHash(undefined); }, 2500);
    } catch (e: any) {
      setTipState("error");
      setMessage(`Tip failed: ${e?.message ?? e}`);
      setTimeout(() => setTipState("idle"), 2500);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 bg-gradient-to-br from-cream via-yellow-50 to-orange-50 rounded-3xl shadow-lg">
        <h1 className="text-5xl font-bold text-coffee mb-4">🍳 Discover Amazing Recipes</h1>
        <p className="text-xl text-coffee/70 max-w-2xl mx-auto">
          Share your culinary creations on the blockchain. Every recipe is an NFT asset with encrypted interactions powered by FHEVM.
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-coffee/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-coffee">📡 Connection Status</h2>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${chainId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {connectStatus}
          </span>
        </div>
        {message && (
          <div className="mt-4 p-4 bg-orange-50 border-l-4 border-tomato rounded text-coffee">
            {message}
          </div>
        )}
      </div>

      {/* Featured Recipes (From Contract) */}
      <div>
        <h2 className="text-3xl font-bold text-coffee mb-6">✨ Featured Recipes</h2>
        {recentLoading && (
          <div className="text-coffee/60">Loading recipes...</div>
        )}
        {!recentLoading && recent.length === 0 && (
          <div className="text-coffee/60">No recipes yet. Go to Publish and create one!</div>
        )}
        {!recentLoading && recent.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recent.map((r) => (
              <div key={r.id.toString()} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all border-2 border-coffee/5 group">
                <div className="h-48 bg-gradient-to-br from-orange-200 to-yellow-100 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform overflow-hidden">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="recipe" className="w-full h-full object-cover" />
                  ) : (
                    <span>🍰</span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-coffee mb-2">{r.title || `Recipe #${r.id.toString()}`}</h3>
                  <p className="text-coffee/60 text-sm mb-4">Click to view details and interactions</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-coffee/60">
                      <span>❤️ --</span>
                      <span>💰 --</span>
                    </div>
                    <Link
                      href={`/recipe/${r.id.toString()}`}
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
      </div>

      {/* Interaction Panel */}
      <div className="bg-gradient-to-br from-white to-cream/30 rounded-2xl shadow-md p-8 border-2 border-coffee/10">
        <h2 className="text-2xl font-bold text-coffee mb-6">🎯 Interact with Recipes</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Like */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-coffee mb-4 flex items-center gap-2">
              ❤️ Like a Recipe
            </h3>
            <p className="text-sm text-coffee/60 mb-4">
              Use FHE encryption to anonymously like a recipe (Sepolia only)
            </p>
            <input 
              className="w-full p-3 border-2 border-coffee/20 rounded-lg mb-4 focus:outline-none focus:border-tomato transition-all" 
              placeholder="Enter Recipe ID" 
              value={recipeId} 
              onChange={e=>setRecipeId(e.target.value)} 
              disabled={likeState!=="idle"}
            />
            <button 
              onClick={like} 
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 
                ${likeState==="success" ? "bg-green-500 text-white" : likeState==="error" ? "bg-red-500 text-white" : "bg-gradient-to-r from-tomato to-red-400 text-white hover:shadow-lg"}`}
              disabled={!fhevm || likeState!=="idle" || !recipeId}
            >
              { !fhevm ? '⚠️ FHEVM Not Ready' :
                likeState==='encrypting' ? '🔐 Encrypting...' :
                likeState==='sending' ? '🚀 Sending...' :
                likeState==='success' ? '✅ Liked' :
                likeState==='error' ? '❌ Failed' :
                '❤️ Like (FHE Encrypted)' }
            </button>
            {likeTxHash && (
              <div className="mt-2 text-xs text-coffee/60 break-all">tx: {likeTxHash}</div>
            )}
          </div>

          {/* Tip */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-coffee mb-4 flex items-center gap-2">
              💰 Tip the Chef
            </h3>
            <p className="text-sm text-coffee/60 mb-4">
              Send ETH directly to the recipe creator
            </p>
            <input 
              className="w-full p-3 border-2 border-coffee/20 rounded-lg mb-4 focus:outline-none focus:border-tomato transition-all" 
              placeholder="Enter Recipe ID" 
              value={tipRecipeId} 
              onChange={e=>setTipRecipeId(e.target.value)} 
              disabled={tipState!=="idle"}
            />
            <input 
              className="w-full p-3 border-2 border-coffee/20 rounded-lg mb-4 focus:outline-none focus:border-tomato transition-all" 
              placeholder="Amount in ETH" 
              value={tipEth} 
              onChange={e=>setTipEth(e.target.value)} 
              disabled={tipState!=="idle"}
            />
            <button 
              onClick={tip} 
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 
                ${tipState==="success" ? "bg-green-500 text-white" : tipState==="error" ? "bg-red-500 text-white" : "bg-gradient-to-r from-yellow-400 to-orange-400 text-coffee hover:shadow-lg"}`}
              disabled={!contract || tipState!=="idle" || !tipEth || !tipRecipeId}
            >
              { tipState==='sending' ? '🚀 Sending...' :
                tipState==='success' ? '✅ Tipped' :
                tipState==='error' ? '❌ Failed' :
                '💸 Send Tip' }
            </button>
            {tipTxHash && (
              <div className="mt-2 text-xs text-coffee/60 break-all">tx: {tipTxHash}</div>
            )}
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-coffee/5 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-coffee mb-6 text-center">🔐 How FHEVM Works</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-semibold text-coffee mb-2">Encrypted Likes</h3>
            <p className="text-sm text-coffee/60">Like counts are stored as encrypted values on-chain</p>
          </div>
          <div>
            <div className="text-4xl mb-3">💎</div>
            <h3 className="font-semibold text-coffee mb-2">Privacy-Preserving Tips</h3>
            <p className="text-sm text-coffee/60">Tip amounts are accumulated in encrypted form</p>
          </div>
          <div>
            <div className="text-4xl mb-3">🌐</div>
            <h3 className="font-semibold text-coffee mb-2">Decentralized Storage</h3>
            <p className="text-sm text-coffee/60">Recipe content is stored on IPFS permanently</p>
          </div>
        </div>
      </div>
    </div>
  );
}


