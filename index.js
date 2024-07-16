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
    const socketToAnswer = connectedSockets.find((s) => {
      return s.username == offerObj.offererUserName;
    });
    if (!socketToAnswer) {
      console.log("No matching socket");
      return;
    }

    const socketIdToAnswer = socketToAnswer.socketId;
    const offerToUpdate = offers.find(
      (o) => o.offererUserName === offerObj.offererUserName
    );
    if (!offerToUpdate) {
      console.log("No OfferToUpdate");
      return;
    }

    ackFunction(offerToUpdate.offerIceCandidates);
    offerToUpdate.answer = offerObj.answer;
    offerToUpdate.answererUserName = socket.handshake.auth.username;

    socket.to(socketIdToAnswer).emit("answerResponse", offerToUpdate);
  });

  console.log(connectedSockets);
});
