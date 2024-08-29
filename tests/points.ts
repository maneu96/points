import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Points } from "../target/types/points";
import { assert } from "chai";


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

  let seeds_alice = [alice.publicKey.toBytes()];
  let seeds_bob = [bob.publicKey.toBytes()];

  const [playerAlice, _bumpA] = anchor.web3.PublicKey.findProgramAddressSync(seeds_alice, program.programId);
  const [playerBob, _bumpB]  = anchor.web3.PublicKey.findProgramAddressSync(seeds_bob, program.programId);

  it("Airdrops Sol to bob and alice", async() =>{
    await airdropSol(alice.publicKey, 1e9);
    await airdropSol(bob.publicKey, 1e9);
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


  
});
