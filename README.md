# TwoChain #

This repository is the implementation from our paper "TwoChain: Leveraging Blockchain and Smart Contract for Two Factor Authentication," which is published [here](https://ieeexplore.ieee.org/document/9315514).

## Installation ##

You need `nodejs` for this project.
So install them first if you do not have it yet on your machine.
You can download it [here](https://nodejs.org/en/download/).

```console
foo@ubuntu:~$ cd ~/
foo@ubuntu:~$ git clone https://github.com/mrkazawa/two-chain.git
foo@ubuntu:~$ cd ~/two-chain

foo@ubuntu:~$ npm install # install all dependencies
foo@ubuntu:~$ npm run-script # to show all available NPM commands
```

## Running ##

Our implementation consists of three parts: the blockchain, the web-app server, and the client-app.

### 1. Run the blockchain ###

For this project, we will use `ganache-cli` as our local network to simulate the Ethereum network.
Open a new terminal and run the following commands.

```console
foo@ubuntu:~$ cd ~/two-chain
foo@ubuntu:~$ npm eth-network
```

You will see the local network spawned in your machine.
You can access this network through `127.0.0.1:8545` address.

### 2. Run the web-app server ###

The web-app server will serve as our provider.
It is built using `express` web service and `sqlite` as its database.

For starters, we need to initiate our database.
Open a new terminal and run the following.

```console
foo@ubuntu:~$ cd ~/two-chain
foo@ubuntu:~$ npm run init-db

foo@ubuntu:~$ npm run delete-db # in case you want to delete it
```

Then, we will run our server.
In the same terminal window, run the following.

```console
foo@ubuntu:~$ cd ~/two-chain
foo@ubuntu:~$ npm run 2fa-server
```

You can then access the server using your browser through `http://127.0.0.1:3000/` address.
From that site, you can register a user.
After login, you can set up the 2FA on the Setting page.
You need to submit your Ethereum address. For that, we need to run our client-app.

### 3. Run the client-app ###

The client-app is a CLI-based application that can submit an address to the Ethereum blockchain and signs generated one-time-password (OTP) for the 2FA process.

To run our client, do the following.

```console
foo@ubuntu:~$ cd ~/two-chain
foo@ubuntu:~$ npm run 2fa-client
```

From there, you can choose the menu to begin the client operations.

## Authors ##

- **Yustus Oktian** - *Initial work*

## Acknowledgments ##

- Hat tip to anyone whose code was used
- Fellow researchers
- Korea Government for funding this project
