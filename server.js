// server.js
const express = require("express");
const http = require("http");
// const socketIo = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

const fileData = [];
const users = [];

app.use(express.json());
app.use(cors());

// Set up Multer for file uploads
const upload = multer({ dest: "uploads" });

function cleanupExpiredFiles() {
  const currentTime = Date.now();
  fileData.forEach((item, index) => {
    if (item.expiryTime && currentTime > item.expiryTime) {
      fs.unlink(item.filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
          return;
        }
      });
      fileData.splice(index, 1);
      console.log(`deleted ${item.fileName}`);
      console.log(fileData);
    }
  });
}

// Periodic cleanup task (every hour, for example)
setInterval(cleanupExpiredFiles, 1000);

const checkUser = () => {
  users.forEach((e, i) => {
    e.here -= 1;
    if (e.here === -1) {
      fileData.forEach((item, index) => {
        if (item.userid === e.userid) {
          fs.unlink(item.filePath, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
              return;
            }
          });
          fileData.splice(index, 1);
          console.log(`deleted ${item.fileName}`);
          console.log(fileData)
        }
      });
      users.slice(i, 1);
      console.log("deleted user: ", e.userid);
    }
  });
};

// check if the user is still on
setInterval(checkUser, 30000);

app.post("/api/upload", upload.single("file"), (req, res) => {
  const { password, particular, inputs, expiry, userid } = req.body;
  // const fileContent = fs.readFileSync(req.file.path, "utf-8");
  console.log("expiry: ", expiry);

  const expiryTime = expiry ? Date.now() + parseInt(expiry) : null;

  console.log("userid: ", userid);

  const filePath = req.file.path;
  const fileName = req.file.originalname;

  // Store file data and password in the 2D array
  fileData.push({
    password,
    filePath,
    fileName,
    particular,
    inputs,
    expiryTime,
    userid,
  });

  // Remove uploaded file
  // fs.unlinkSync(req.file.path);

  console.log("file uploaded successfully");
  res.json({ message: "File uploaded successfully" });
});

//check the user
app.get("/id/:userid", (req, res) => {
  console.log("id came from: ", req.params.userid);
  let presence = false;
  users.forEach((item) => {
    if (item.userid === req.params.userid) {
      presence = true;
      item.here = 1;
    }
  });
  if (!presence) {
    let here = 1;
    let userid = req.params.userid;
    users.push({
      userid,
      here,
    });
  }
  res.send("ok");
});

// File download endpoint
app.post("/api/download", (req, res) => {
  const { password, IP } = req.body;
  try {
    const file = fileData.find((item) => item.password === password);

    // Verify password and send file data if correct
    if (file) {
      if (file.particular !== "") {
        if (file.particular !== IP) {
          console.log("wrong ip", file.particular, IP);
          res.json({ msg: "wrong ip" });
          return false;
        }
      }
      if (file.inputs) {
        let arr = file.inputs;
        console.log(arr);
        let resarr = arr.split(",");
        console.log(resarr);
        if (resarr.includes(IP)) {
          res.json({ msg: "restricted ip" });
          return false;
        }
      }
      res.json({ msg: "true" });
    } else {
      console.log("invalid password");
      res.json({ msg: "invalid password" });
    }
  } catch (e) {
    res.json({ msg: "something went wrong" });
  }
});
app.get("/file/:filePass", (req, res) => {
  let file;
  let filenam;
  fileData.forEach((item) => {
    if (item.password === req.params.filePass) {
      file = item.filePath;
      filenam = item.fileName;
    }
  });
  res.download(file, filenam);
});

// const io = socketIo(server, {
//   cors: {
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST"],
//   },
// });

// io.on("connection", (socket) => {
//   console.log("User connected");

//   socket.on("user_connected", (userData) => {
//     console.log("User connected: " + userData.userid);
//     // Perform actions when a user connects
//     // For example, you can save the user information in the database
//   });

//   socket.on("user_disconnected", (data, callback) => {
//     console.log("user disconnected: " + data);
//     // fileData.forEach((item, index) => {
//     //   if (item.userid === userData.userid) {
//     //     fs.unlink(item.filePath, (err) => {
//     //       if (err) {
//     //         console.error("Error deleting file:", err);
//     //         return;
//     //       }
//     //     });
//     //     fileData.splice(index, 1);
//     //     console.log(`deleted ${item.fileName}`);
//     //   }
//     // });
//     callback();
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnect");
//   });
// });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
