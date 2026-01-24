import { TokenStandard, WarpCoreConfig } from '@hyperlane-xyz/sdk';

// A list of Warp Route token configs
// These configs will be merged with the warp routes in the configured registry
// The input here is typically the output of the Hyperlane CLI warp deploy command
export const warpRouteConfigs: WarpCoreConfig = {
  tokens: [{ 
    chainName: 'terraclassictestnet',
    standard: TokenStandard.CwHypCollateral,
    collateralAddressOrDenom: 'uluna',
    addressOrDenom: 'terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml',
    
    connections: [
      { token: 'ethereum|bsctestnet|0x2144be4477202ba2d50c9a8be3181241878cf7d8' },
       
    ],
   
    name: 'LUNC',
    symbol: 'LUNC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
  },
  { 
    chainName: 'terraclassictestnet',
    standard: TokenStandard.CwHypCollateral,
    collateralAddressOrDenom: 'uluna',
    addressOrDenom: 'terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml',
    
    connections: [
      { token: 'sealevel|solanatestnet|HNxN3ZSBtD5J2nNF4AATMhuvTWVeHQf18nTtzKtsnkyw' },
       
    ],
   
    name: 'LUNC',
    symbol: 'LUNC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
  },
  // 2. Configuração do token Sintético (o destino em BSC)
  {
    chainName: 'bsctestnet',
    standard: TokenStandard.EvmHypSynthetic,
    // Endereço do contrato do token sintético na BSC
    addressOrDenom: '0x2144be4477202ba2d50c9a8be3181241878cf7d8',
    name: 'wwwwLUNC',
    symbol: 'wwwwLUNC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
    connections: [
      { token: 'cosmos|terraclassictestnet|terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml' },
    ],

  },
  {
    chainName: 'solanatestnet',
    standard: TokenStandard.EvmHypSynthetic,
    // Endereço do contrato do token sintético na BSC
    addressOrDenom: 'HNxN3ZSBtD5J2nNF4AATMhuvTWVeHQf18nTtzKtsnkyw',
    name: 'wwwwLUNC',
    symbol: 'wwwwLUNC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/classic-terra/assets/60d34b97178cfdcd77fb87d7deeb7d3ab0ede6ee/icon/svg/LUNC.svg',
    connections: [
      { token: 'cosmos|terraclassictestnet|terra1zlm0h2xu6rhnjchn29hxnpvr74uxxqetar9y75zcehyx2mqezg9slj09ml' },
    ],

  }

 ],
  options: {
    interchainFeeConstants: [
      {
        origin: 'terraclassictestnet',
        destination: 'bsctestnet',
        amount: 1780832150, // Taxa interchain em microLUNA (uluna)
        addressOrDenom: 'uluna',
      },{
        origin: 'terraclassictestnet',
        destination: 'solanatestnet',
        amount: 1780832150, // Taxa interchain em microLUNA (uluna)
        addressOrDenom: 'uluna',
      },
    ],
    // Taxas locais constantes para evitar simulação problemática
    // O contrato precisa de 283215 uluna para o hook payment
    localFeeConstants: [
      {
        origin: 'terraclassictestnet',
        destination: 'bsctestnet',
        amount: 383215, // Taxa local em microLUNA (uluna) - valor exigido pelo contrato
      }, {
        origin: 'terraclassictestnet',
        destination: 'solanatestnet',
        amount: 383215, // Taxa local em microLUNA (uluna) - valor exigido pelo contrato
      },
    ],
  },
};

//HNxN3ZSBtD5J2nNF4AATMhuvTWVeHQf18nTtzKtsnkyw