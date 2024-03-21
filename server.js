// server.js
const express = require("express");
const http = require("http");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

// const secretKey = "akash"; // Replace with your secret key
// const users = []; // Temporary storage for registered users
const fileData = [];

app.use(express.json());
app.use(cors());

// Set up Multer for file uploads
const upload = multer({ dest: "uploads" });

// User registration endpoint
// app.post("/api/register", (req, res) => {
//   const { username, password } = req.body;
//   const hashedPassword = bcrypt.hashSync(password, 10);
//   users.push({ username, password: hashedPassword });
//   res.json({ message: "User registered successfully" });
// });

// // User login endpoint
// app.post("/api/login", (req, res) => {
//   const { username, password } = req.body;
//   const user = users.find((u) => u.username === username);
//   if (!user || !bcrypt.compareSync(password, user.password)) {
//     return res.status(401).json({ message: "Invalid credentials" });
//   }
//   const token = jwt.sign({ username }, secretKey, { expiresIn: "1h" });
//   res.json({ token });
// });

// File upload endpoint

// function parseExpiryDate(dateString) {
//   const [day, month, year, hour, min, sec] = dateString.split("/").map(Number);
//   // Month is zero-based in Date object, so we subtract 1 from month
//   return new Date(year, month - 1, day, hour, min, sec);
// }

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
setInterval(cleanupExpiredFiles, 1000); // 3600000 milliseconds = 1 hour

app.post("/api/upload", upload.single("file"), (req, res) => {
  const { password, particular, inputs, expiry } = req.body;
  // const fileContent = fs.readFileSync(req.file.path, "utf-8");
  console.log("expiry: ", expiry);

  const expiryTime = expiry ? Date.now() + parseInt(expiry) : null;

  console.log("expiryTime: ", expiryTime);

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
  });

  // Remove uploaded file
  // fs.unlinkSync(req.file.path);

  console.log("file uploaded successfully");
  res.json({ message: "File uploaded successfully" });
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
      res.json({ filePass: file.password });
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
