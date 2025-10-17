"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CookBookFHEABI from "../../abi/CookBookFHEABI.json" assert { type: "json" };
import CookBookFHEAddresses from "../../abi/CookBookFHEAddresses.json" assert { type: "json" };

export default function Publish() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [stepsMd, setStepsMd] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;
      const p = new ethers.BrowserProvider(window.ethereum as any);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const network = await p.getNetwork();
      setProvider(p); setSigner(s); setChainId(Number(network.chainId));

      const networkKey = Number(network.chainId) === 31337 ? "localhost" : "sepolia";
      const address = (CookBookFHEAddresses as any)[networkKey]?.address as string | undefined;
      if (!address) { setMessage("Contract address not found for current network"); return; }
      const c = new ethers.Contract(address, (CookBookFHEABI as any).abi, s);
      setContract(c);
    };
    init();
  }, []);

  const onSelectImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setImages(files);
  };

  const uploadToIPFS = async (): Promise<string> => {
    const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!pinataJwt) throw new Error("Missing NEXT_PUBLIC_PINATA_JWT");

    // Minimal working path: upload metadata JSON only to avoid multi-file form constraints in browsers
    const pinBody = {
      pinataMetadata: { name: `cookbook-${Date.now()}` },
      pinataOptions: { cidVersion: 1 },
      pinataContent: {
        title,
        tags: tags.split(",").map(x => x.trim().toLowerCase()).filter(Boolean),
        stepsMd,
        images: images.map((f) => ({ name: f.name, type: f.type, size: f.size }))
      }
    };

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pinataJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pinBody),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Pinata upload failed: ${res.status} ${t}`);
    }
    const data = await res.json();
    return data.IpfsHash as string;
  };

  const publish = async () => {
    try {
      if (!contract) { setMessage("Wallet or contract not ready"); return; }
      if (!title || !tags || images.length === 0) {
        setMessage("Please fill all fields and select at least one image");
        return;
      }

      setIsLoading(true);
      setMessage("Uploading to IPFS...");
      const cid = await uploadToIPFS();

      setMessage("Publishing on blockchain...");
      const _tags = tags.split(",").map(x => x.trim()).filter(Boolean);
      const tx = await contract.createRecipe(title, cid, _tags);
      await tx.wait();
      
      setMessage(`✅ Published successfully! CID: ${cid}`);
      setTitle(""); setTags(""); setStepsMd(""); setImages([]);
    } catch (e: any) {
      setMessage(`❌ Publish failed: ${e?.message ?? e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-coffee mb-3">📝 Publish Your Recipe</h1>
        <p className="text-coffee/60">Share your culinary masterpiece with the blockchain community</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-coffee/10 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-coffee mb-2">Recipe Title</label>
          <input 
            className="w-full p-4 border-2 border-coffee/20 rounded-xl focus:outline-none focus:border-tomato transition-all text-lg" 
            placeholder="e.g., Grandma's Secret Chocolate Cake" 
            value={title} 
            onChange={e=>setTitle(e.target.value)} 
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-coffee mb-2">Tags (comma-separated)</label>
          <input 
            className="w-full p-4 border-2 border-coffee/20 rounded-xl focus:outline-none focus:border-tomato transition-all" 
            placeholder="e.g., dessert, chocolate, baking" 
            value={tags} 
            onChange={e=>setTags(e.target.value)} 
          />
          <p className="text-xs text-coffee/50 mt-1">Use tags to help others discover your recipe</p>
        </div>

        {/* Steps */}
        <div>
          <label className="block text-sm font-semibold text-coffee mb-2">Cooking Instructions (Markdown supported)</label>
          <textarea 
            className="w-full p-4 border-2 border-coffee/20 rounded-xl focus:outline-none focus:border-tomato transition-all font-mono text-sm h-48" 
            placeholder="## Ingredients&#10;- 2 cups flour&#10;- 1 cup sugar&#10;&#10;## Steps&#10;1. Preheat oven to 350°F&#10;2. Mix ingredients..." 
            value={stepsMd} 
            onChange={e=>setStepsMd(e.target.value)} 
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-semibold text-coffee mb-2">Recipe Photos</label>
          <div className="border-2 border-dashed border-coffee/20 rounded-xl p-8 text-center hover:border-tomato transition-all cursor-pointer bg-cream/20">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={onSelectImages} 
              className="hidden" 
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="text-5xl mb-3">📸</div>
              <p className="text-coffee font-medium mb-1">
                {images.length > 0 ? `${images.length} image(s) selected` : 'Click to upload images'}
              </p>
              <p className="text-sm text-coffee/50">PNG, JPG up to 10MB each</p>
            </label>
          </div>
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="px-3 py-1 bg-cream rounded-full text-sm text-coffee">
                  {img.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl border-l-4 ${message.includes('✅') ? 'bg-green-50 border-green-500' : message.includes('❌') ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
            <p className="text-coffee">{message}</p>
          </div>
        )}

        {/* Submit */}
        <button 
          onClick={publish} 
          disabled={isLoading || !contract}
          className="w-full py-4 bg-gradient-to-r from-tomato to-red-400 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '🔄 Publishing...' : '🚀 Publish Recipe'}
        </button>
      </div>

      {/* Info */}
      <div className="bg-gradient-to-br from-cream/50 to-yellow-50 rounded-2xl p-6 border border-coffee/10">
        <h3 className="font-semibold text-coffee mb-3 flex items-center gap-2">
          <span className="text-2xl">💡</span> How it works
        </h3>
        <ul className="space-y-2 text-sm text-coffee/70">
          <li>• Your recipe content is uploaded to IPFS for permanent decentralized storage</li>
          <li>• Metadata and references are recorded on the blockchain</li>
          <li>• All interactions (likes, tips) use FHE encryption for privacy</li>
        </ul>
      </div>
    </div>
  );
}


