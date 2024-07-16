let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const username = `noah_${Math.floor(Math.random() * 10000)}`;

document.querySelector("#user-name").innerHTML = username;

const socket = io("http://localhost:3003", {
  withCredentials: true,
  auth: {
    username,
  },
});

socket.on("connect", () => {
  console.log("Connected to server");
  // Send a message to the server
  // socket.send("Hello, server!");
});

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

var localStream;
var remoteStream;
var connection;
let didIOffer = false;

socket.on("receivedIceCandidateFromServer", (iceCandidate) => {
  connection.addIceCandidate(iceCandidate);
  console.log(
    "======Added Ice Candidate======",
    "receivedIceCandidateFromServer"
  );
});

socket.on("availableOffers", (offers) => {
  const answerEl = document.querySelector("#answer");
  offers.forEach((o) => {
    console.log(o);
    const newOfferEl = document.createElement("div");
    newOfferEl.innerHTML = `<button class="btn btn-success col-1">Answer ${o.offererUserName}</button>`;
    newOfferEl.addEventListener("click", () => answerOffer(o));
    answerEl.appendChild(newOfferEl);
  });

  console.log("======Added An Offer======", "availableOffers");
});

socket.on("newOfferAwaiting", (offers) => {
  const answerEl = document.querySelector("#answer");
  offers.forEach((o) => {
    console.log(o);
    const newOfferEl = document.createElement("div");
    newOfferEl.innerHTML = `<button class="btn btn-success col-1">Answer ${o.offererUserName}</button>`;
    newOfferEl.addEventListener("click", () => answerOffer(o));
    answerEl.appendChild(newOfferEl);
  });

  console.log("======Added A newOfferAwaiting======", "newOfferAwaiting");
});

socket.on("answerResponse", (offerObj) => {
  connection.setRemoteDescription(offerObj.answer);
  console.log(
    "======setRemoteDescription answerResponse======",
    "answerResponse"
  );
});

const call = async () => {
  // Getting user media
  await getUserMedia();

  // Creating connection
  await createConnection();

  try {
    // console.log("Creating offer....");
    const offer = await connection.createOffer();

    connection.setLocalDescription(offer);
    didIOffer = true;
    socket.emit("newOffer", offer); //send offer to signalingServer
  } catch (error) {
    console.log(error);
  }
};

const getUserMedia = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    // console.log(stream);

    localVideo.srcObject = stream;
    localStream = stream;
  } catch (error) {
    console.log(error);
  }
};

const createConnection = async (offerObj) => {
  try {
    connection = new RTCPeerConnection(peerConfiguration);

    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    localStream.getTracks().forEach((track) => {
      connection.addTrack(track, localStream);
    });

    connection.addEventListener("icecandidate", (e) => {
      console.log("ice candidates found....");
      if (e.candidate) {
        socket.emit("sendIceCandidateToSignalingServer", {
          iceCandidate: e.candidate,
          iceUserName: username,
          didIOffer,
        });
      }
    });

    connection.addEventListener("track", (e) => {
      console.log("Got a track from the other peer!! How excting");
      console.log(e);
      e.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track, remoteStream);
        console.log("Here's an exciting moment... fingers cross");
      });
    });

    if (offerObj) {
      await connection.setRemoteDescription(offerObj.offer);
    }
  } catch (error) {
    console.log(error);
  }
};

const answerOffer = async (offerObj) => {
  console.log(offerObj);
  await getUserMedia();
  await createConnection(offerObj);
  const answer = await connection.createAnswer({}); //just to make the docs happy
  await connection.setLocalDescription(answer); //this is CLIENT2, and CLIENT2 uses the answer as the localDesc
  console.log(offerObj);
  console.log(answer);
  // console.log(peerConnection.signalingState) //should be have-local-pranswer because CLIENT2 has set its local desc to it's answer (but it won't be)
  //add the answer to the offerObj so the server knows which offer this is related to
  offerObj.answer = answer;
  //emit the answer to the signaling server, so it can emit to CLIENT1
  //expect a response from the server with the already existing ICE candidates
  const offerIceCandidates = await socket.emitWithAck("newAnswer", offerObj);
  offerIceCandidates.forEach((c) => {
    connection.addIceCandidate(c);
    console.log("======Added Ice Candidate======");
  });
  console.log(offerIceCandidates);
  return;
};

document.querySelector("#call").addEventListener("click", call);

// console.log("running...");
