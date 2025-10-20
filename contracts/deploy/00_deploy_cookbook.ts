import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, getOrNull, log } = hre.deployments;

  const deployed = await deploy("CookBookFHE", {
    from: deployer,
    log: true,
  });

  log(`CookBookFHE deployed at ${deployed.address}`);
};

export default func;
func.id = "deploy_cookbook_fhe";
func.tags = ["CookBookFHE"];






