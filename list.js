const express = require("express");
const redis = require("redis");
const path = require("path");
const morgan = require("morgan");
const logger = require("./logger");
const client = require("prom-client");

// Redis client setup
const redisClient = redis.createClient({
    socket: {
        host: "localhost",
        port: 6379,
    },
});
redisClient.connect().catch(console.error);

const app = express();
app.use(express.json());
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));
app.use("/", express.static(path.join(__dirname, "frontend")));

// Prometheus metrics setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const jobProcessedCounter = new client.Counter({
    name: "jobs_processed_total",
    help: "Total number of jobs processed",
});
register.registerMetric(jobProcessedCounter);

const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Histogram of HTTP request durations in seconds",
    labelNames: ["method", "route", "status_code"],
});
register.registerMetric(httpRequestDuration);

app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on("finish", () => {
        end({ method: req.method, route: req.route?.path || req.url, status_code: res.statusCode });
    });
    next();
});

// API Endpoints
app.get("/tasks", (req, res) => {
    redisClient.zRangeWithScores("taskQueue", 0, -1)
        .then((jobs) => {
            if (jobs.length === 0) {
                return res.status(404).json({ message: "No jobs in the queue" });
            }
            const parsedJobs = jobs.map((job) => ({
                ...JSON.parse(job.value),
                priority: job.score,
            }));
            res.status(200).json({ tasks: parsedJobs });
        })
        .catch((err) => {
            logger.error(`Error fetching tasks: ${err.message}`);
            res.status(500).json({ error: err.message });
        });
});

app.post("/tasks", (req, res) => {
    const { type, priority, data } = req.body;

    if (!type || typeof priority === "undefined" || !data) {
        logger.warn("Task creation failed: Missing parameters");
        return res.status(400).json({ error: "Job type, priority, and data are required" });
    }

    const jobId = `job-${Date.now()}`;
    const job = { id: jobId, type, priority, data, status: "pending", createdAt: new Date().toISOString() };

    Promise.all([
        redisClient.zAdd("taskQueue", { score: priority, value: JSON.stringify(job) }),
        redisClient.hSet("jobStatus", jobId, JSON.stringify({ status: "pending", job })),
    ])
        .then(() => {
            logger.info(`Job added to queue: ${jobId}`);
            res.status(200).json({ message: "Job added to queue", jobId });
        })
        .catch((err) => {
            logger.error(`Error adding job to queue: ${err.message}`);
            res.status(500).json({ error: err.message });
        });
});

app.get("/tasks/process", (req, res) => {
    redisClient.zPopMin("taskQueue")
        .then((job) => {
            if (!job || job.length === 0) {
                return res.status(404).json({ message: "No jobs in the queue" });
            }
            const parsedJob = JSON.parse(job.value || job[0]);
            return redisClient.hSet("jobStatus", parsedJob.id, JSON.stringify({ status: "processing", job: parsedJob }))
                .then(() => {
                    jobProcessedCounter.inc();
                    logger.info(`Processing job: ${parsedJob.id}`);
                    return new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing
                })
                .then(() => {
                    return redisClient.hSet("jobStatus", parsedJob.id, JSON.stringify({ status: "completed", job: parsedJob }));
                })
                .then(() => {
                    res.status(200).json({ message: "Job processed", job: parsedJob });
                })
                .catch((err) => {
                    redisClient.hSet("jobStatus", parsedJob.id, JSON.stringify({ status: "failed", job: parsedJob }));
                    logger.error(`Job failed: ${err.message}`);
                    res.status(500).json({ message: `Job failed: ${err.message}`, job: parsedJob });
                });
        });
});

app.get("/tasks/status/:jobId", (req, res) => {
    redisClient.hGet("jobStatus", req.params.jobId)
        .then((status) => {
            if (!status) {
                return res.status(404).json({ message: "Job not found" });
            }
            res.status(200).json(JSON.parse(status));
        })
        .catch((err) => {
            logger.error(`Error fetching job status: ${err.message}`);
            res.status(500).json({ error: err.message });
        });
});

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", uptime: process.uptime(), timestamp: new Date() });
});

// Start server
app.listen(4040, () => {
    logger.info("Server started on port 4040");
});
