import { WarpCoreConfig } from '@hyperlane-xyz/sdk';

// A list of Warp Route token configs
// These configs will be merged with the warp routes in the configured registry
// The input here is typically the output of the Hyperlane CLI warp deploy command
export const warpRouteConfigs: WarpCoreConfig = {
  tokens: [],
  options: {}
//   tokens: [{ 
//     chainName: 'terraclassictestnet',
//     standard: TokenStandard.CwHypCollateral,
//     collateralAddressOrDenom: 'uluna',
//     addressOrDenom: 'terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml',
    
//     connections: [
//       { token: 'ethereum|bsctestnet|0x2144be4477202ba2d50c9a8be3181241878cf7d8' },
//       { token: 'ethereum|sepolia|0x224a4419D7FA69D3bEbAbce574c7c84B48D829b4' },
//       { token: 'sealevel|solanatestnet|HNxN3ZSBtD5J2nNF4AATMhuvTWVeHQf18nTtzKtsnkyw' }
       
//     ],
    
//     name: 'LUNC',
//     symbol: 'LUNC',
//     decimals: 6,
//     logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
//   },
  
//   // 2. Synthetic token configuration (the destination on BSC)
//   {
//     chainName: 'bsctestnet',
//     standard: TokenStandard.EvmHypSynthetic,
//     // Address of the synthetic token contract on BSC
//     addressOrDenom: '0x2144be4477202ba2d50c9a8be3181241878cf7d8',
//     name: 'Luna Classic',
//     symbol: 'wwwwLUNC',
//     decimals: 6,
//     logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
//     connections: [
//       { token: 'cosmos|terraclassictestnet|terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml' },
//     ],

//   },{
//     chainName: 'sepolia',
//     standard: TokenStandard.EvmHypSynthetic,
//     // Address of the synthetic token contract on BSC
//     addressOrDenom: '0x224a4419D7FA69D3bEbAbce574c7c84B48D829b4',
//     name: 'Luna Classic',
//     symbol: 'LUNC',
//     decimals: 6,
//     logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
//     connections: [
//       { token: 'cosmos|terraclassictestnet|terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml' },
//     ],

//   },
//   {
//     chainName: 'solanatestnet',
//     standard: TokenStandard.SealevelHypSynthetic,
//     // Mint address of the collateral token on Solana (Token-2022)
//     // Mint address: 3yhG9dDHVX6K1duf8znEcaJcuTiKSLYvfBD4xy6akxfu
//     addressOrDenom: 'HNxN3ZSBtD5J2nNF4AATMhuvTWVeHQf18nTtzKtsnkyw',
//     // Collateral: SOL (wrapped SOL) - valid base58 address for Solana
//     collateralAddressOrDenom: '3yhG9dDHVX6K1duf8znEcaJcuTiKSLYvfBD4xy6akxfu',
//     name: 'Luna Classic',
//     symbol: 'wwwwwLUNC',
//     decimals: 6,
//     logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
//     connections: [
//       { token: 'cosmos|terraclassictestnet|terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml' },
//     ],

//   }

//  ],
//   options: {
//     interchainFeeConstants: [
//       {
//         origin: 'terraclassictestnet',
//         destination: 'bsctestnet',
//         amount: 1780832150, // Interchain fee in microLUNA (uluna)
//         addressOrDenom: 'uluna',
//       },{
//         origin: 'terraclassictestnet',
//         destination: 'solanatestnet',
//         amount: 1780832150, // Interchain fee in microLUNA (uluna)
//         addressOrDenom: 'uluna',
//       },{
//         origin: 'terraclassictestnet',
//         destination: 'sepolia',
//         amount: 1780832150, // Interchain fee in microLUNA (uluna)
//         addressOrDenom: 'uluna',
//       }
//     ],
//     // Constant local fees to avoid problematic simulation
//     // The contract needs 283215 uluna for the hook payment
//     localFeeConstants: [
//       {
//         origin: 'terraclassictestnet',
//         destination: 'bsctestnet',
//         amount: 383215, // Local fee in microLUNA (uluna) - amount required by the contract
//       }, {
//         origin: 'terraclassictestnet',
//         destination: 'solanatestnet',
//         amount: 383215, // Local fee in microLUNA (uluna) - amount required by the contract
//       },{
//         origin: 'terraclassictestnet',
//         destination: 'sepolia',
//         amount: 383215, // Local fee in microLUNA (uluna) - amount required by the contract
//       }
//     ],
//   },
};

//HNxN3ZSBtD5J2nNF4AATMhuvTWVeHQf18nTtzKtsnkyw