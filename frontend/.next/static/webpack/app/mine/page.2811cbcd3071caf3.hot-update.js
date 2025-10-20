"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/mine/page",{

/***/ "(app-pages-browser)/./abi/CookBookFHEABI.json":
/*!*********************************!*\
  !*** ./abi/CookBookFHEABI.json ***!
  \*********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = /*#__PURE__*/JSON.parse('{"abi":[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"author","type":"address"},{"indexed":false,"internalType":"string","name":"title","type":"string"},{"indexed":false,"internalType":"string","name":"ipfsCID","type":"string"},{"indexed":false,"internalType":"string[]","name":"tags","type":"string[]"}],"name":"RecipeCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"RecipeLiked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"RecipeTipped","type":"event"},{"inputs":[{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"ipfsCID","type":"string"},{"internalType":"string[]","name":"tags","type":"string[]"}],"name":"createRecipe","outputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getRecipe","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string[]","name":"","type":"string[]"},{"internalType":"euint32","name":"","type":"bytes32"},{"internalType":"euint64","name":"","type":"bytes32"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserRecipes","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"grantUserDecrypt","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"externalEuint32","name":"delta","type":"bytes32"},{"internalType":"bytes","name":"proof","type":"bytes"}],"name":"likeRecipe","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"protocolId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"recipeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"recipes","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"author","type":"address"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"ipfsCID","type":"string"},{"internalType":"euint32","name":"likes","type":"bytes32"},{"internalType":"euint64","name":"tips","type":"bytes32"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"tipAuthor","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userLiked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userRecipes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]}');

/***/ }),

/***/ "(app-pages-browser)/./abi/CookBookFHEAddresses.json":
/*!***************************************!*\
  !*** ./abi/CookBookFHEAddresses.json ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = /*#__PURE__*/JSON.parse('{"sepolia":{"address":"0xBDE7F59a88D16b199fb7FEB233DeEE028E693cd4","chainId":11155111,"chainName":"Sepolia"}}');

/***/ })

});