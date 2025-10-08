// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, ebool, externalEuint32, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * CookBookFHE
 * - 将交互计数（likes、tipsAmount）存储为加密计数，展示时通过授权解密
 * - 标题、IPFS CID、标签等依旧明文（参考需求：大内容上 IPFS，链上仅元数据）
 * - 外部输入采用 externalEuintX + bytes proof，通过 FHE.fromExternal() 转内部类型
 */
contract CookBookFHE is SepoliaConfig {
    struct Recipe {
        uint256 id;
        address author;
        string title;
        string ipfsCID; // IPFS 内容根（JSON 包含图片、配料、步骤等）
        string[] tags;  // 简化：直接存字符串数组，前端规范化小写与长度
        euint32 likes;  // 加密点赞计数
        euint64 tips;   // 加密累计打赏（以 wei 计）
        uint256 timestamp;
    }

    event RecipeCreated(uint256 indexed id, address indexed author, string title, string ipfsCID, string[] tags);
    event RecipeLiked(uint256 indexed id, address indexed user);
    event RecipeTipped(uint256 indexed id, address indexed from, uint256 value);
    event TipsWithdrawn(uint256 indexed id, address indexed author, uint256 value);

    mapping(uint256 => Recipe) public recipes;
    mapping(address => uint256[]) public userRecipes;
    mapping(address => mapping(uint256 => bool)) public userLiked; // 明文去重判断
    // 每条食谱累积的待提现打赏（以 wei 计）
    mapping(uint256 => uint256) public pendingTips;
    uint256 public recipeCount;

    // --- 创建食谱 ---
    function createRecipe(
        string calldata title,
        string calldata ipfsCID,
        string[] calldata tags
    ) external returns (uint256 id) {
        id = ++recipeCount;

        // 初始化加密计数为 0（trivial encryption）
        euint32 encLikes = FHE.asEuint32(0);
        euint64 encTips = FHE.asEuint64(0);

        recipes[id] = Recipe({
            id: id,
            author: msg.sender,
            title: title,
            ipfsCID: ipfsCID,
            tags: tags,
            likes: encLikes,
            tips: encTips,
            timestamp: block.timestamp
        });

        userRecipes[msg.sender].push(id);

        // 允许合约继续访问并按需授权作者解密
        FHE.allowThis(recipes[id].likes);
        FHE.allowThis(recipes[id].tips);
        FHE.allow(recipes[id].likes, msg.sender);
        FHE.allow(recipes[id].tips, msg.sender);

        emit RecipeCreated(id, msg.sender, title, ipfsCID, tags);
    }

    // --- 点赞（外部密文输入：本需求中点赞为 +1，可允许前端传 encrypted +1）---
    function likeRecipe(
        uint256 id,
        externalEuint32 delta,
        bytes calldata proof
    ) external {
        require(id > 0 && id <= recipeCount, "invalid id");
        require(!userLiked[msg.sender][id], "already liked");

        // 从外部输入还原为内部加密值
        euint32 encDelta = FHE.fromExternal(delta, proof);
        recipes[id].likes = FHE.add(recipes[id].likes, encDelta);
        // 新的密文句柄需要重新授权给本合约
        FHE.allowThis(recipes[id].likes);
        // 确保作者在点赞后仍保有持久解密权限（句柄已更新）
        FHE.allow(recipes[id].likes, recipes[id].author);

        // 点赞只记录一次，防刷
        userLiked[msg.sender][id] = true;

        // 授权调用者后续可解密查看点赞计数
        FHE.allow(recipes[id].likes, msg.sender);
        // 以及当次交易临时授权，便于链上事件后的立即读取
        FHE.allowTransient(recipes[id].likes, msg.sender);

        emit RecipeLiked(id, msg.sender);
    }

    // --- 打赏：金额由 msg.value 提供，同时允许外部密文参与（例如前端传入加密校验值）---
    function tipAuthor(uint256 id) external payable {
        require(id > 0 && id <= recipeCount, "invalid id");
        require(msg.value > 0, "no tip");

        Recipe storage r = recipes[id];

        // 将明文 value 以标量方式累加到加密 tips（更省 gas）
        r.tips = FHE.add(r.tips, uint64(msg.value));
        // 新的密文句柄需要重新授权给本合约
        FHE.allowThis(r.tips);

        // 允许作者与本次调用者解密查看（持久 + 临时）
        FHE.allow(r.tips, r.author);
        FHE.allow(r.tips, msg.sender);
        FHE.allowTransient(r.tips, msg.sender);
        
        // 累计待提现余额，由作者主动 withdraw
        pendingTips[id] += msg.value;

        emit RecipeTipped(id, msg.sender, msg.value);
    }

    // 作者提现当前食谱累计的打赏
    function withdrawTips(uint256 id) external {
        require(id > 0 && id <= recipeCount, "invalid id");
        Recipe storage r = recipes[id];
        require(msg.sender == r.author, "only author");
        uint256 amount = pendingTips[id];
        require(amount > 0, "nothing to withdraw");
        pendingTips[id] = 0;
        (bool ok, ) = payable(r.author).call{ value: amount }("");
        require(ok, "withdraw failed");
        emit TipsWithdrawn(id, r.author, amount);
    }

    // 作者手动授权任意地址解密查看某条食谱的 likes/tips
    function grantUserDecrypt(uint256 id, address user) external {
        require(id > 0 && id <= recipeCount, "invalid id");
        Recipe storage r = recipes[id];
        require(msg.sender == r.author, "only author");
        FHE.allow(r.likes, user);
        FHE.allow(r.tips, user);
    }

    // --- 查询：返回加密句柄 ---
    function getRecipe(uint256 id) external view returns (
        uint256,
        address,
        string memory,
        string memory,
        string[] memory,
        euint32,
        euint64,
        uint256
    ) {
        require(id > 0 && id <= recipeCount, "invalid id");
        Recipe storage r = recipes[id];
        return (r.id, r.author, r.title, r.ipfsCID, r.tags, r.likes, r.tips, r.timestamp);
    }

    function getUserRecipes(address user) external view returns (uint256[] memory) {
        return userRecipes[user];
    }
}


