"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import CookBookFHEABI from "../../../abi/CookBookFHEABI.json" assert { type: "json" };
import CookBookFHEAddresses from "../../../abi/CookBookFHEAddresses.json" assert { type: "json" };

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

type RecipeBasic = {
  id: bigint;
  author: string;
  title: string;
  ipfsCID: string;
  tags: string[];
  timestamp: bigint;
  likesHandle: string;
  tipsHandle: string;
};

type RecipeContent = {
  title?: string;
  description?: string;
  image?: string;
  ingredients?: string[];
  steps?: string[];
  stepsMd?: string;
  tags?: string[];
  images?: { name: string; type?: string; cid?: string; url?: string; size?: number }[];
  content?: string;
};

export default function RecipeDetail() {
  const params = useParams<{ id: string | string[] }>();
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [recipe, setRecipe] = useState<RecipeBasic | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [content, setContent] = useState<RecipeContent | null>(null);
  const [likes, setLikes] = useState<bigint | null>(null);
  const [tipsWei, setTipsWei] = useState<bigint | null>(null);
  const [pendingTipsWei, setPendingTipsWei] = useState<bigint | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [hasDecrypted, setHasDecrypted] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const eth = (typeof window !== 'undefined' ? (window as any).ethereum : undefined);
        if (!eth) {
          setMessage("请先连接钱包 (MetaMask)");
          setLoading(false);
          return;
        }
        const provider = new ethers.BrowserProvider(eth as any);
        const network = await provider.getNetwork();
        const cidNum = Number(network.chainId);
        setChainId(cidNum);
        const networkKey = cidNum === 31337 ? "localhost" : "sepolia";
        const address = (CookBookFHEAddresses as any)[networkKey]?.address as string | undefined;
        if (!address) {
          setMessage("当前网络未配置合约地址");
          setLoading(false);
          return;
        }
        setContractAddress(address);
        const contract = new ethers.Contract(address, (CookBookFHEABI as any).abi, provider);
        const id = BigInt(idParam);
        const res: any = await contract.getRecipe(id);
        const data: RecipeBasic = {
          id: res[0] as bigint,
          author: res[1] as string,
          title: res[2] as string,
          ipfsCID: res[3] as string,
          tags: (res[4] as string[]) ?? [],
          likesHandle: res[5] as string,
          tipsHandle: res[6] as string,
          timestamp: res[7] as bigint,
        };
        setRecipe(data);
        // 读取待提现余额
        try {
          const pending: any = await contract.pendingTips(id);
          setPendingTipsWei(BigInt(pending ?? 0n));
        } catch {}
        // Try loading content from IPFS (image / JSON / text)
        if (data.ipfsCID) {
          try {
            const url = `https://ipfs.io/ipfs/${data.ipfsCID}`;
            const resp = await fetch(url, { method: "GET" });
            const contentType = resp.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const json = await resp.json();
              const recipeJson: RecipeContent = {
                title: typeof json?.title === "string" ? json.title : undefined,
                description: typeof json?.description === "string" ? json.description : undefined,
                image:
                  typeof json?.image === "string"
                    ? json.image
                    : typeof json?.img === "string"
                    ? json.img
                    : typeof json?.picture === "string"
                    ? json.picture
                    : undefined,
                ingredients: Array.isArray(json?.ingredients)
                  ? (json.ingredients as string[])
                  : undefined,
                steps: Array.isArray(json?.steps) ? (json.steps as string[]) : undefined,
                stepsMd: typeof json?.stepsMd === "string" ? json.stepsMd : undefined,
                tags: Array.isArray(json?.tags) ? (json.tags as string[]) : undefined,
                images: Array.isArray(json?.images) ? (json.images as any[]) : undefined,
              };
              setContent(recipeJson);
              const img = recipeJson.image;
              if (typeof img === "string") {
                setImageUrl(img.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${img.replace("ipfs://", "")}` : img);
              }
            } else {
              // Assume raw file (image or html)
              setImageUrl(url);
              if (contentType.startsWith("text/")) {
                const text = await resp.text();
                setContent({ content: text });
              }
            }
          } catch {}
        }
        setLoading(false);
      } catch (e: any) {
        setMessage(e?.message ?? String(e));
        setLoading(false);
      }
    };
    run();
  }, [idParam]);

  const canDecrypt = useMemo(() => {
    return Boolean(recipe && contractAddress && chainId === 11155111);
  }, [recipe, contractAddress, chainId]);

  const uiTitle = useMemo(() => content?.title || recipe?.title || `Recipe #${idParam}`, [content?.title, recipe?.title, idParam]);

  const uiTags = useMemo(() => {
    const set = new Set<string>();
    (recipe?.tags ?? []).forEach((t) => set.add(String(t)));
    (content?.tags ?? []).forEach((t) => set.add(String(t)));
    return Array.from(set);
  }, [recipe?.tags, content?.tags]);

  const decrypt = async () => {
    try {
      if (!recipe || !contractAddress) return;
      const eth = (typeof window !== 'undefined' ? (window as any).ethereum : undefined);
      if (!eth) throw new Error("请先连接钱包");
      const provider = new ethers.BrowserProvider(eth as any);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 11155111) {
        throw new Error("解密仅在 Sepolia 可用");
      }
      const relayerSDK = await loadRelayerSDK();
      await relayerSDK.initSDK();
      const instance = await relayerSDK.createInstance({
        ...relayerSDK.SepoliaConfig,
        network: (window as any).ethereum,
      });

      const { publicKey, privateKey } = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 365;
      const eip712 = instance.createEIP712(
        publicKey,
        [contractAddress],
        startTimestamp,
        durationDays
      );
      const signature = await (signer as any).signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const res = await instance.userDecrypt(
        [
          { handle: recipe.likesHandle, contractAddress },
          { handle: recipe.tipsHandle, contractAddress },
        ],
        privateKey,
        publicKey,
        signature,
        [contractAddress],
        await signer.getAddress(),
        startTimestamp,
        durationDays
      );

      const likesClear = res[recipe.likesHandle];
      const tipsClear = res[recipe.tipsHandle];
      setLikes(BigInt(likesClear ?? 0));
      setTipsWei(BigInt(tipsClear ?? 0));
      setHasDecrypted(true);
    } catch (e: any) {
      setMessage(e?.message ?? String(e));
    }
  };

  const withdraw = async () => {
    try {
      if (!recipe || !contractAddress) return;
      const eth2 = (typeof window !== 'undefined' ? (window as any).ethereum : undefined);
      if (!eth2) throw new Error("请先连接钱包");
      if (!hasDecrypted) throw new Error("请先完成解密");
      setWithdrawing(true);
      const provider = new ethers.BrowserProvider(eth2 as any);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 11155111) {
        throw new Error("提现仅在 Sepolia 可用");
      }
      const me = (await signer.getAddress()).toLowerCase();
      if (me !== recipe.author.toLowerCase()) {
        throw new Error("仅作者可提现");
      }
      const contract = new ethers.Contract(contractAddress, (CookBookFHEABI as any).abi, signer);
      const tx = await contract.withdrawTips(recipe.id);
      setMessage(`提现交易已发送: ${tx.hash}`);
      await tx.wait();
      // 刷新待提现余额
      const ro = new ethers.Contract(contractAddress, (CookBookFHEABI as any).abi, provider);
      const pending: any = await ro.pendingTips(recipe.id);
      setPendingTipsWei(BigInt(pending ?? 0n));
      setMessage("提现成功");
    } catch (e: any) {
      setMessage(e?.message ?? String(e));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-coffee">🍰 Recipe #{idParam}</h1>
        <Link href="/" className="px-4 py-2 rounded-full bg-cream hover:bg-yellow-200">Back</Link>
      </div>

      {loading && (
        <div className="text-center py-12 text-coffee/60">加载中…</div>
      )}

      {message && !loading && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-coffee">{message}</div>
      )}

      {!loading && recipe && (
        <div className="bg-white rounded-2xl shadow p-6 border-2 border-coffee/10">
          <div className="h-48 mb-6 rounded-xl bg-gradient-to-br from-orange-200 to-yellow-100 flex items-center justify-center text-6xl">🍰</div>
          <h2 className="text-2xl font-semibold text-coffee mb-2">{uiTitle}</h2>
          <div className="text-sm text-coffee/70 mb-4">作者: {recipe.author}</div>
          {imageUrl && (
            <img src={imageUrl} alt="recipe" className="w-full rounded-xl mb-4" />
          )}
          {Array.isArray(content?.images) && content!.images!.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {content!.images!.map((img, i) => {
                const href = img?.cid
                  ? `https://ipfs.io/ipfs/${img.cid}`
                  : img?.url
                  ? (img.url.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${img.url.replace("ipfs://", "")}` : img.url)
                  : undefined;
                return (
                  <a key={i} href={href} target="_blank" className="block">
                    <div className="aspect-video w-full overflow-hidden rounded-xl bg-cream flex items-center justify-center">
                      {href ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={href} alt={img?.name || `image-${i}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-coffee/60 text-sm">{img?.name || `image-${i}`}</div>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
          {content?.description && (
            <p className="text-coffee/80 leading-7 mb-4">{content.description}</p>
          )}
          {Array.isArray(content?.ingredients) && content!.ingredients!.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">配料</h3>
              <ul className="list-disc pl-6 space-y-1 text-coffee/80">
                {content!.ingredients!.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(content?.steps) && content!.steps!.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">步骤</h3>
              <ol className="list-decimal pl-6 space-y-2 text-coffee/80">
                {content!.steps!.map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ol>
            </div>
          )}
          {content?.content && (
            <pre className="whitespace-pre-wrap bg-cream rounded-xl p-4 text-coffee/80 mb-4">{content.content}</pre>
          )}
          {uiTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {uiTags.map((t, idx) => (
                <span key={idx} className="px-3 py-1 text-sm rounded-full bg-cream">#{t}</span>
              ))}
            </div>
          )}
          {recipe.ipfsCID && (
            <div className="text-coffee/70">
              内容CID: <a className="underline" href={`https://ipfs.io/ipfs/${recipe.ipfsCID}`} target="_blank">{recipe.ipfsCID}</a>
            </div>
          )}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={decrypt}
              disabled={!canDecrypt}
              className="px-4 py-2 rounded-lg bg-tomato text-white disabled:opacity-50"
            >
              🔐 解密
            </button>
            <div className="text-coffee/70 text-sm">{canDecrypt ? "Sepolia 可解密" : "切到 Sepolia 才能解密"}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-cream rounded-xl">
              <div className="text-sm text-coffee/60">Likes</div>
              <div className="text-xl font-semibold text-coffee">{likes !== null ? likes.toString() : "--"}</div>
            </div>
            <div className="p-4 bg-cream rounded-xl">
              <div className="text-sm text-coffee/60">Tips</div>
              <div className="text-xl font-semibold text-coffee">{tipsWei !== null ? `${ethers.formatEther(tipsWei)} ETH` : "--"}</div>
            </div>
          </div>
          {hasDecrypted && (
            <div className="mt-3 p-4 bg-cream rounded-xl flex items-center justify-between">
              <div>
                <div className="text-sm text-coffee/60">待提现</div>
                <div className="text-lg font-semibold text-coffee">{pendingTipsWei !== null ? `${ethers.formatEther(pendingTipsWei)} ETH` : "--"}</div>
              </div>
              <button
                onClick={withdraw}
                disabled={withdrawing || !pendingTipsWei || pendingTipsWei === 0n}
                className="px-4 py-2 rounded-lg bg-coffee text-white disabled:opacity-50"
              >
                {withdrawing ? "提现中..." : "提现"}
              </button>
            </div>
          )}
          <div className="text-coffee/60 mt-4 text-sm">时间: {new Date(Number(recipe.timestamp) * 1000).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}


