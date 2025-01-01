const backendUrl = "http://localhost:4040";

// Add a new task
document.getElementById("add-task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("type").value;
    const priority = document.getElementById("priority").value;
    const data = document.getElementById("data").value;

    try {
        const response = await fetch(`${backendUrl}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type,
                priority: parseInt(priority, 10),
                data: JSON.parse(data),
            }),
        });

        const result = await response.json();
        alert(result.message || "Task added successfully");
        fetchTasks(); // Refresh the task list
    } catch (error) {
        alert("Error adding task: " + error.message);
    }
});

// Fetch and display tasks
async function fetchTasks() {
    try {
        const response = await fetch(`${backendUrl}/tasks`);
        const result = await response.json();

        const taskList = document.getElementById("tasks");
        taskList.innerHTML = ""; // Clear the list

        if (result.tasks) {
            result.tasks.forEach((task) => {
                const li = document.createElement("li");
                li.textContent = `ID: ${task.id}, Type: ${task.type}, Priority: ${task.priority}, Status: ${task.status}`;
                taskList.appendChild(li);
            });
        } else {
            taskList.innerHTML = "<li>No tasks found</li>";
        }
    } catch (error) {
        alert("Error fetching tasks: " + error.message);
    }
}

document.getElementById("refresh-tasks").addEventListener("click", fetchTasks);

// Process the next task
document.getElementById("process-task").addEventListener("click", async () => {
    try {
        const response = await fetch(`${backendUrl}/tasks/process`);
        const result = await response.json();
        const processResult = document.getElementById("process-result");

        if (result.message) {
            processResult.textContent = result.message;
        } else {
            processResult.textContent = "No tasks to process";
        }

        fetchTasks(); // Refresh the task list after processing
    } catch (error) {
        alert("Error processing task: " + error.message);
    }
});

// Check the status of a specific job
document.getElementById("check-status-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const jobId = document.getElementById("jobId").value;

    try {
        const response = await fetch(`${backendUrl}/tasks/status/${jobId}`);
        const result = await response.json();

        const statusResult = document.getElementById("status-result");
        if (response.status === 200) {
            statusResult.innerHTML = `
                <p><strong>Status:</strong> ${result.status}</p>
                <p><strong>Job ID:</strong> ${result.job.id}</p>
                <p><strong>Type:</strong> ${result.job.type}</p>
                <p><strong>Priority:</strong> ${result.job.priority}</p>
                <p><strong>Data:</strong> ${JSON.stringify(result.job.data)}</p>
                <p><strong>Created At:</strong> ${result.job.createdAt}</p>
            `;
        } else {
            statusResult.innerHTML = `<p>${result.message}</p>`;
        }
    } catch (error) {
        alert("Error checking job status: " + error.message);
    }
});

// Initial fetch of tasks
fetchTasks();
