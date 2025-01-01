const express = require("express");
const redis = require("redis");
const path = require("path");


// Redis client setup
const client = redis.createClient({
  socket: {
    host: "localhost",
    port: 6379,
  },
});

client.connect().catch(console.error);

const app = express();
app.use(express.json());
app.use("/", express.static(path.join(__dirname, "frontend")));
// Get all jobs in the queue, sorted by priority
app.get('/tasks', (req, res) => {
    client.zRangeWithScores('taskQueue', 0, -1)
        .then(jobs => {
            if (jobs.length === 0) {
                return res.status(404).json({ message: 'No jobs in the queue' });
            }

            const parsedJobs = jobs.map(job => ({
                ...JSON.parse(job.value),
                priority: job.score,
            }));

            res.status(200).json({ tasks: parsedJobs });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// Add a new job to the queue with a priority
app.post('/tasks', (req, res) => {
    const { type, priority, data } = req.body;

    if (!type || typeof priority === 'undefined' || !data) {
        return res.status(400).json({ error: 'Job type, priority, and data are required' });
    }

    const jobId = `job-${Date.now()}`; // Unique Job ID
    const job = {
        id: jobId,
        type,
        priority,
        data,
        status: 'pending', // Initialize with "pending" status
        createdAt: new Date().toISOString(),
    };

    Promise.all([
        client.zAdd('taskQueue', { score: priority, value: JSON.stringify(job) }),
        client.hSet('jobStatus', jobId, JSON.stringify({ status: 'pending', job })),
    ])
        .then(() => {
            res.status(200).json({ message: 'Job added to queue', jobId });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// Process the highest-priority job
app.get('/tasks/process', (req, res) => {
    client.zPopMin('taskQueue')
        .then(job => {
            if (!job || job.length === 0) {
                return res.status(404).json({ message: 'No jobs in the queue' });
            }

            const jobData = job.value || job[0];
            const parsedJob = JSON.parse(jobData);

            return client.hSet('jobStatus', parsedJob.id, JSON.stringify({ status: 'processing', job: parsedJob }))
                .then(() => {
                    console.log(`Processing job: ${parsedJob.id}`);
                    if (Math.random() < 0.3) { // Simulate a 30% failure rate
                        throw new Error('Job failed');
                    }
                    return new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate 2s delay
                })
                .then(() => {
                    return client.hSet('jobStatus', parsedJob.id, JSON.stringify({ status: 'completed', job: parsedJob }));
                })
                .then(() => {
                    res.status(200).json({ message: 'Job processed', job: parsedJob });
                })
                .catch(err => {
                    client.hSet('jobStatus', parsedJob.id, JSON.stringify({ status: 'failed', job: parsedJob }))
                        .then(() => {
                            res.status(500).json({ message: `Job failed: ${err.message}`, job: parsedJob });
                        });
                });
        });
});

// Get the status of a specific job
app.get('/tasks/status/:jobId', (req, res) => {
    const { jobId } = req.params;

    client.hGet('jobStatus', jobId)
        .then(status => {
            if (!status) {
                return res.status(404).json({ message: 'Job not found' });
            }

            res.status(200).json(JSON.parse(status));
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// Start the server
app.listen(4040, () => {
    console.log("Listening on port 4040");
});
