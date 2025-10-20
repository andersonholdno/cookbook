import fs from "node:fs";
import path from "node:path";

type DeploymentsFile = {
  address: string;
  abi: any[];
  transactionHash?: string;
};

const ROOT = path.resolve(__dirname, "..");
const DEPLOYMENTS_DIR = path.join(ROOT, "deployments");

const FRONTEND_DIR = path.resolve(
  ROOT,
  "..",
  "frontend",
  "abi"
);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function exportNetwork(network: string) {
  const file = path.join(DEPLOYMENTS_DIR, network, "CookBookFHE.json");
  if (!fs.existsSync(file)) return;
  const json = JSON.parse(fs.readFileSync(file, "utf-8")) as DeploymentsFile;

  ensureDir(FRONTEND_DIR);
  const outABI = path.join(FRONTEND_DIR, "CookBookFHEABI.json");
  const outAddr = path.join(FRONTEND_DIR, "CookBookFHEAddresses.json");

  // 写 ABI（覆盖）
  fs.writeFileSync(outABI, JSON.stringify({ abi: json.abi }, null, 2));

  // 写地址映射（合并）
  let addresses: Record<string, { address: string; chainId?: number; chainName?: string }> = {};
  if (fs.existsSync(outAddr)) {
    try {
      addresses = JSON.parse(fs.readFileSync(outAddr, "utf-8"));
    } catch {}
  }

  const entry = addresses[network] ?? {};
  entry.address = json.address;
  if (network === "sepolia") {
    entry.chainId = 11155111;
    entry.chainName = "Sepolia";
  } else if (network === "localhost") {
    entry.chainId = 31337;
    entry.chainName = "Hardhat";
  }
  addresses[network] = entry;

  fs.writeFileSync(outAddr, JSON.stringify(addresses, null, 2));
  console.log(`Exported ABI/address for ${network} ->`, entry.address);
}

function main() {
  ["localhost", "sepolia"].forEach((n) => exportNetwork(n));
}

main();






