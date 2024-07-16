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
});

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

var localStream;
var remoteStream;
var connection;
let didIOffer = false;

socket.on("receivedIceCandidateFromServer", (iceCandidate) => {
  connection.addIceCandidate(iceCandidate);
});

socket.on("availableOffers", (offers) => {
  const answerEl = document.querySelector("#answer");
  offers.forEach((o) => {
    const newOfferEl = document.createElement("div");
    newOfferEl.innerHTML = `<button class="btn btn-success col-1">Answer ${o.offererUserName}</button>`;
    newOfferEl.addEventListener("click", () => answerOffer(o));
    answerEl.appendChild(newOfferEl);
  });
});

socket.on("newOfferAwaiting", (offers) => {
  const answerEl = document.querySelector("#answer");
  offers.forEach((o) => {
    const newOfferEl = document.createElement("div");
    newOfferEl.innerHTML = `<button class="btn btn-success col-1">Answer ${o.offererUserName}</button>`;
    newOfferEl.addEventListener("click", () => answerOffer(o));
    answerEl.appendChild(newOfferEl);
  });

  console.log("======Added A newOfferAwaiting======", "newOfferAwaiting");
});

socket.on("answerResponse", (offerObj) => {
  connection.setRemoteDescription(offerObj.answer);
});

const call = async () => {
  await getUserMedia();

  await createConnection();

  try {
    const offer = await connection.createOffer();

    connection.setLocalDescription(offer);
    didIOffer = true;
    socket.emit("newOffer", offer);
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
      if (e.candidate) {
        socket.emit("sendIceCandidateToSignalingServer", {
          iceCandidate: e.candidate,
          iceUserName: username,
          didIOffer,
        });
      }
    });

    connection.addEventListener("track", (e) => {
      e.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track, remoteStream);
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
  await getUserMedia();
  await createConnection(offerObj);
  const answer = await connection.createAnswer({});
  await connection.setLocalDescription(answer);

  offerObj.answer = answer;

  const offerIceCandidates = await socket.emitWithAck("newAnswer", offerObj);
  offerIceCandidates.forEach((c) => {
    connection.addIceCandidate(c);
  });
};

document.querySelector("#call").addEventListener("click", call);
