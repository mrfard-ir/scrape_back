// Libraries
const express = require('express');
const cors = require('cors');
// Functions
const { startScraping, stopScraping, updateStatus } = require('./scrape');

const app = express();
app.use(cors({
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
const PORT = process.env.PORT || 5000;

app.post("/scrape/update", (req, res) => {
    const { requestId } = req.body;
    updateStatus(res, requestId);
})

app.post("/scrape/stop", (req, res) => {
    const { requestId } = req.body;
    stopScraping(res, requestId);
})

app.post("/scrape/start", (req, res) => {
    const url = req.body.url;
    const keywords = req.body.keywords;
    const proxy = req.body.proxy;
    startScraping(res, url, keywords, proxy);
})

app.get("/", (req, res) => {
    res.send("View boost server is up and running...");
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})