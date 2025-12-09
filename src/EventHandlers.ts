/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Reflection,
  Reflection_Approval,
  Reflection_ApprovalForAll,
  Reflection_BatchMetadataUpdate,
  Reflection_Initialized,
  Reflection_MetadataUpdate,
  Reflection_OwnershipTransferred,
  Reflection_Paused,
  Reflection_Transfer,
  Reflection_TransferWithIPFS,
  Reflection_Unpaused,
} from "generated";
import pLimit from "p-limit";
const limit = pLimit(3);  // only 3 IPFS fetches at a time

import { extractIpfsHash } from "./ipfs";
import { safeFetch } from "./utils";

Reflection.Approval.handler(async ({ event, context }) => {
  const entity: Reflection_Approval = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    approved: event.params.approved,
    tokenId: event.params.tokenId,
  };

  context.Reflection_Approval.set(entity);
});

Reflection.ApprovalForAll.handler(async ({ event, context }) => {
  const entity: Reflection_ApprovalForAll = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    operator: event.params.operator,
    approved: event.params.approved,
  };

  context.Reflection_ApprovalForAll.set(entity);
});

Reflection.BatchMetadataUpdate.handler(async ({ event, context }) => {
  const entity: Reflection_BatchMetadataUpdate = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _fromTokenId: event.params._fromTokenId,
    _toTokenId: event.params._toTokenId,
  };

  context.Reflection_BatchMetadataUpdate.set(entity);
});

Reflection.Initialized.handler(async ({ event, context }) => {
  const entity: Reflection_Initialized = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    version: event.params.version,
  };

  context.Reflection_Initialized.set(entity);
});

Reflection.MetadataUpdate.handler(async ({ event, context }) => {
  const entity: Reflection_MetadataUpdate = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _tokenId: event.params._tokenId,
  };

  context.Reflection_MetadataUpdate.set(entity);
});

Reflection.OwnershipTransferred.handler(async ({ event, context }) => {
  const entity: Reflection_OwnershipTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };

  context.Reflection_OwnershipTransferred.set(entity);
});

Reflection.Paused.handler(async ({ event, context }) => {
  const entity: Reflection_Paused = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    account: event.params.account,
  };

  context.Reflection_Paused.set(entity);
});

Reflection.Transfer.handler(async ({ event, context }) => {
  const tokenId = event.params.tokenId.toString();
  const from = event.params.from.toLowerCase();
  const to = event.params.to.toLowerCase();
  const ZERO = "0x0000000000000000000000000000000000000000";
  const timestamp = BigInt(event.block.timestamp);

  const collectionId = `${event.chainId}:${event.srcAddress.toLowerCase()}`;
  let collection = await context.Collection.get(collectionId);

  // ------------------------------------------------------
  // ALWAYS INITIALIZE COLLECTION SAFELY
  // ------------------------------------------------------
  if (!collection) {
    collection = {
      id: collectionId,
      address: event.srcAddress.toLowerCase(),
      chainId: BigInt(event.chainId),

      // nullable string fields, can be undefined
      name: undefined,
      symbol: undefined,

      totalSupply: 0,
      activeSupply: 0,
      uniqueOwners: 0,
      itemCount: 0,

      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  // ------------------------------------------------------
  // TOKEN HANDLING
  // ------------------------------------------------------
  let token = await context.Token.get(tokenId);

  const isMint = from === ZERO && !token;
  const isBurn = to === ZERO;

  if (isMint) {
    token = {
      id: tokenId,
      owner: to,
      mintedAt: timestamp,
      burned: false,
      uri: undefined,
      metadata: undefined,
      image_url: undefined,
      name: undefined,
      description: undefined,
      collection_id: collectionId,
      txHash: event.transaction.hash.toLowerCase()

    };

    collection = {
      ...collection,
      totalSupply: collection.totalSupply + 1,
      activeSupply: collection.activeSupply + 1,
    };
  }

  if (token) {
    if (isBurn) {
      token = { ...token, burned: true };

      collection = {
        ...collection,
        activeSupply: collection.activeSupply - 1,
      };
    } else {
      token = { ...token, owner: to };
    }

    context.Token.set(token);
  }

  // ------------------------------------------------------
  // OWNER HANDLING
  // ------------------------------------------------------
  let fromOwner = await context.Owner.get(from) || { id: from, tokenCount: 0 };
  let toOwner = await context.Owner.get(to) || { id: to, tokenCount: 0 };

  // FROM owner
  if (!isMint && from !== ZERO) {
    const newCount = fromOwner.tokenCount - 1;

    if (newCount === 0) {
      collection = {
        ...collection,
        uniqueOwners: collection.uniqueOwners - 1,
      };
    }

    fromOwner = { ...fromOwner, tokenCount: newCount };
  }

  // TO owner
  if (!isBurn) {
    const firstOwned = toOwner.tokenCount === 0;

    toOwner = {
      ...toOwner,
      tokenCount: toOwner.tokenCount + 1,
    };

    if (firstOwned) {
      collection = {
        ...collection,
        uniqueOwners: collection.uniqueOwners + 1,
      };
    }
  }

  context.Owner.set(fromOwner);
  context.Owner.set(toOwner);

  // ------------------------------------------------------
  // UPDATE COLLECTION TIMESTAMP
  // ------------------------------------------------------
  collection = {
    ...collection,
    updatedAt: timestamp,
  };

  context.Collection.set(collection);

  // ------------------------------------------------------
  // LOG TRANSFER
  // ------------------------------------------------------
  context.TransferEvent.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from,
    to,
    tokenId: event.params.tokenId,
    timestamp,
  });
});



Reflection.TransferWithIPFS.handler(async ({ event, context }) => {
  const tokenId = event.params.tokenid.toString();
  const ipfsUri = event.params.ipfsHash;
  const ipHash= extractIpfsHash(ipfsUri)
  context.log.info(` ONLY HASHHHHHHHHHHHHHHHHHHH : , ${ipHash}, URIIIIIIIII  ${ipfsUri}`, {});

  let token = await context.Token.get(tokenId);
  if (!token) {
    token = {
      id: tokenId,
      owner: event.params.to.toLowerCase(),
      uri: "",
      metadata: "",
      mintedAt: BigInt(event.block.timestamp),
      burned: false,
      image_url: "",
      name: "",
      description: "",
      txHash: event.transaction.hash.toLowerCase(),
      collection_id: `${event.chainId}:${event.srcAddress.toLowerCase()}`,
    };
  }

  const uri = `https://nftstorage.link/ipfs/${ipHash}`
  
  let metadataRaw = "";
  let metadataJson: any = {};

  // Fetch metadata JSON from IPFS
  try {
    // LIMIT concurrency — prevents 429 errors
    metadataJson = await limit(() => safeFetch(uri));

    metadataRaw = JSON.stringify(metadataJson);

    context.log.info(`Fetched metadata OK`, {});
  } catch (err) {
    context.log.error(`Failed to fetch metadata: ${err}`);
  }
  const name = metadataJson.name || "";
  const description = metadataJson.description || "";

  // Save updated Token
  context.Token.set({
    id: token.id,
    owner: token.owner,
    uri: event.params.ipfsHash,
    metadata: metadataRaw,
    mintedAt: token.mintedAt,
    burned: token.burned,
    image_url: metadataJson.image || "",
    name,
    description,
    collection_id: token.collection_id,
    txHash: event.transaction.hash.toLowerCase(),
  });
});


Reflection.Unpaused.handler(async ({ event, context }) => {
  const entity: Reflection_Unpaused = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    account: event.params.account,
  };

  context.Reflection_Unpaused.set(entity);
});