"use client";
import { useEffect, useState } from "react";

function truncate(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

export default function ConnectWalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    // Try eager connect
    eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs && accs.length > 0) setAddress(accs[0]);
    }).catch(() => {});

    const onAccounts = (accs: string[]) => setAddress(accs && accs.length ? accs[0] : null);
    const onChain = () => window.location.reload();
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = async () => {
    try {
      setConnecting(true);
      const eth = (window as any).ethereum;
      if (!eth) {
        window.open("https://metamask.io/download/", "_blank");
        return;
      }
      // Request accounts
      const accs: string[] = await eth.request({ method: "eth_requestAccounts" });
      setAddress(accs && accs.length ? accs[0] : null);
    } catch (e) {
      // ignore
    } finally {
      setConnecting(false);
    }
  };

  const switchToSepolia = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xaa36a7",
              chainName: "Sepolia",
              rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
        } catch {}
      }
    }
  };

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <button onClick={switchToSepolia} className="px-3 py-2 bg-white/70 rounded-full text-sm hover:bg-white transition-all">
          Switch to Sepolia
        </button>
        <div className="px-4 py-2 bg-cream rounded-full font-semibold text-coffee shadow-sm">
          {truncate(address)}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="px-6 py-2 bg-tomato text-white rounded-full font-semibold hover:bg-red-500 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}






