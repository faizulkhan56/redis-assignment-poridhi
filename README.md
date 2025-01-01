# Task Manager with Redis

## Overview
This project implements a task management system with a **Redis backend** and a web-based frontend. It allows users to:

- Add new tasks with priorities.
- View the list of tasks.
- Process tasks in order of priority.
- Track the status of specific tasks.

The system uses a **Redis sorted set** for task prioritization and a Redis hash for status tracking.

---

## Features

### Backend (Node.js + Redis):
- **Add Task**: Enqueue tasks with priorities and metadata.
- **View Tasks**: Fetch all tasks in the queue, sorted by priority.
- **Process Task**: Process the highest-priority task and update its status.
- **Check Task Status**: Query the status of a specific task (e.g., `pending`, `processing`, `completed`, or `failed`).

### Frontend (HTML, CSS, JavaScript):
- **Interactive Task Management**: Add tasks, view tasks, process tasks, and check task status.
- **User-Friendly Interface**: Simplistic and responsive web-based UI.

---

## Architecture
The project follows a **Producer-Consumer Model**:

1. **Frontend**:
   - Sends requests to the backend API.
   - Displays task data and statuses interactively.

2. **Backend**:
   - Handles API requests.
   - Manages the task queue and statuses using Redis.

3. **Redis**:
   - Stores tasks in a sorted set (`taskQueue`) with priorities.
   - Tracks task statuses (`jobStatus`) in a hash.

---

## Process Flow Diagram

### End-to-End Workflow
```plaintext
[Frontend (User Actions)]
   |
   |--- (POST /tasks) ---> [Backend (Add Task)]
   |                           |
   |                           |--- (ZADD + HSET) ---> [Redis (Store Task & Status)]
   |
   |--- (GET /tasks) ---> [Backend (View Tasks)]
   |                           |
   |                           |--- (ZRANGE) ---> [Redis (Fetch Tasks)]
   |
   |--- (GET /tasks/process) ---> [Backend (Process Task)]
   |                           |
   |                           |--- (ZPOPMIN + HSET) ---> [Redis (Update Status)]
   |
   |--- (GET /tasks/status/:jobId) ---> [Backend (Check Task Status)]
                                   |
                                   |--- (HGET) ---> [Redis (Fetch Status)]
```

---

## Installation and Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **Redis**

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo-url.git
   cd redis-cluster-job-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Redis:
   ```bash
   redis-server
   ```

4. Run the backend:
   ```bash
   node list.js
   ```

5. Open the frontend:
   Navigate to `http://localhost:4040` in your browser.

---

## API Endpoints

### 1. Add a Task
- **Endpoint**: `POST /tasks`
- **Request Body**:
  ```json
  {
      "type": "email",
      "priority": 1,
      "data": { "to": "user@example.com", "subject": "Welcome!" }
  }
  ```
- **Response**:
  ```json
  {
      "message": "Job added to queue",
      "jobId": "job-1678465624358"
  }
  ```

### 2. View All Tasks
- **Endpoint**: `GET /tasks`
- **Response**:
  ```json
  {
      "tasks": [
          {
              "id": "job-1678465624358",
              "type": "email",
              "priority": 1,
              "status": "pending",
              "createdAt": "2024-12-31T10:00:00.000Z"
          }
      ]
  }
  ```

### 3. Process a Task
- **Endpoint**: `GET /tasks/process`
- **Response (Success)**:
  ```json
  {
      "message": "Job processed",
      "job": {
          "id": "job-1678465624358",
          "type": "email",
          "priority": 1,
          "status": "completed",
          "createdAt": "2024-12-31T10:00:00.000Z"
      }
  }
  ```
- **Response (Failure)**:
  ```json
  {
      "message": "Job failed: Job failed",
      "job": {
          "id": "job-1678465624358",
          "type": "email",
          "priority": 1,
          "status": "failed",
          "createdAt": "2024-12-31T10:00:00.000Z"
      }
  }
  ```

### 4. Check Task Status
- **Endpoint**: `GET /tasks/status/:jobId`
- **Response**:
  ```json
  {
      "status": "completed",
      "job": {
          "id": "job-1678465624358",
          "type": "email",
          "priority": 1,
          "data": { "to": "user@example.com", "subject": "Welcome!" },
          "createdAt": "2024-12-31T10:00:00.000Z"
      }
  }
  ```

---

## Frontend Features
1. **Add Tasks**: A form to input task type, priority, and data.
2. **View Tasks**: Displays all tasks in the queue.
3. **Process Tasks**: Processes the highest-priority task.
4. **Check Job Status**: Query the status of a specific task.

---

## Project Structure
```plaintext
redis-cluster-job-system/
├── list.js                 # Backend code
├── frontend/               # Frontend folder
│   ├── index.html          # Main frontend page
│   ├── app.js              # Frontend JavaScript logic
│   └── style.css           # Frontend styles
├── package.json            # Node.js project metadata
└── README.md               # Project documentation
```

---

## Future Enhancements
- Add user authentication for task management.
- Enhance the dashboard with real-time updates using WebSockets.
- Support for delayed tasks.

---

## License
This project is licensed under the MIT License.
