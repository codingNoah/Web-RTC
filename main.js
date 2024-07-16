let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const socket = io("http://localhost:3003", {
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("Connected to server");
  // Send a message to the server
  // socket.send("Hello, server!");
});

socket.emit("hey", "from noah");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

var localStream;
var remoteStream;
var connection;

const init = async () => {
  // Getting user media
  await getUserMedia();

  // Creating connection
  await createConnection();

  try {
    // console.log("Creating offer....");
    const offer = await connection.createOffer();

    // console.log("offer", offer);

    connection.setLocalDescription(offer);
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

const createConnection = async () => {
  try {
    connection = new RTCPeerConnection(peerConfiguration);

    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    localStream.getTracks().forEach((track) => {
      connection.addTrack(track, localStream);
    });

    connection.addEventListener("icecandidate", (e) => {
      console.log("ice candidates found....");
      console.log(e);
    });

    connection.addEventListener("track", (e) => {
      // console.log("Track added...");
      if (e.candidate) {
        console.log(e);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

init();

// console.log("running...");
