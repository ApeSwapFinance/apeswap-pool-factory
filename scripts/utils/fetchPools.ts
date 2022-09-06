import axios from "axios";

const APESWAP_LIST_URL =
  "https://raw.githubusercontent.com/ApeSwapFinance/apeswap-lists/main/config";

// As of 2022.09.06
interface ASPoolInfo {
  sousId: number;
  tokenName: string;
  image: string;
  stakingToken: {
    symbol: string;
    address: {
        [key: string]: string
    };
    decimals: number;
    active: boolean;
  };
  rewardToken: {
    symbol: string;
    address: {
        [key: string]: string
    };
    decimals: number;
    active: boolean;
  };
  contractAddress: {
    [key: string]: string
  };
  poolCategory: "Core" | "ApeZone" | "Jungle" | "Binance" | "Community";
  projectLink: string;
  twitter: string;
  harvest: boolean;
  tokenPerBlock: string | number;
  sortOrder: number;
  isFinished: boolean;
  tokenDecimals: number;
}

export const fetchPoolConfig = async (): Promise<ASPoolInfo[]> => {
  return fetchApeSwapList('pools')
};

const fetchApeSwapList = async (list: string): Promise<any> => {
  try {
    const response = await axios.get(`${APESWAP_LIST_URL}/${list}.json`);
    const poolConfigResp = response.data;
    if (poolConfigResp.statusCode === 500) {
      return null;
    }
    return poolConfigResp;
  } catch (error) {
    return null;
  }
};
