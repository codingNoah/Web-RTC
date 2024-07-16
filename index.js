const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
app.use(cors());

const httpServer = app.listen(3003, () => {
  console.log("App running on port 3000");
});

const connectedSockets = [
  //username, socketId
];

const offers = [];

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5500",
    // origin: "http://127.0.0.1",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connection made...");

  connectedSockets.push({
    socketId: socket.id,
    username: socket.handshake.auth.username,
  });

  if (offers.length) {
    socket.emit("availableOffers", offers);
  }

  socket.on("sendIceCandidateToSignalingServer", (iceCandidateObj) => {
    const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;

    if (didIOffer) {
      const offerInOffers = offers.find(
        (o) => o.offererUserName === iceUserName
      );

      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate);

        if (offerInOffers.answererUserName) {
          const socketToSendTo = connectedSockets.find(
            (s) => s.userName === offerInOffers.answererUserName
          );

          if (socketToSendTo) {
            socket
              .to(socketToSendTo.socketId)
              .emit("receivedIceCandidateFromServer", iceCandidate);
          } else {
            console.log("Ice candidate recieved but could not find answerer");
          }
        }
      }
    } else {
      const offerInOffers = offers.find(
        (o) => o.answererUserName === iceUserName
      );

      if (offerInOffers) {
        const socketToSendTo = connectedSockets.find(
          (s) => s.userName === offerInOffers.offererUserName
        );
        if (socketToSendTo) {
          socket
            .to(socketToSendTo.socketId)
            .emit("receivedIceCandidateFromServer", iceCandidate);
        } else {
          console.log("Ice candidate recieved but could not find offerer");
        }
      }
    }
  });

  socket.on("newOffer", (newOffer) => {
    console.log("New Offer", socket.handshake.auth.username);
    const username = socket.handshake.auth.username;
    offers.push({
      offererUserName: socket.handshake.auth.username,
      offer: newOffer,
      offerIceCandidates: [],
      answererUserName: null,
      answer: null,
      answererIceCandidates: [],
    });

    socket.broadcast.emit("newOfferAwaiting", offers.slice(-1));
  });

  socket.on("newAnswer", (offerObj, ackFunction) => {
    console.log("---------------------------", "new answer");
    console.log(
      typeof offerObj.offererUserName,
      offerObj.offererUserName,
      typeof connectedSockets[0].username,
      typeof connectedSockets[1].username
    );
    console.log(connectedSockets);
    //emit this answer (offerObj) back to CLIENT1
    //in order to do that, we need CLIENT1's socketid
    const socketToAnswer = connectedSockets.find((s) => {
      //   console.log(s.username, s.socketId, s);

      return s.username == offerObj.offererUserName;
    });
    if (!socketToAnswer) {
      console.log("No matching socket");
      return;
    }
    //we found the matching socket, so we can emit to it!
    const socketIdToAnswer = socketToAnswer.socketId;
    //we find the offer to update so we can emit it
    const offerToUpdate = offers.find(
      (o) => o.offererUserName === offerObj.offererUserName
    );
    if (!offerToUpdate) {
      console.log("No OfferToUpdate");
      return;
    }
    //send back to the answerer all the iceCandidates we have already collected       noah 4372.441721548841
    ackFunction(offerToUpdate.offerIceCandidates);
    offerToUpdate.answer = offerObj.answer;
    offerToUpdate.answererUserName = socket.handshake.auth.username;
    //socket has a .to() which allows emiting to a "room"
    //every socket has it's own room
    socket.to(socketIdToAnswer).emit("answerResponse", offerToUpdate);
  });

  console.log(connectedSockets);
});
