import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Points } from "../target/types/points";
import { AssertionError, assert,expect } from "chai";


async function airdropSol(publicKey, amount) {
  let airdropTx = await anchor.getProvider().connection.requestAirdrop(publicKey, amount);
  await confirmTransaction(airdropTx);
}

async function confirmTransaction(tx){
  let latestBlockHash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx
  });
}

describe("points", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Points as Program<Points>;

  const bob = anchor.web3.Keypair.generate();
  const alice = anchor.web3.Keypair.generate();
  const mallory = anchor.web3.Keypair.generate();


  let seeds_alice = [alice.publicKey.toBytes()];
  let seeds_bob = [bob.publicKey.toBytes()];
  let seeds_mallory = [mallory.publicKey.toBytes()];

  const [playerAlice, _bumpA] = anchor.web3.PublicKey.findProgramAddressSync(seeds_alice, program.programId);
  const [playerBob, _bumpB]  = anchor.web3.PublicKey.findProgramAddressSync(seeds_bob, program.programId);
  const [playerMallory, _bumpM]  = anchor.web3.PublicKey.findProgramAddressSync(seeds_mallory, program.programId);

  it("Airdrops Sol to bob, alice and mallory", async() =>{
    await airdropSol(alice.publicKey, 1e9);
    await airdropSol(bob.publicKey, 1e9);
    await airdropSol(mallory.publicKey, 1e9);
  });

  it("Player accounts are initialized!", async () => {
    // Add your test here.
    
    const tx = await program.methods.initialize().accounts({
      player: playerAlice,
      signer: alice.publicKey,
    }).signers([alice])
    .rpc();


    await program.methods.initialize().accounts({
      player: playerBob,
      signer: bob.publicKey
    }).signers([bob])
    .rpc();

    await program.methods.initialize().accounts({
      player: playerMallory,
      signer: mallory.publicKey
    }).signers([mallory])
    .rpc();

  });

  it("Transfers points from alice to bob", async() =>{
    await program.methods.transferPoints(5)
    .accounts({
      from: playerAlice,
      to: playerBob,
      signer: alice.publicKey,
    }).signers([alice])
    .rpc();

    let points_A = (await program.account.player.fetch(playerAlice)).points;
    let points_B = (await program.account.player.fetch(playerBob)).points;
    assert(points_A == Number(5), "Alice does not have 5 points");
    assert(points_B == Number(15), "Bob does not have 15 points");
  });


  it("Does not let Mallory steal points from Bob", async()=>{
    try
    {  
      await program.methods.transferPoints(5).accounts({
        from: playerBob,
        to: playerMallory,
        signer: mallory.publicKey
      }).signers([mallory])
      .rpc();
    }
    catch(err){
      expect((err as anchor.AnchorError).error.errorMessage).to.equal("SignerIsNotAuthority")
    }

  });

  it("Does not let Bob transfer more money points than the ones he has", async() =>  {
    try
    {
      await program.methods.transferPoints(20).accounts({
        from: playerBob,
        to:playerAlice,
        signer: bob.publicKey
      }).signers([bob])
      .rpc();
    }
    catch(err){
      //console.log("Error is: " + err)
      expect((err as anchor.AnchorError).error.errorMessage).to.equal("InsufficientPoints")
    }
    
  })
 
  


  
});
