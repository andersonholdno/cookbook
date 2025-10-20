# CookBookFHE Contracts

## 快速开始

```bash
# 进入合约工程
cd action/contracts

# 安装依赖
pnpm i # 或 npm i / yarn

# 配置变量（用于部署与验证）
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY

# 编译
pnpm build

# 本地节点
pnpm node
# 另开一个终端部署到本地
pnpm deploy:localhost

# 部署到 Sepolia
pnpm deploy:sepolia
# (可选) 验证
pnpm verify:sepolia <DEPLOYED_ADDRESS>

# 导出 ABI 与地址到前端
pnpm ts-node scripts/export-frontend-abi.ts
```

## 合约概述
- `CookBookFHE.sol` 使用 FHE 类型 `euint32/euint64` 存储点赞数与打赏总额。
- 外部加密输入使用 `externalEuintX + bytes proof`，通过 `FHE.fromExternal` 转内部类型。
- 事件：`RecipeCreated/RecipeLiked/RecipeTipped` 便于前端索引。

## 接口摘要
- `createRecipe(title, ipfsCID, tags)` 新建食谱
- `likeRecipe(id, externalEuint32 delta, bytes proof)` 点赞（delta 一般为加密的 +1）
- `tipAuthor(id)` payable 打赏 ETH，并将明文 value 以标量加到加密计数 `tips`
- `getRecipe(id)` 返回包含加密计数的句柄（前端调用解密）
- `getUserRecipes(user)` 获取用户发布的食谱 id 列表

## 注意事项
- 若本地 FHEVM 节点报 KMSVerifierAddress 缺失，请在预编译地址文件补齐后重启节点与部署。




