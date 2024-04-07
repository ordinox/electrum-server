const express = require("express");
const net = require("net");
const ecc = require("tiny-secp256k1");
const bitcoin = require("bitcoinjs-lib");

// Initialize ecc lib for bitcoinjs-lib
bitcoin.initEccLib(ecc);

// Define network configurations
const networks = {
  mainnet: bitcoin.networks.bitcoin,
  regtest: {
    messagePrefix: "\x18Bitcoin Signed Message:\n",
    bech32: "bcrt",
    bip32: {
      public: 0x043587cf,
      private: 0x04358394,
    },
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    wif: 0xef,
  },
};

const app = express();
const PORT = 6789; // HTTP server port

app.get("/getunspent", (req, res) => {
  const { address, network } = req.query;

  if (!networks[network]) {
    return res.status(400).send({ error: "Unsupported network" });
  }

  const script = bitcoin.address.toOutputScript(address, networks[network]);
  const hash = bitcoin.crypto.sha256(script);
  const reversedHash = Buffer.from(hash.reverse());

  const scripthash = reversedHash.toString("hex");
  const method = "blockchain.scripthash.listunspent";
  const requestData = JSON.stringify({
    id: 1,
    method: method,
    params: [scripthash],
  });

  // Replace these with your Electrum server details
  const HOST = "localhost";
  const PORT = 50001;

  const client = new net.Socket();
  client.connect(PORT, HOST, () => {
    console.log("Connected to Electrum server");
    client.write(requestData + "\n");
  });

  client.on("data", (data) => {
    console.log("Received: " + data);
    res.send(data.toString());
    client.destroy();
  });

  client.on("error", (err) => {
    console.error("Connection error: " + err.message);
    res.status(500).send({ error: "Connection error to Electrum server" });
  });

  client.on("close", () => {
    console.log("Connection closed");
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
